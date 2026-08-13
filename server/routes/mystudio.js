const express = require('express');
const router = express.Router();
const { requireManager, requireOwnLocation } = require('../middleware/auth');
const ms = require('../lib/mystudio');

// Experimental: read today's booked roster out of the studio management system
// so the check-in board starts populated.
//
// Read-only upstream. There is deliberately no route here that creates a
// check-in: accepting a suggestion goes through the existing POST /api/daily,
// which already owns the overdue-reuse rule, the enrollment check and the
// program constraint. A second write path would be a second place for those to
// drift.
//
// The stored cookie never appears in a response from this file.

function todayDate() {
  // Matches daily.js. All centers are in California, so Pacific keeps the board
  // from flipping at UTC midnight.
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

async function loadConnection(pool, locationId) {
  const { rows } = await pool.query(
    `SELECT c.id, c.location_id, c.company_id, c.company_name, c.session_cookie,
            c.status, c.last_verified_at, c.last_synced_at,
            u.display_name AS connected_by_name
       FROM mystudio_connections c
       LEFT JOIN users u ON u.id = c.connected_by
      WHERE c.location_id = $1`,
    [locationId]
  );
  return rows[0] || null;
}

// What the client is allowed to know about a connection.
function publicShape(conn) {
  if (!conn) return { connected: false };
  return {
    connected: true,
    status: conn.status,
    companyName: conn.company_name,
    companyId: conn.company_id,
    connectedByName: conn.connected_by_name || null,
    lastVerifiedAt: conn.last_verified_at,
    lastSyncedAt: conn.last_synced_at,
  };
}

async function markExpired(pool, id) {
  await pool.query(
    `UPDATE mystudio_connections SET status = 'expired' WHERE id = $1`,
    [id]
  );
}

// GET /api/mystudio/status
router.get('/status', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const conn = await loadConnection(pool, req.session.activeLocationId);
    res.json({ configured: ms.isConfigured(), ...publicShape(conn) });
  } catch (err) {
    console.error('Error reading MyStudio connection:', err.message);
    res.status(500).json({ error: 'Failed to read connection' });
  }
});

