const express = require('express');
const router = express.Router();
const { requireSensei, requireManager, requireOwnLocation } = require('../middleware/auth');

// POST /api/progress
router.post('/', requireSensei, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const {
    student_id,
    program,
    session_date,
    notes,
    belt_level_at,
    belt_sublevel_at,
    project_at,
    status_at,
    update_student,
    sub_program,
    module_name,
    lesson_name,
  } = req.body;

  if (!student_id || !program || !notes) {
    return res.status(400).json({ error: 'student_id, program, and notes are required' });
  }

  const date = session_date || new Date().toISOString().split('T')[0];
  const senseiId = req.session.userId;

  try {
    const { rows: studentRows } = await pool.query(
      'SELECT id FROM students WHERE id = $1 AND active = true AND location_id = $2',
      [student_id, req.session.activeLocationId]
    );
    if (!studentRows[0]) return res.status(404).json({ error: 'Student not found' });

    const { rows: logRows } = await pool.query(`
      INSERT INTO progress_logs (student_id, program, sensei_id, session_date, belt_level_at, belt_sublevel_at, project_at, status_at, notes, sub_program, module_name, lesson_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id
    `, [
      student_id,
      program,
      senseiId,
      date,
      belt_level_at || null,
      belt_sublevel_at || null,
      project_at || null,
      status_at || null,
      notes,
      sub_program || null,
      module_name || null,
      lesson_name || null,
    ]);

    if (update_student) {
      const { rows: enrollmentRows } = await pool.query(
        'SELECT * FROM student_programs WHERE student_id = $1 AND program = $2',
        [student_id, program]
      );
      const enrollment = enrollmentRows[0];
      if (enrollment) {
        await pool.query(`
          UPDATE student_programs
          SET belt_level = $1, belt_sublevel = $2, current_project = $3, project_status = $4
          WHERE student_id = $5 AND program = $6
        `, [
          belt_level_at !== undefined ? belt_level_at : enrollment.belt_level,
          belt_sublevel_at !== undefined ? belt_sublevel_at : enrollment.belt_sublevel,
          project_at !== undefined ? project_at : enrollment.current_project,
          status_at !== undefined ? status_at : enrollment.project_status,
          student_id,
          program,
        ]);
      }
    }

    await pool.query(
      'UPDATE daily_assignments SET completed = true WHERE student_id = $1 AND program = $2 AND session_date = $3',
      [student_id, program, date]
    );

    const { rows } = await pool.query(`
      SELECT pl.*, u.display_name as sensei_name
      FROM progress_logs pl
      LEFT JOIN users u ON pl.sensei_id = u.id
      WHERE pl.id = $1
    `, [logRows[0].id]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating progress log:', err);
    res.status(500).json({ error: 'Failed to create progress log' });
  }
});

// POST /api/progress/:id/comments — manager adds a comment to a log entry
router.post('/:id/comments', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

  try {
    const { rows: logRows } = await pool.query(
      `SELECT pl.id FROM progress_logs pl
       JOIN students s ON pl.student_id = s.id
       WHERE pl.id = $1 AND s.location_id = $2`,
      [req.params.id, req.session.activeLocationId]
    );
    if (!logRows[0]) return res.status(404).json({ error: 'Log not found' });

    const { rows } = await pool.query(
      `INSERT INTO progress_log_comments (log_id, user_id, user_name, body)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.session.userId, req.session.displayName, body.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Progress log comment error:', err);
    res.status(500).json({ error: 'Failed to save comment' });
  }
});

module.exports = router;
