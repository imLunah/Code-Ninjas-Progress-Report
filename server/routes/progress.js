const express = require('express');
const router = express.Router();
const { requireSensei, requireOwnLocation } = require('../middleware/auth');

// POST /api/progress
router.post('/', requireSensei, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const {
    student_id,
    session_date,
    notes,
    belt_level_at,
    belt_sublevel_at,
    project_at,
    status_at,
    update_student,
  } = req.body;

  if (!student_id || !notes) {
    return res.status(400).json({ error: 'student_id and notes are required' });
  }

  const date = session_date || new Date().toISOString().split('T')[0];
  const senseiId = req.session.userId;

  try {
    const { rows: studentRows } = await pool.query(
      'SELECT * FROM students WHERE id = $1 AND active = true AND location_id = $2',
      [student_id, req.session.activeLocationId]
    );
    const student = studentRows[0];
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { rows: logRows } = await pool.query(`
      INSERT INTO progress_logs (student_id, sensei_id, session_date, belt_level_at, belt_sublevel_at, project_at, status_at, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      student_id,
      senseiId,
      date,
      belt_level_at || null,
      belt_sublevel_at || null,
      project_at || null,
      status_at || null,
      notes,
    ]);

    if (update_student) {
      await pool.query(`
        UPDATE students
        SET belt_level = $1, belt_sublevel = $2, current_project = $3, project_status = $4
        WHERE id = $5
      `, [
        belt_level_at !== undefined ? belt_level_at : student.belt_level,
        belt_sublevel_at !== undefined ? belt_sublevel_at : student.belt_sublevel,
        project_at !== undefined ? project_at : student.current_project,
        status_at !== undefined ? status_at : student.project_status,
        student_id,
      ]);
    }

    await pool.query(
      'UPDATE daily_assignments SET completed = true WHERE student_id = $1 AND session_date = $2',
      [student_id, date]
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

module.exports = router;
