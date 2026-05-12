const express = require('express');
const router = express.Router();
const { requireManager } = require('../middleware/auth');

// GET /api/email-preview — returns structured per-program data for all students
// at the active location who have activity this month, for email preview.
router.get('/', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM student_monthly_summary
      WHERE location_id = $1
      ORDER BY full_name
    `, [req.session.activeLocationId]);
    res.json(rows);
  } catch (err) {
    console.error('Email preview error:', err);
    res.status(500).json({ error: 'Failed to load email preview data' });
  }
});

module.exports = router;
