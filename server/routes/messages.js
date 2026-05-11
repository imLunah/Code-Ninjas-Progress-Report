const express = require('express');
const router = express.Router();
const { requireSensei } = require('../middleware/auth');

// GET /api/messages/threads — all parent conversations for this location with read/unread status
router.get('/threads', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      `WITH thread_stats AS (
         SELECT
           student_id,
           MAX(created_at) FILTER (WHERE sender_type = 'parent') AS latest_parent_at,
           MAX(created_at) AS latest_any_at,
           (array_agg(body ORDER BY created_at DESC))[1] AS latest_message,
           (array_agg(sender_type ORDER BY created_at DESC))[1] AS latest_sender_type
         FROM messages
         GROUP BY student_id
       )
       SELECT
         s.id AS student_id,
         s.full_name AS student_name,
         s.parent_name,
         s.parent_email,
         ts.latest_parent_at,
         ts.latest_any_at,
         ts.latest_message,
         ts.latest_sender_type,
         ptr.read_at,
         (ptr.read_at IS NULL OR ts.latest_parent_at > ptr.read_at) AS is_unread
       FROM thread_stats ts
       JOIN students s ON s.id = ts.student_id
       LEFT JOIN parent_thread_read ptr ON ptr.student_id = s.id
       WHERE s.location_id = $1
         AND s.active = true
         AND ts.latest_parent_at IS NOT NULL
       ORDER BY (ptr.read_at IS NULL OR ts.latest_parent_at > ptr.read_at) DESC,
                ts.latest_parent_at DESC`,
      [req.session.activeLocationId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Message threads error:', err);
    res.status(500).json({ error: 'Failed to load message threads' });
  }
});

// POST /api/messages/threads/:studentId/read — mark thread as read
router.post('/threads/:studentId/read', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  const { studentId } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT id FROM students WHERE id = $1 AND location_id = $2 AND active = true',
      [studentId, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Student not found' });

    await pool.query(
      `INSERT INTO parent_thread_read (student_id, read_at) VALUES ($1, NOW())
       ON CONFLICT (student_id) DO UPDATE SET read_at = NOW()`,
      [studentId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

// POST /api/messages/threads/:studentId/unread — mark thread as unread
router.post('/threads/:studentId/unread', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  const { studentId } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT id FROM students WHERE id = $1 AND location_id = $2 AND active = true',
      [studentId, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Student not found' });

    await pool.query('DELETE FROM parent_thread_read WHERE student_id = $1', [studentId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Mark unread error:', err);
    res.status(500).json({ error: 'Failed to mark as unread' });
  }
});

module.exports = router;
