const express = require('express');
const router = express.Router();
const { requireSensei } = require('../middleware/auth');

// POST /api/progress
router.post('/', requireSensei, (req, res) => {
  const db = req.app.get('db');
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
    // Check student exists
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND active = 1').get(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Insert progress log
    const result = db.prepare(`
      INSERT INTO progress_logs (student_id, sensei_id, session_date, belt_level_at, belt_sublevel_at, project_at, status_at, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      student_id,
      senseiId,
      date,
      belt_level_at || null,
      belt_sublevel_at || null,
      project_at || null,
      status_at || null,
      notes
    );

    // Update student profile if requested
    if (update_student) {
      db.prepare(`
        UPDATE students
        SET belt_level = ?, belt_sublevel = ?, current_project = ?, project_status = ?
        WHERE id = ?
      `).run(
        belt_level_at !== undefined ? belt_level_at : student.belt_level,
        belt_sublevel_at !== undefined ? belt_sublevel_at : student.belt_sublevel,
        project_at !== undefined ? project_at : student.current_project,
        status_at !== undefined ? status_at : student.project_status,
        student_id
      );
    }

    // Mark daily assignment as completed if one exists
    db.prepare(`
      UPDATE daily_assignments
      SET completed = 1
      WHERE student_id = ? AND session_date = ?
    `).run(student_id, date);

    const log = db.prepare(`
      SELECT pl.*, u.display_name as sensei_name
      FROM progress_logs pl
      LEFT JOIN users u ON pl.sensei_id = u.id
      WHERE pl.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(log);
  } catch (err) {
    console.error('Error creating progress log:', err);
    res.status(500).json({ error: 'Failed to create progress log' });
  }
});

module.exports = router;
