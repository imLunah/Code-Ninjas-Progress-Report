const express = require('express');
const router = express.Router();
const { requireParent } = require('../middleware/auth');

const STUDENT_PROGRAMS_SUBQUERY = `
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', sp.id,
        'program', sp.program,
        'display_name', CASE
          WHEN sp.program LIKE 'custom_%' THEN COALESCE(
            (SELECT cp.name FROM custom_programs cp
             WHERE cp.id = CAST(SUBSTRING(sp.program FROM 8) AS INT)),
            sp.program
          )
          ELSE sp.program
        END,
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

// POST /api/parent/login
router.post('/login', async (req, res) => {
  const pool = req.app.get('db');
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  try {
    const { rows } = await pool.query(
      'SELECT id, parent_name FROM students WHERE LOWER(parent_email) = LOWER($1) AND active = true LIMIT 1',
      [email.trim()]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'No students found linked to that email address.' });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });

    req.session.parentEmail = email.trim().toLowerCase();
    req.session.role = 'parent';
    req.session.parentName = rows[0].parent_name || null;

    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });

    res.json({ email: req.session.parentEmail, role: 'parent', parentName: req.session.parentName });
  } catch (err) {
    console.error('Parent login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/parent/me
router.get('/me', (req, res) => {
  if (!req.session.parentEmail) return res.json(null);
  res.json({ email: req.session.parentEmail, role: 'parent', parentName: req.session.parentName });
});

// POST /api/parent/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/parent/students
router.get('/students', requireParent, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT s.id, s.full_name, s.birthday, s.created_at,
        ${STUDENT_PROGRAMS_SUBQUERY},
        (SELECT MAX(pl.session_date) FROM progress_logs pl WHERE pl.student_id = s.id) AS last_activity
      FROM students s
      WHERE LOWER(s.parent_email) = LOWER($1) AND s.active = true
      ORDER BY s.full_name
    `, [req.session.parentEmail]);
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
      WHERE s.id = $1 AND LOWER(s.parent_email) = LOWER($2) AND s.active = true
    `, [id, req.session.parentEmail]);

    if (!rows[0]) return res.status(404).json({ error: 'Student not found' });

    const { rows: logs } = await pool.query(`
      SELECT pl.session_date, pl.program, pl.sub_program, pl.module_name, pl.lesson_name,
        pl.belt_level_at, pl.belt_sublevel_at, pl.project_at, pl.status_at
      FROM progress_logs pl
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

    res.json({ ...rows[0], session_logs: logs, club_attendance: clubs });
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

  try {
    const { rows } = await pool.query(
      'UPDATE students SET special_instructions = $1 WHERE id = $2 AND LOWER(parent_email) = LOWER($3) AND active = true RETURNING special_instructions',
      [special_instructions?.trim() || null, id, req.session.parentEmail]
    );
    if (!rows[0]) return res.status(403).json({ error: 'Forbidden' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Special instructions error:', err);
    res.status(500).json({ error: 'Failed to save instructions' });
  }
});

module.exports = router;
