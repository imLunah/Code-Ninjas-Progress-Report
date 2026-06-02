const express = require('express');
const router = express.Router();
const { requireSensei, requireManager, requireOwnLocation } = require('../middleware/auth');

// GET /api/announcements — active + expired within last 7 days, current location
router.get('/', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT a.id, a.title, a.message, a.visible_from, a.visible_until,
             a.created_at, u.display_name AS created_by_name
      FROM announcements a
      LEFT JOIN users u ON u.id = a.created_by
      WHERE a.location_id = $1
        AND a.visible_from <= CURRENT_DATE
        AND (a.visible_until IS NULL OR a.visible_until >= CURRENT_DATE - INTERVAL '7 days')
      ORDER BY a.visible_from DESC, a.created_at DESC
    `, [req.session.activeLocationId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// POST /api/announcements — manager creates
router.post('/', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { title, message, visible_from, visible_until } = req.body;
  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Title and message are required' });
  }
  if (title.trim().length > 100) {
    return res.status(400).json({ error: 'Title max 100 characters' });
  }
  try {
    const { rows } = await pool.query(`
      INSERT INTO announcements (location_id, title, message, visible_from, visible_until, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, title, message, visible_from, visible_until, created_at
    `, [
      req.session.activeLocationId,
      title.trim(),
      message.trim(),
      visible_from || new Date().toISOString().split('T')[0],
      visible_until || null,
      req.session.userId,
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating announcement:', err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// PATCH /api/announcements/:id
router.patch('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  const { title, message, visible_from, visible_until } = req.body;
  if (!title?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'Title and message are required' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT id FROM announcements WHERE id = $1 AND location_id = $2',
      [id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Announcement not found' });

    const { rows: updated } = await pool.query(`
      UPDATE announcements
      SET title = $1, message = $2, visible_from = $3, visible_until = $4
      WHERE id = $5
      RETURNING id, title, message, visible_from, visible_until, created_at
    `, [title.trim(), message.trim(), visible_from, visible_until || null, id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating announcement:', err);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// DELETE /api/announcements/:id
router.delete('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      'DELETE FROM announcements WHERE id = $1 AND location_id = $2 RETURNING id',
      [id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Announcement not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting announcement:', err);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

module.exports = router;
