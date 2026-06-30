const express = require('express');
const router = express.Router();
const { requireAuth, requireManager, requireSensei, requireOwnLocation } = require('../middleware/auth');

function todayDate() {
  // All locations are in California — use Pacific time so the board doesn't flip at midnight UTC
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
}

const ASSIGNMENT_SELECT = `
  SELECT
    da.id,
    da.student_id,
    da.sensei_id,
    da.session_date,
    da.completed,
    da.program,
    s.full_name as student_name,
    s.birthday,
    s.pinned_note,
    sp.belt_level,
    sp.belt_sublevel,
    sp.current_project,
    sp.project_status,
    u.display_name as sensei_name,
    (SELECT COUNT(*) FROM daily_assignments da2
     WHERE da2.student_id = da.student_id
       AND da2.session_date = da.session_date
       AND da2.created_at <= da.created_at) AS session_number
  FROM daily_assignments da
  JOIN students s ON da.student_id = s.id
  LEFT JOIN student_programs sp ON sp.student_id = da.student_id AND sp.program = da.program
  LEFT JOIN users u ON da.sensei_id = u.id
`;

// GET /api/daily?date=YYYY-MM-DD
// When fetching today's board, also includes incomplete assignments from past days.
router.get('/', requireAuth, async (req, res) => {
  const pool = req.app.get('db');
  const date = req.query.date || todayDate();
  const isToday = date === todayDate();

  try {
    const query = isToday
      ? ASSIGNMENT_SELECT + ' WHERE (da.session_date = $1 OR (da.session_date < $1 AND da.completed = false)) AND s.location_id = $2 ORDER BY da.session_date ASC, da.created_at ASC'
      : ASSIGNMENT_SELECT + ' WHERE da.session_date = $1 AND s.location_id = $2 ORDER BY da.created_at ASC';
    const { rows } = await pool.query(query, [date, req.session.activeLocationId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching daily assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /api/daily/my — logged-in sensei's assignments for today
router.get('/my', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  const date = req.query.date || todayDate();
  const senseiId = req.session.userId;

  try {
    const { rows } = await pool.query(
      ASSIGNMENT_SELECT + ' WHERE da.session_date = $1 AND da.sensei_id = $2 AND s.location_id = $3 ORDER BY da.created_at ASC',
      [date, senseiId, req.session.activeLocationId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching sensei assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// POST /api/daily
router.post('/', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { student_id, program, session_date } = req.body;

  if (!student_id || !program) {
    return res.status(400).json({ error: 'student_id and program are required' });
  }

  // session_date (when provided) must be a real calendar date — not the future,
  // not absurdly old. It lands in daily_assignments and flows into progress_logs.
  if (session_date != null) {
    const validFormat = /^\d{4}-\d{2}-\d{2}$/.test(session_date) && !Number.isNaN(Date.parse(session_date));
    if (!validFormat || session_date > todayDate() || session_date < '2020-01-01') {
      return res.status(400).json({ error: 'Invalid session date' });
    }
  }

  const date = session_date || todayDate();

  try {
    const { rows: enrollmentRows } = await pool.query(
      `SELECT sp.id FROM student_programs sp
       JOIN students s ON sp.student_id = s.id
       WHERE sp.student_id = $1 AND sp.program = $2 AND s.active = true AND s.location_id = $3`,
      [student_id, program, req.session.activeLocationId]
    );
    if (!enrollmentRows[0]) return res.status(404).json({ error: 'Ninja not enrolled in this program' });

    // If the ninja already has an OVERDUE (past-date) unlogged session for this
    // program, reuse it and move it to today instead of stacking a duplicate —
    // checking them in shouldn't pile an extra session onto the overdue. A same-
    // day incomplete is left alone so a second check-in today creates a second
    // loggable session.
    const { rows: existing } = await pool.query(
      `SELECT id FROM daily_assignments
       WHERE student_id = $1 AND program = $2 AND completed = false AND session_date < $3
       ORDER BY session_date ASC LIMIT 1`,
      [student_id, program, date]
    );

    let assignmentId;
    if (existing[0]) {
      await pool.query('UPDATE daily_assignments SET session_date = $1 WHERE id = $2', [date, existing[0].id]);
      assignmentId = existing[0].id;
    } else {
      const { rows: inserted } = await pool.query(
        'INSERT INTO daily_assignments (student_id, program, session_date) VALUES ($1, $2, $3) RETURNING id',
        [student_id, program, date]
      );
      assignmentId = inserted[0].id;
    }

    const { rows } = await pool.query(
      ASSIGNMENT_SELECT + ' WHERE da.id = $1',
      [assignmentId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error adding assignment:', err);
    res.status(500).json({ error: 'Failed to add assignment' });
  }
});

// POST /api/daily/match-attendance — match a pasted attendance list (Live-Ninjas
// style "First L" names) to active ninjas at this location. Read-only: returns
// candidate matches + each candidate's programs so the client can preview before
// any check-in. Never writes.
router.post('/match-attendance', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { names } = req.body;

  if (!Array.isArray(names) || names.length === 0) {
    return res.status(400).json({ error: 'No names provided' });
  }
  if (names.length > 200) {
    return res.status(400).json({ error: 'Too many names (max 200)' });
  }

  try {
    const { rows: roster } = await pool.query(
      `SELECT s.id, s.full_name,
        COALESCE((
          SELECT json_agg(json_build_object(
            'program', sp.program,
            'belt_level', sp.belt_level,
            'belt_sublevel', sp.belt_sublevel
          ) ORDER BY sp.program)
          FROM student_programs sp WHERE sp.student_id = s.id
        ), '[]') AS programs
       FROM students s
       WHERE s.location_id = $1 AND s.active = true`,
      [req.session.activeLocationId]
    );

    // Ninjas already checked in AND finished (logged) today — these should be
    // skipped on import so a completed session isn't re-added.
    const { rows: doneRows } = await pool.query(
      `SELECT da.student_id, da.program FROM daily_assignments da
       JOIN students s ON da.student_id = s.id
       WHERE s.location_id = $1 AND da.session_date = $2 AND da.completed = true`,
      [req.session.activeLocationId, todayDate()]
    );
    const doneSet = new Set(doneRows.map((r) => `${r.student_id}::${r.program}`));

    const norm = (x) => String(x || '').trim().toLowerCase();

    const results = names
      .map((raw) => String(raw))
      .filter((raw) => raw.trim())
      .map((raw) => {
        // Strip a trailing " - 16:04" time stamp the board appends, collapse space.
        const cleaned = raw.split(' - ')[0].trim().replace(/\s+/g, ' ');
        const tokens = cleaned.split(' ').filter(Boolean);
        const first = tokens[0] || '';
        const last = tokens.length > 1 ? tokens[tokens.length - 1] : '';

        const candidates = roster.filter((s) => {
          const parts = s.full_name.trim().split(/\s+/);
          const sFirst = parts[0] || '';
          const sLast = parts.length > 1 ? parts[parts.length - 1] : '';
          if (norm(sFirst) !== norm(first)) return false;
          if (!last) return true;
          // Board last names are usually a single initial; match by prefix.
          if (last.length === 1) return norm(sLast).startsWith(norm(last));
          return norm(sLast) === norm(last) || norm(sLast).startsWith(norm(last));
        }).map((s) => ({
          id: s.id,
          full_name: s.full_name,
          programs: s.programs,
          // Programs this ninja already finished (logged) today → skip on import.
          done_programs: (s.programs || [])
            .map((p) => p.program)
            .filter((prog) => doneSet.has(`${s.id}::${prog}`)),
        }));

        return { raw: cleaned, first, last, candidates };
      });

    res.json({ results });
  } catch (err) {
    console.error('Error matching attendance:', err);
    res.status(500).json({ error: 'Failed to match attendance' });
  }
});

// PATCH /api/daily/:id/assign
router.patch('/:id/assign', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  const { sensei_id } = req.body;

  try {
    const { rows: existing } = await pool.query(`
      SELECT da.id FROM daily_assignments da
      JOIN students s ON da.student_id = s.id
      WHERE da.id = $1 AND s.location_id = $2
    `, [id, req.session.activeLocationId]);
    if (!existing[0]) return res.status(404).json({ error: 'Assignment not found' });

    if (sensei_id) {
      const { rows: senseiCheck } = await pool.query(
        'SELECT id FROM users WHERE id = $1 AND location_id = $2 AND active = true',
        [sensei_id, req.session.activeLocationId]
      );
      if (!senseiCheck[0]) return res.status(400).json({ error: 'Sensei not found at this location' });
    }

    await pool.query(
      'UPDATE daily_assignments SET sensei_id = $1 WHERE id = $2',
      [sensei_id || null, id]
    );

    const { rows } = await pool.query(ASSIGNMENT_SELECT + ' WHERE da.id = $1', [id]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error assigning sensei:', err);
    res.status(500).json({ error: 'Failed to assign sensei' });
  }
});

// DELETE /api/daily/:id
router.delete('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;

  try {
    const { rows } = await pool.query(`
      SELECT da.id FROM daily_assignments da
      JOIN students s ON da.student_id = s.id
      WHERE da.id = $1 AND s.location_id = $2
    `, [id, req.session.activeLocationId]);
    if (!rows[0]) return res.status(404).json({ error: 'Assignment not found' });

    await pool.query('DELETE FROM daily_assignments WHERE id = $1', [id]);
    res.json({ message: 'Assignment removed' });
  } catch (err) {
    console.error('Error removing assignment:', err);
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
});

module.exports = router;
