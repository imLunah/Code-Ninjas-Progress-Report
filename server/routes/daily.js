const express = require('express');
const router = express.Router();
const { requireAuth, requireManager, requireSensei, requireOwnLocation } = require('../middleware/auth');

function todayDate() {
  return new Date().toISOString().split('T')[0];
}

const ASSIGNMENT_SELECT = `
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
`;

// GET /api/daily?date=YYYY-MM-DD
router.get('/', requireAuth, async (req, res) => {
  const pool = req.app.get('db');
  const date = req.query.date || todayDate();

  try {
    const { rows } = await pool.query(
      ASSIGNMENT_SELECT + ' WHERE da.session_date = $1 AND s.location_id = $2 ORDER BY da.created_at ASC',
      [date, req.session.activeLocationId]
    );
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
  const { student_id, session_date } = req.body;

  if (!student_id) {
    return res.status(400).json({ error: 'student_id is required' });
  }

  const date = session_date || todayDate();

  try {
    const { rows: studentRows } = await pool.query(
      'SELECT id FROM students WHERE id = $1 AND active = true AND location_id = $2',
      [student_id, req.session.activeLocationId]
    );
    if (!studentRows[0]) return res.status(404).json({ error: 'Student not found' });

    const { rows: inserted } = await pool.query(
      'INSERT INTO daily_assignments (student_id, session_date) VALUES ($1, $2) RETURNING id',
      [student_id, date]
    );

    const { rows } = await pool.query(
      ASSIGNMENT_SELECT + ' WHERE da.id = $1',
      [inserted[0].id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Student already added for this date' });
    }
    console.error('Error adding assignment:', err);
    res.status(500).json({ error: 'Failed to add assignment' });
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
