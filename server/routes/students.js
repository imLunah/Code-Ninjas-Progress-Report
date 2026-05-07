const express = require('express');
const router = express.Router();
const { requireAuth, requireManager } = require('../middleware/auth');

// GET /api/students
router.get('/', requireAuth, (req, res) => {
  const db = req.app.get('db');
  const { search, program, belt } = req.query;

  let query = `
    SELECT s.*,
      (SELECT MAX(pl.session_date) FROM progress_logs pl WHERE pl.student_id = s.id) as last_activity
    FROM students s
    WHERE s.active = 1
  `;
  const params = [];

  if (search) {
    query += ' AND s.full_name LIKE ?';
    params.push(`%${search}%`);
  }
  if (program) {
    query += ' AND s.program = ?';
    params.push(program);
  }
  if (belt) {
    query += ' AND s.belt_level = ?';
    params.push(belt);
  }

  query += ' ORDER BY s.full_name ASC';

  try {
    const students = db.prepare(query).all(...params);
    res.json(students);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/students/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;

  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND active = 1').get(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const progressLogs = db.prepare(`
      SELECT pl.*, u.display_name as sensei_name
      FROM progress_logs pl
      LEFT JOIN users u ON pl.sensei_id = u.id
      WHERE pl.student_id = ?
      ORDER BY pl.session_date DESC, pl.created_at DESC
    `).all(id);

    res.json({ ...student, progress_logs: progressLogs });
  } catch (err) {
    console.error('Error fetching student:', err);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// POST /api/students
router.post('/', requireManager, (req, res) => {
  const db = req.app.get('db');
  const { full_name, program, belt_level, belt_sublevel, current_project, project_status, birthday } = req.body;

  if (!full_name || !program) {
    return res.status(400).json({ error: 'Full name and program are required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO students (full_name, program, belt_level, belt_sublevel, current_project, project_status, birthday)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(full_name, program, belt_level || null, belt_sublevel || null, current_project || null, project_status || null, birthday || null);

    const student = db.prepare('SELECT * FROM students WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(student);
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

// PATCH /api/students/:id
router.patch('/:id', requireManager, (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { full_name, belt_level, belt_sublevel, current_project, project_status, birthday } = req.body;

  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND active = 1').get(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    db.prepare(`
      UPDATE students
      SET full_name = ?, belt_level = ?, belt_sublevel = ?, current_project = ?, project_status = ?, birthday = ?
      WHERE id = ?
    `).run(
      full_name ?? student.full_name,
      belt_level !== undefined ? belt_level : student.belt_level,
      belt_sublevel !== undefined ? belt_sublevel : student.belt_sublevel,
      current_project !== undefined ? current_project : student.current_project,
      project_status !== undefined ? project_status : student.project_status,
      birthday !== undefined ? birthday : student.birthday,
      id
    );

    const updated = db.prepare('SELECT * FROM students WHERE id = ?').get(id);
    res.json(updated);
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// DELETE /api/students/:id (soft delete)
router.delete('/:id', requireManager, (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;

  try {
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND active = 1').get(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    db.prepare('UPDATE students SET active = 0 WHERE id = ?').run(id);
    res.json({ message: 'Student deactivated' });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

module.exports = router;