// POST /api/mystudio/connect  { cookie }
router.post('/connect', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');

  if (!ms.isConfigured()) {
    return res.status(503).json({
      error: 'MyStudio is not set up on the server yet. MYSTUDIO_ENC_KEY is missing.',
    });
  }

  const cookie = ms.sanitizeCookie(req.body && req.body.cookie);
  if (!cookie || cookie.length > 8000) {
    return res.status(400).json({ error: 'Paste the MyStudio cookie to connect.' });
  }

  let session;
  try {
    session = await ms.verifySession(cookie);
  } catch (err) {
    if (err instanceof ms.MyStudioAuthError) {
      return res.status(400).json({
        error: 'That cookie did not work. Sign in to MyStudio, copy it again, then retry.',
      });
    }
    console.error('MyStudio connect failed:', err.message);
    return res.status(502).json({ error: 'Could not reach MyStudio. Try again shortly.' });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO mystudio_connections
         (location_id, connected_by, company_id, company_name, session_cookie,
          status, last_verified_at)
       VALUES ($1, $2, $3, $4, $5, 'connected', now())
       ON CONFLICT (location_id) DO UPDATE SET
         connected_by = EXCLUDED.connected_by,
         company_id = EXCLUDED.company_id,
         company_name = EXCLUDED.company_name,
         session_cookie = EXCLUDED.session_cookie,
         status = 'connected',
         last_verified_at = now()
       RETURNING id, location_id, company_id, company_name, status,
                 last_verified_at, last_synced_at`,
      [
        req.session.activeLocationId,
        req.session.userId,
        session.companyId,
        session.companyName,
        ms.encryptCookie(cookie),
      ]
    );
    res.status(201).json({ configured: true, ...publicShape(rows[0]) });
  } catch (err) {
    console.error('Error saving MyStudio connection:', err.message);
    res.status(500).json({ error: 'Failed to save connection' });
  }
});

// DELETE /api/mystudio/connect
router.delete('/connect', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    await pool.query('DELETE FROM mystudio_connections WHERE location_id = $1', [
      req.session.activeLocationId,
    ]);
    res.json({ configured: ms.isConfigured(), connected: false });
  } catch (err) {
    console.error('Error removing MyStudio connection:', err.message);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// GET /api/mystudio/today?date=YYYY-MM-DD
//
// Returns who is booked upstream, already matched against this center's roster
// and against today's board, so the client only has to render and post.
router.get('/today', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  const locationId = req.session.activeLocationId;

  const date = req.query.date || todayDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ error: 'Invalid date' });
  }

  try {
    const conn = await loadConnection(pool, locationId);
    // Not connected is a normal state, not a failure. Centers that never
    // connect should see nothing rather than an error.
    if (!conn) return res.json({ connected: false, expected: [] });
    if (!ms.isConfigured()) {
      return res.json({ connected: true, configured: false, expected: [] });
    }

    let pulled;
    try {
      pulled = await ms.getExpectedForDate(
        ms.decryptCookie(conn.session_cookie),
        conn.company_id,
        date
      );
    } catch (err) {
      if (err instanceof ms.MyStudioAuthError) {
        await markExpired(pool, conn.id);
        return res.json({ connected: true, status: 'expired', expected: [] });
      }
      console.error('MyStudio pull failed:', err.message);
      return res.status(502).json({ error: 'Could not reach MyStudio. Try again shortly.' });
    }

    // One pass over this center's active roster, rather than a query per kid.
    const { rows: students } = await pool.query(
      `SELECT id, full_name, mystudio_participant_id
         FROM students
        WHERE location_id = $1 AND active = true`,
      [locationId]
    );

    const byParticipantId = new Map();
    const byName = new Map();
    for (const s of students) {
      if (s.mystudio_participant_id) {
        byParticipantId.set(String(s.mystudio_participant_id), s);
      }
      const key = String(s.full_name || '').trim().toLowerCase();
      if (!key) continue;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(s);
    }

    const studentIds = students.map((s) => s.id);

    // Programs each ninja is actually enrolled in. POST /api/daily rejects a
    // check-in for a program the ninja is not enrolled in, so a program the
    // roster claims but DojoLink does not know about is downgraded to a generic
    // check-in instead of being sent and failing.
    const enrolled = new Map();
    // Ninjas already on today's board, so a suggestion is never a duplicate.
    const onBoard = new Set();
    if (studentIds.length) {
      const [{ rows: programRows }, { rows: boardRows }] = await Promise.all([
        pool.query(
          'SELECT student_id, program FROM student_programs WHERE student_id = ANY($1::int[])',
          [studentIds]
        ),
        pool.query(
          `SELECT DISTINCT student_id FROM daily_assignments
            WHERE session_date = $1 AND student_id = ANY($2::int[])`,
          [date, studentIds]
        ),
      ]);
      for (const r of programRows) {
        if (!enrolled.has(r.student_id)) enrolled.set(r.student_id, new Set());
        enrolled.get(r.student_id).add(r.program);
      }
      for (const r of boardRows) onBoard.add(r.student_id);
    }

    const expected = pulled.expected.map((row) => {
      let student = byParticipantId.get(row.participantId) || null;
      let matchStatus = student ? 'linked' : null;

      if (!student) {
        const candidates = byName.get(row.fullName.toLowerCase()) || [];
        if (candidates.length === 1) {
          student = candidates[0];
          matchStatus = 'name';
        } else if (candidates.length > 1) {
          matchStatus = 'ambiguous';
        } else {
          matchStatus = 'unknown';
        }
      }

      const program =
        student && row.program && enrolled.get(student.id)?.has(row.program)
          ? row.program
          : null;

      return {
        participantId: row.participantId,
        fullName: row.fullName,
        rankName: row.rankName,
        className: row.className,
        startTime: row.startTime,
        checkedInUpstream: row.checkedInUpstream,
        match: matchStatus,
        studentId: student ? student.id : null,
        studentName: student ? student.full_name : null,
        program,
        alreadyOnBoard: student ? onBoard.has(student.id) : false,
      };
    });

    await pool.query(
      `UPDATE mystudio_connections
          SET last_synced_at = now(), last_verified_at = now(), status = 'connected'
        WHERE id = $1`,
      [conn.id]
    );

    res.json({
      connected: true,
      configured: true,
      status: 'connected',
      companyName: conn.company_name,
      date: pulled.date,
      classCount: pulled.classCount,
      bookedClassCount: pulled.bookedClassCount,
      expected,
    });
  } catch (err) {
    console.error('Error building MyStudio roster:', err.message);
    res.status(500).json({ error: 'Failed to load the MyStudio roster' });
  }
});

// POST /api/mystudio/link  { participant_id, student_id }
//
// Promotes an accepted name match to a durable id so later pulls stop guessing.
router.post('/link', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const participantId = String((req.body && req.body.participant_id) || '').trim();
  const studentId = Number(req.body && req.body.student_id);

  if (!participantId || participantId.length > 64 || !Number.isInteger(studentId)) {
    return res.status(400).json({ error: 'participant_id and student_id are required' });
  }

  try {
    const { rowCount } = await pool.query(
      `UPDATE students SET mystudio_participant_id = $1
        WHERE id = $2 AND location_id = $3 AND active = true`,
      [participantId, studentId, req.session.activeLocationId]
    );
    if (!rowCount) return res.status(404).json({ error: 'Ninja not found at this location' });
    res.json({ linked: true });
  } catch (err) {
    console.error('Error linking MyStudio participant:', err.message);
    res.status(500).json({ error: 'Failed to link ninja' });
  }
});

module.exports = router;
