const express = require('express');
const router = express.Router();
const { requireManager, requireSensei, requireOwnLocation } = require('../middleware/auth');
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
            c.login_email, c.login_secret, c.login_saved_at,
            u.display_name AS connected_by_name
       FROM mystudio_connections c
       LEFT JOIN users u ON u.id = c.connected_by
      WHERE c.location_id = $1`,
    [locationId]
  );
  return rows[0] || null;
}

// What the client is allowed to know about a connection.
//
// login_secret is absent by construction rather than by deletion: nothing that
// leaves this file is built from the row wholesale, so a column added later
// cannot leak by being forgotten here.
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
    loginEmail: conn.login_email || null,
    hasSavedPassword: Boolean(conn.login_secret),
  };
}

const SAVE_RETURNING = `RETURNING id, location_id, company_id, company_name, status,
                 last_verified_at, last_synced_at, login_email, login_secret`;

// One place that writes a connection, used by both ways of making one.
//
// `login` is only present when the credential came from a sign-in here. Passing
// it null leaves any saved password untouched, so reconnecting with a pasted
// cookie does not silently forget the password that makes renewals quick.
async function saveConnection(pool, { locationId, userId, companyId, companyName, cookie, login }) {
  const { rows } = await pool.query(
    `INSERT INTO mystudio_connections
       (location_id, connected_by, company_id, company_name, session_cookie,
        status, last_verified_at, login_email, login_secret, login_saved_at)
     VALUES ($1, $2, $3, $4, $5, 'connected', now(), $6, $7,
             CASE WHEN $7::text IS NULL THEN NULL ELSE now() END)
     ON CONFLICT (location_id) DO UPDATE SET
       connected_by = EXCLUDED.connected_by,
       company_id = EXCLUDED.company_id,
       company_name = EXCLUDED.company_name,
       session_cookie = EXCLUDED.session_cookie,
       status = 'connected',
       last_verified_at = now(),
       login_email = COALESCE(EXCLUDED.login_email, mystudio_connections.login_email),
       login_secret = COALESCE(EXCLUDED.login_secret, mystudio_connections.login_secret),
       login_saved_at = CASE
         WHEN EXCLUDED.login_secret IS NULL THEN mystudio_connections.login_saved_at
         ELSE now()
       END
     ${SAVE_RETURNING}`,
    [
      locationId,
      userId,
      companyId,
      companyName,
      ms.encryptCookie(cookie),
      login ? login.email : null,
      login ? ms.encryptCookie(login.password) : null,
    ]
  );
  return rows[0];
}

// Whatever was typed, else the sign-in already in flight, else what was saved.
// This is what makes a renewal six digits instead of a form.
//
// The pending entry has to come before the saved password: during a first
// connect there is no saved password at all, and it is the only thing that
// remembers what was typed before the person left to fetch their code.
function loginCredentials(conn, body, pending) {
  const typedEmail = String((body && body.email) || '').trim();
  const typedPassword = String((body && body.password) || '');

  const email =
    typedEmail || (pending && pending.email) || (conn && conn.login_email) || '';

  let password = typedPassword;
  if (!password && pending) password = ms.decryptCookie(pending.secret);
  if (!password && conn && conn.login_secret) password = ms.decryptCookie(conn.login_secret);

  return { email, password };
}

// Sign-in failures are told apart so the UI can react differently: a wrong
// password is the person's to fix, a changed login page is ours.
function sendLoginError(res, err, context) {
  if (err instanceof ms.MyStudioSignInUnavailable) {
    console.error(`MyStudio ${context} unavailable:`, err.message);
    return res.status(503).json({ error: err.message, signInUnavailable: true });
  }
  if (err instanceof ms.MyStudioAuthError) {
    // Logged as well as returned. A 400 in a browser console says nothing about
    // which of these went wrong, and the body is the only place the answer was.
    console.error(`MyStudio ${context} rejected:`, err.message);
    return res.status(400).json({ error: err.message });
  }
  // Never the body: an upstream error can quote back what was sent to it, and
  // what was sent to it here is a password.
  console.error(`MyStudio ${context} failed:`, err.message);
  return res.status(502).json({ error: 'Could not reach MyStudio. Try again shortly.' });
}

// The upstream pull, briefly remembered.
//
// One pull is a request per booked class, so the cost is not in serving the
// board, it is in asking MyStudio. Two directors with the board open, or one
// person switching tabs, should not multiply that. Sixty seconds is short enough
// that a sign-up shows up while somebody is still standing at the desk, and long
// enough that the fan-out happens once no matter how many people are watching.
//
// Only the upstream half is cached. Roster matching and the "already on the
// board" check are redone every time, because those change the moment a sensei
// checks a ninja in and must never be stale.
//
// Per lambda instance, which is the right amount of reliable for a cache whose
// worst failure is doing the work it would have done anyway.
const PULL_TTL_MS = 60 * 1000;
const pullCache = new Map();

function cachedPull(locationId, date) {
  const hit = pullCache.get(`${locationId}:${date}`);
  return hit && hit.expiresAt > Date.now() ? hit.pulled : null;
}

function rememberPull(locationId, date, pulled) {
  pullCache.set(`${locationId}:${date}`, { pulled, expiresAt: Date.now() + PULL_TTL_MS });
  // The map is keyed by location and date, so it is bounded by the number of
  // centers times the days anyone looked at, but a long-lived instance should
  // not accumulate yesterday forever.
  for (const [key, value] of pullCache) {
    if (value.expiresAt <= Date.now()) pullCache.delete(key);
  }
}

function forgetPull(locationId) {
  for (const key of pullCache.keys()) {
    if (key.startsWith(`${locationId}:`)) pullCache.delete(key);
  }
}

async function markExpired(pool, id) {
  await pool.query(
    `UPDATE mystudio_connections SET status = 'expired' WHERE id = $1`,
    [id]
  );
}

// A sign-in waiting on its emailed code.
//
// This has to outlive the panel. The code arrives by email, so the flow demands
// the one thing that used to destroy it: leaving the page. The panel closes on
// an outside click, closing reset the step back to the form, and the first
// person to try it came back holding a code with nowhere to type it.
//
// So the half-finished sign-in lives in the DojoLink session instead of in
// component state, and survives closing the panel, navigating away and
// reloading. It is server side (the session table), the password inside it is
// encrypted with the same key as everything else rather than sitting in session
// JSON as plaintext, and it is thrown away the moment it is used.
const PENDING_TTL_MS = 15 * 60 * 1000;

// `cookie` is what MyStudio handed back when it sent the code. The exchange that
// follows completes the sign-in that call started, and fails without it.
function setPending(req, { email, password, cookie = '' }) {
  req.session.mystudioPending = {
    email,
    secret: ms.encryptCookie(password),
    cookie,
    locationId: req.session.activeLocationId,
    expiresAt: Date.now() + PENDING_TTL_MS,
  };
}

// Only for the center it was started for: switching centers mid-flow should not
// aim a half-finished sign-in at a different studio.
function readPending(req) {
  const pending = req.session.mystudioPending;
  if (!pending) return null;
  if (pending.locationId !== req.session.activeLocationId) return null;
  if (!pending.expiresAt || pending.expiresAt < Date.now()) return null;
  return pending;
}

function clearPending(req) {
  delete req.session.mystudioPending;
}

// GET /api/mystudio/status
router.get('/status', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const conn = await loadConnection(pool, req.session.activeLocationId);
    const pending = readPending(req);
    res.json({
      configured: ms.isConfigured(),
      ...publicShape(conn),
      // Lets the panel reopen on the code step rather than back at the form.
      awaitingCode: Boolean(pending),
      awaitingCodeEmail: pending ? pending.email : null,
    });
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

  // The paste may be a whole cURL command, so pull the cookie out before it is
  // stored: what goes in the column has to be a usable cookie header. The limit
  // is checked after extraction for the same reason, since a cURL command is
  // much longer than the cookie inside it.
  const cookie = ms.extractCookie(req.body && req.body.cookie);
  if (!cookie || cookie.length > 8000) {
    return res.status(400).json({ error: 'Paste the MyStudio cookie to connect.' });
  }

  let session;
  try {
    session = await ms.verifySession(cookie);
  } catch (err) {
    if (err instanceof ms.MyStudioAuthError) {
      // Pass the message through. Every MyStudioAuthError message is written
      // here for the person connecting, and the useful ones say which mistake
      // was made: a request copied from the embedded chat widget rather than
      // from MyStudio, a cookie with no companyId, a paste missing the httpOnly
      // tokens. Replacing all of that with "that cookie did not work" was the
      // difference between a fixable problem and a dead end.
      return res.status(400).json({
        error: err.message || 'That cookie did not work. Copy it again, then retry.',
      });
    }
    console.error('MyStudio connect failed:', err.message);
    return res.status(502).json({ error: 'Could not reach MyStudio. Try again shortly.' });
  }

  try {
    const row = await saveConnection(pool, {
      locationId: req.session.activeLocationId,
      userId: req.session.userId,
      companyId: session.companyId,
      companyName: session.companyName,
      cookie,
      login: null,
    });
    // A new credential must not serve a pull taken with the old one.
    forgetPull(req.session.activeLocationId);
    res.status(201).json({ configured: true, ...publicShape(row) });
  } catch (err) {
    console.error('Error saving MyStudio connection:', err.message);
    res.status(500).json({ error: 'Failed to save connection' });
  }
});

// POST /api/mystudio/login/start  { email?, password? }
//
// Asks MyStudio to email the six digit code. Both fields fall back to what was
// saved, so the everyday case is an empty body and a button.
router.post('/login/start', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');

  if (!ms.isConfigured()) {
    return res.status(503).json({
      error: 'MyStudio is not set up on the server yet. MYSTUDIO_ENC_KEY is missing.',
    });
  }

  try {
    const conn = await loadConnection(pool, req.session.activeLocationId);
    const { email, password } = loginCredentials(conn, req.body, readPending(req));
    if (!email || !password) {
      return res.status(400).json({ error: 'Enter your MyStudio email and password.' });
    }

    const started = await ms.startLogin({ email, password });
    // Only once MyStudio has actually sent the code, so a rejected password
    // does not leave a sign-in hanging around waiting for one.
    setPending(req, { email, password, cookie: started.cookie });
    res.json({ otpSent: true, email });
  } catch (err) {
    sendLoginError(res, err, 'sign-in');
  }
});

// POST /api/mystudio/login/resend  { email?, password? }
router.post('/login/resend', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const conn = await loadConnection(pool, req.session.activeLocationId);
    const { email, password } = loginCredentials(conn, req.body, readPending(req));
    if (!email || !password) {
      return res.status(400).json({ error: 'Enter your MyStudio email and password.' });
    }

    const resent = await ms.resendOtp({ email, password });
    setPending(req, { email, password, cookie: resent.cookie });
    res.json({ otpSent: true, email });
  } catch (err) {
    sendLoginError(res, err, 'code resend');
  }
});

// DELETE /api/mystudio/login/pending
//
// Backing out of a half-finished sign-in. Without this, closing the panel would
// leave it waiting and every reopen would land on the code step.
router.delete('/login/pending', requireManager, requireOwnLocation, (req, res) => {
  clearPending(req);
  res.json({ awaitingCode: false });
});

// POST /api/mystudio/login/verify  { code, email?, password? }
//
// Exchanges the code for a session and stores it. The password is written only
// once the session it produced has been proven to work, so a typo is never kept.
router.post('/login/verify', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');

  if (!ms.isConfigured()) {
    return res.status(503).json({
      error: 'MyStudio is not set up on the server yet. MYSTUDIO_ENC_KEY is missing.',
    });
  }

  // Six digits exactly. Anything else cannot be a MyStudio passcode, and
  // forwarding it would spend one of their attempts to be told so.
  const code = String((req.body && req.body.code) || '').trim();
  if (!/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: 'Enter the six digit code MyStudio emailed you.' });
  }

  try {
    const conn = await loadConnection(pool, req.session.activeLocationId);
    const pending = readPending(req);
    const { email, password } = loginCredentials(conn, req.body, pending);
    if (!email || !password) {
      return res.status(400).json({
        error: 'That sign-in timed out. Enter your MyStudio password and ask for a new code.',
      });
    }

    let signedIn;
    let verified;
    try {
      signedIn = await ms.completeLogin({
        email,
        password,
        otpCode: code,
        // What the code request was handed back. This exchange completes the
        // sign-in that call started, and a correct code fails without it.
        cookie: pending ? pending.cookie : '',
        // Reconnecting should land on the same center the roster is matched
        // against, not on whichever one the account happens to list first.
        preferredCompanyId: conn ? conn.company_id : null,
      });
      verified = await ms.verifySession(signedIn.cookie);
    } catch (err) {
      return sendLoginError(res, err, 'code exchange');
    }

    const row = await saveConnection(pool, {
      locationId: req.session.activeLocationId,
      userId: req.session.userId,
      companyId: verified.companyId,
      companyName: verified.companyName,
      cookie: signedIn.cookie,
      login: { email, password },
    });

    // Used, so it goes. The password lives in the row now, encrypted.
    clearPending(req);

    // A new credential must not serve a pull taken with the old one.
    forgetPull(req.session.activeLocationId);
    res.status(201).json({ configured: true, ...publicShape(row) });
  } catch (err) {
    console.error('Error saving MyStudio sign-in:', err.message);
    res.status(500).json({ error: 'Failed to save connection' });
  }
});

// DELETE /api/mystudio/login/saved
//
// Forgets the password without touching the connection. Renewals go back to
// asking for it; today's roster keeps working.
router.delete('/login/saved', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    await pool.query(
      `UPDATE mystudio_connections
          SET login_email = NULL, login_secret = NULL, login_saved_at = NULL
        WHERE location_id = $1`,
      [req.session.activeLocationId]
    );
    const conn = await loadConnection(pool, req.session.activeLocationId);
    res.json({ configured: ms.isConfigured(), ...publicShape(conn) });
  } catch (err) {
    console.error('Error clearing MyStudio sign-in:', err.message);
    res.status(500).json({ error: 'Failed to forget the saved password' });
  }
});

// DELETE /api/mystudio/connect
router.delete('/connect', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    forgetPull(req.session.activeLocationId);
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
// Senseis too: knowing who is coming to the four o'clock is the whole point
// of the thing for the person actually teaching it. Reading the roster is not
// a director's privilege. Managing the connection still is, so every other
// route in this file stays requireManager.
router.get('/today', requireSensei, async (req, res) => {
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

    // Held across the pull so any token MyStudio refreshes along the way can be
    // written back below. Without this the stored cookie stays frozen at the
    // moment it was pasted while the real session moves on without it.
    let session;

    let pulled = cachedPull(locationId, date);
    const fromCache = Boolean(pulled);

    try {
      if (!pulled) {
        session = ms.createSession(ms.decryptCookie(conn.session_cookie));
        pulled = await ms.getExpectedForDate(session, conn.company_id, date);
        rememberPull(locationId, date, pulled);
      }
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

    // A cached read did not touch MyStudio, so it is not evidence the session is
    // still good and must not restamp last_verified_at.
    if (fromCache) {
      return res.json({
        connected: true,
        configured: true,
        status: 'connected',
        companyName: conn.company_name,
        date: pulled.date,
        classCount: pulled.classCount,
        bookedClassCount: pulled.bookedClassCount,
        expected,
      });
    }

    // Fold a refreshed cookie into the same statement rather than adding a round
    // trip, and only when one actually arrived, so an ordinary pull stays a
    // timestamp update.
    if (session.rotated) {
      await pool.query(
        `UPDATE mystudio_connections
            SET last_synced_at = now(), last_verified_at = now(),
                status = 'connected', session_cookie = $2
          WHERE id = $1`,
        [conn.id, ms.encryptCookie(session.cookie)]
      );
    } else {
      await pool.query(
        `UPDATE mystudio_connections
            SET last_synced_at = now(), last_verified_at = now(), status = 'connected'
          WHERE id = $1`,
        [conn.id]
      );
    }

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
