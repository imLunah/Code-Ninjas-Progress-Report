const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { requireParent } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

// Matches the staff-side pinned-note ceiling in students.js.
const MAX_INSTRUCTIONS = 2000;

const STUDENT_PROGRAMS_SUBQUERY = `
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', sp.id,
        'program', sp.program,
        'belt_level', sp.belt_level,
        'belt_sublevel', sp.belt_sublevel,
        'current_project', sp.current_project,
        'project_status', sp.project_status,
        'last_session_date', sp.last_session_date,
        'last_sub_program', sp.last_sub_program,
        'last_module_name', sp.last_module_name,
        'percent_complete', sp.percent_complete
      ) ORDER BY sp.created_at
    ) FROM student_programs sp WHERE sp.student_id = s.id),
    '[]'::json
  ) AS programs
`;

// What Home shows for each child without opening them: the last handful of
// sessions (with the sensei's display name, which is what the child calls
// them), the last few club days, and which days this week they were checked in.
// The full history is on the child's own route; this is the glance.
const RECENT_SESSIONS_SUBQUERY = `
  COALESCE(
    (SELECT json_agg(r ORDER BY r.session_date DESC, r.created_at DESC) FROM (
      SELECT pl.session_date, pl.created_at, pl.program, pl.sub_program, pl.module_name, pl.lesson_name,
             pl.belt_level_at, pl.belt_sublevel_at, pl.project_at, pl.status_at,
             u.display_name AS sensei_name
        FROM progress_logs pl
        LEFT JOIN users u ON u.id = pl.sensei_id
       WHERE pl.student_id = s.id AND pl.notes IS DISTINCT FROM 'Marked complete from roadmap'
       ORDER BY pl.session_date DESC, pl.created_at DESC
       LIMIT 6
    ) r),
    '[]'::json
  ) AS recent_sessions
`;

const RECENT_CLUBS_SUBQUERY = `
  COALESCE(
    (SELECT json_agg(c ORDER BY c.session_date DESC) FROM (
      SELECT cs.club_name, cs.session_date
        FROM club_attendees ca
        JOIN club_sessions cs ON cs.id = ca.club_session_id
       WHERE ca.student_id = s.id
       ORDER BY cs.session_date DESC
       LIMIT 3
    ) c),
    '[]'::json
  ) AS recent_clubs
`;

const WEEK_CHECKINS_SUBQUERY = `
  COALESCE(
    (SELECT json_agg(DISTINCT to_char(da.session_date, 'YYYY-MM-DD'))
       FROM daily_assignments da
      WHERE da.student_id = s.id
        AND da.session_date >= date_trunc('week', CURRENT_DATE)::date
        AND da.session_date <  (date_trunc('week', CURRENT_DATE) + interval '7 days')::date),
    '[]'::json
  ) AS week_checkins
`;

