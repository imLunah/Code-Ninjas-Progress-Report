const express = require('express');
const router = express.Router();
const { requireAuth, requireManager, requireSensei } = require('../middleware/auth');

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

// GET /api/daily?date=YYYY-MM-DD
router.get('/', requireAuth, (req, res) => {
  const db = req.app.get('db');
  const date = req.query.date || todayDate();

  try {
    const assignments = db.prepare(`
      SELECT
        da.id,
        da.student_id,
        da.sensei_id,
        da.session_date,
        da.completed,
        s.full_name as student_name,
        s.program,
        s.belt_level,
        s.belt_sublevel,
        s.current_project,
        s.project_status,
        u.display_name as sensei_name
      FROM daily_assignments da
      JOIN students s ON da.student_id = s.id
      LEFT JOIN users u ON da.sensei_id = u.id
      WHERE da.session_date = ?
      ORDER BY da.created_at ASC
    `).all(date);

    res.json(assignments);
  } catch (err) {
    console.error('Error fetching daily assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// GET /api/daily/my — logged-in sensei's assignments for today
router.get('/my', requireSensei, (req, res) => {
  const db = req.app.get('db');
  const date = req.query.date || todayDate();
  const senseiId = req.session.userId;

  try {
    const assignments = db.prepare(`
      SELECT
        da.id,
        da.student_id,
        da.sensei_id,
        da.session_date,
        da.completed,
        s.full_name as student_name,
        s.program,
        s.belt_level,
        s.belt_sublevel,
        s.current_project,
        s.project_status,
        u.display_name as sensei_name
      FROM daily_assignments da
      JOIN students s ON da.student_id = s.id
      LEFT JOIN users u ON da.sensei_id = u.id
      WHERE da.session_date = ? AND da.sensei_id = ?
      ORDER BY da.created_at ASC
    `).all(date, senseiId);

    res.json(assignments);
  } catch (err) {
    console.error('Error fetching sensei assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

// POST /api/daily
router.post('/', requireManager, (req, res) => {
  const db = req.app.get('db');
  const { student_id, session_date } = req.body;

  if (!student_id) {
    return res.status(400).json({ error: 'student_id is required' });
  }

  const date = session_date || todayDate();

  try {
    // Check student exists
    const student = db.prepare('SELECT * FROM students WHERE id = ? AND active = 1').get(student_id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const result = db.prepare(`
      INSERT INTO daily_assignments (student_id, session_date)
      VALUES (?, ?)
    `).run(student_id, date);

    const assignment = db.prepare(`
      SELECT
        da.id,
        da.student_id,
        da.sensei_id,
        da.session_date,
        da.completed,
        s.full_name as student_name,
        s.program,
        s.belt_level,
        s.belt_sublevel,
        s.current_project,
        s.project_status,
        u.display_name as sensei_name
      FROM daily_assignments da
      JOIN students s ON da.student_id = s.id
      LEFT JOIN users u ON da.sensei_id = u.id
      WHERE da.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json(assignment);
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Student already added for this date' });
    }
    console.error('Error adding assignment:', err);
    res.status(500).json({ error: 'Failed to add assignment' });
  }
});

// PATCH /api/daily/:id/assign
router.patch('/:id/assign', requireManager, (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;
  const { sensei_id } = req.body;

  try {
    const assignment = db.prepare('SELECT * FROM daily_assignments WHERE id = ?').get(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    db.prepare('UPDATE daily_assignments SET sensei_id = ? WHERE id = ?').run(sensei_id || null, id);

    const updated = db.prepare(`
      SELECT
        da.id,
        da.student_id,
        da.sensei_id,
        da.session_date,
        da.completed,
        s.full_name as student_name,
        s.program,
        s.belt_level,
        s.belt_sublevel,
        s.current_project,
        s.project_status,
        u.display_name as sensei_name
      FROM daily_assignments da
      JOIN students s ON da.student_id = s.id
      LEFT JOIN users u ON da.sensei_id = u.id
      WHERE da.id = ?
    `).get(id);

    res.json(updated);
  } catch (err) {
    console.error('Error assigning sensei:', err);
    res.status(500).json({ error: 'Failed to assign sensei' });
  }
});

// DELETE /api/daily/:id
router.delete('/:id', requireManager, (req, res) => {
  const db = req.app.get('db');
  const { id } = req.params;

  try {
    const assignment = db.prepare('SELECT * FROM daily_assignments WHERE id = ?').get(id);
    if (!assignment) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    db.prepare('DELETE FROM daily_assignments WHERE id = ?').run(id);
    res.json({ message: 'Assignment removed' });
  } catch (err) {
    console.error('Error removing assignment:', err);
    res.status(500).json({ error: 'Failed to remove assignment' });
  }
});

module.exports = router;