// POST /api/parent/login
// Center code first, then the email.
//
// There is no password here and there never has been: knowing an address that
// appears in students.parent_email was, on its own, full access to that child's
// record. The code is therefore not "an extra layer" on a credential, it is the
// second half of the only one. It is not a secret either — it goes on a flyer
// and into a group chat — but it means a harvested address is useless without
// knowing which center it belongs to, and that one center's parents cannot
// probe another's.
//
// It also fixes something quieter. The lookup used to run across every student
// row in the database, so a parent with children at two centers got both at
// once with no way to say which they meant, and a deactivated center's parents
// carried on regardless. The session now carries a center, and every route
// below is scoped to it.
router.post('/login', loginLimiter, async (req, res) => {
  const pool = req.app.get('db');
  const email = String((req.body && req.body.email) || '').trim();
  const centerCode = String((req.body && req.body.centerCode) || '').trim().toUpperCase();

  if (!centerCode || !email) {
    return res.status(400).json({ error: 'Center code and email are required.' });
  }

  try {
    const { rows: centers } = await pool.query(
      'SELECT id, name FROM locations WHERE UPPER(center_code) = $1 AND active = true',
      [centerCode]
    );

    // One message for a wrong code and a wrong email, deliberately. Telling
    // somebody the code was right narrows the guess for them.
    const denied = { error: 'That center code and email do not match an account.' };
    if (!centers.length) return res.status(401).json(denied);

    const center = centers[0];
    const { rows } = await pool.query(
      `SELECT parent_name FROM students
        WHERE LOWER(parent_email) = LOWER($1) AND EXISTS (SELECT 1 FROM student_locations sl_m WHERE sl_m.student_id = students.id AND sl_m.location_id = $2) AND active = true
        LIMIT 1`,
      [email, center.id]
    );
    if (!rows.length) return res.status(401).json(denied);

    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });

    req.session.parentEmail = email.toLowerCase();
    req.session.role = 'parent';
    req.session.parentName = rows[0].parent_name || null;
    req.session.parentLocationId = center.id;
    req.session.parentLocationName = center.name;
    // Same rule as staff: thirty days when asked for, otherwise the cookie
    // dies with the browser. A family checking progress on a shared tablet
    // is exactly who should be able to say no to this.
    req.session.cookie.maxAge = req.body && req.body.keep_signed_in
      ? 30 * 24 * 60 * 60 * 1000
      : null;

    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    res.json({
      email: req.session.parentEmail,
      role: 'parent',
      parentName: req.session.parentName,
      centerName: center.name,
    });
  } catch (err) {
    console.error('Parent login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/parent/me
router.get('/me', (req, res) => {
  // A session made before centers existed has no location and cannot be scoped,
  // so it is treated as signed out rather than silently given the old
  // cross-center reach.
  if (!req.session.parentEmail || !req.session.parentLocationId) return res.json(null);
  res.json({
    email: req.session.parentEmail,
    role: 'parent',
    parentName: req.session.parentName,
    centerName: req.session.parentLocationName || null,
  });
});

// POST /api/parent/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/parent/events?today=YYYY-MM-DD — the center's published event
// listings for the home slideshow: authored for families on the manager
// Events page, unlike calendar events, which are staff-facing. Dated
// listings come soonest first and drop off once their day passes; undated
// ones are evergreen and follow by recency. `today` is the parent's local
// date: the server clock is UTC, which is already tomorrow every California
// evening, and an event must stay visible for the whole of its own evening.
// A bad or missing value falls back to the server's date — the parent can
// only widen or narrow which PUBLISHED listings they see, nothing else.
router.get('/events', requireParent, async (req, res) => {
  const pool = req.app.get('db');
  const today = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.today || '')) ? req.query.today : null;
  try {
    const { rows } = await pool.query(`
      SELECT l.id, l.title, l.subtitle, l.description, l.event_url, l.image_url, l.event_time,
             to_char(l.event_date, 'YYYY-MM-DD') AS event_date
      FROM event_listings l
      WHERE l.location_id = $1 AND l.published = true
        AND (l.event_date IS NULL OR l.event_date >= COALESCE($2::date, CURRENT_DATE))
      ORDER BY l.event_date ASC NULLS LAST, l.created_at DESC
      LIMIT 6
    `, [req.session.parentLocationId, today]);
    res.json(rows);
  } catch (err) {
    console.error('Parent events error:', err);
    res.status(500).json({ error: 'Failed to load events' });
  }
});

// GET /api/parent/students
router.get('/students', requireParent, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT s.id, s.full_name, s.birthday, s.created_at,
        ${STUDENT_PROGRAMS_SUBQUERY},
        (SELECT MAX(pl.session_date) FROM progress_logs pl WHERE pl.student_id = s.id AND pl.notes IS DISTINCT FROM 'Marked complete from roadmap') AS last_activity,
        ${RECENT_SESSIONS_SUBQUERY},
        ${RECENT_CLUBS_SUBQUERY},
        ${WEEK_CHECKINS_SUBQUERY}
      FROM students s
      WHERE LOWER(s.parent_email) = LOWER($1) AND EXISTS (SELECT 1 FROM student_locations sl_m WHERE sl_m.student_id = s.id AND sl_m.location_id = $2) AND s.active = true
      ORDER BY s.full_name
    `, [req.session.parentEmail, req.session.parentLocationId]);
    res.json(rows);
  } catch (err) {
    console.error('Parent students error:', err);
    res.status(500).json({ error: 'Failed to load students' });
  }
});

// GET /api/parent/students/:id
router.get('/students/:id', requireParent, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  try {
    const { rows } = await pool.query(`
      SELECT s.id, s.full_name, s.birthday, s.created_at, s.special_instructions, s.parent_note,
        ${STUDENT_PROGRAMS_SUBQUERY}
      FROM students s
      WHERE s.id = $1 AND LOWER(s.parent_email) = LOWER($2) AND EXISTS (SELECT 1 FROM student_locations sl_m WHERE sl_m.student_id = s.id AND sl_m.location_id = $3) AND s.active = true
    `, [id, req.session.parentEmail, req.session.parentLocationId]);

    if (!rows[0]) return res.status(404).json({ error: 'Student not found' });

    const { rows: logs } = await pool.query(`
      SELECT pl.session_date, pl.program, pl.sub_program, pl.module_name, pl.lesson_name,
        pl.belt_level_at, pl.belt_sublevel_at, pl.project_at, pl.status_at,
        (pl.notes = 'Marked complete from roadmap') AS from_roadmap,
        u.display_name AS sensei_name
      FROM progress_logs pl
      LEFT JOIN users u ON u.id = pl.sensei_id
      WHERE pl.student_id = $1
      ORDER BY pl.session_date DESC, pl.created_at DESC
    `, [id]);

    const { rows: clubs } = await pool.query(`
      SELECT cs.club_name, cs.session_date
      FROM club_attendees ca
      JOIN club_sessions cs ON ca.club_session_id = cs.id
      WHERE ca.student_id = $1
      ORDER BY cs.session_date DESC
    `, [id]);

    // Today's check-ins, so the portal can say "checked in at 4:12" the
    // moment it happens. Program and time only; nothing a parent could not
    // already see standing at the front desk.
    const { rows: today } = await pool.query(`
      SELECT da.program, da.created_at, da.completed
        FROM daily_assignments da
       WHERE da.student_id = $1 AND da.session_date = CURRENT_DATE
       ORDER BY da.created_at ASC
    `, [id]);

    res.json({ ...rows[0], session_logs: logs, club_attendance: clubs, today_checkins: today });
  } catch (err) {
    console.error('Parent student detail error:', err);
    res.status(500).json({ error: 'Failed to load student' });
  }
});

// PATCH /api/parent/students/:id/instructions — parent saves special instructions for their child
router.patch('/students/:id/instructions', requireParent, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  const { special_instructions } = req.body;

  // Parent-authored text rendered in staff context — capped like the staff-side
  // pinned note rather than left bounded only by the 10mb JSON body limit.
  if (special_instructions != null && typeof special_instructions !== 'string') {
    return res.status(400).json({ error: 'Invalid note' });
  }
  if (typeof special_instructions === 'string' && special_instructions.length > MAX_INSTRUCTIONS) {
    return res.status(400).json({ error: `Note too long (max ${MAX_INSTRUCTIONS} characters)` });
  }

  try {
    const { rows } = await pool.query(
      `UPDATE students SET special_instructions = $1
        WHERE id = $2 AND LOWER(parent_email) = LOWER($3) AND EXISTS (SELECT 1 FROM student_locations sl_m WHERE sl_m.student_id = students.id AND sl_m.location_id = $4) AND active = true
        RETURNING special_instructions`,
      [special_instructions?.trim() || null, id, req.session.parentEmail, req.session.parentLocationId]
    );
    if (!rows[0]) return res.status(403).json({ error: 'Forbidden' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Special instructions error:', err);
    res.status(500).json({ error: 'Failed to save instructions' });
  }
});

module.exports = router;
