const express = require('express');
const router = express.Router();
const { requireManager, requireOwnLocation } = require('../middleware/auth');

const COLORS = ['yellow', 'blue', 'green', 'pink', 'purple'];
const MAX_BODY = 2000;
// Board coordinates. Matches the CHECK on the columns; a note dragged past this
// would be off the board and unreachable.
const MAX_COORD = 5000;

// Sticky notes for Center Directors — center-scoped, visible to all CDs/admin at
// the location. Not shown to senseis or parents (this route is manager-gated).

// GET /api/director-notes — notes for the active location
router.get('/', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT n.id, n.body, n.color, n.position_x, n.position_y,
             n.created_by, n.created_at, n.updated_at,
             u.display_name AS created_by_name
      FROM director_notes n
      LEFT JOIN users u ON u.id = n.created_by
      WHERE n.location_id = $1
      ORDER BY n.created_at DESC
    `, [req.session.activeLocationId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching director notes:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// POST /api/director-notes — create a note at the active location
router.post('/', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { body, color } = req.body;
  if (typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'Note text is required' });
  }
  if (body.length > MAX_BODY) {
    return res.status(400).json({ error: `Note max ${MAX_BODY} characters` });
  }
  const safeColor = COLORS.includes(color) ? color : 'yellow';
  try {
    const { rows } = await pool.query(`
      INSERT INTO director_notes (location_id, body, color, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING id, body, color, position_x, position_y, created_by, created_at, updated_at
    `, [req.session.activeLocationId, body.trim(), safeColor, req.session.userId]);
    const { rows: named } = await pool.query('SELECT display_name FROM users WHERE id = $1', [req.session.userId]);
    res.status(201).json({ ...rows[0], created_by_name: named[0]?.display_name ?? null });
  } catch (err) {
    console.error('Error creating director note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PATCH /api/director-notes/:id — edit (author or admin only)
router.patch('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { body, color } = req.body;
  if (typeof body !== 'string' || !body.trim()) {
    return res.status(400).json({ error: 'Note text is required' });
  }
  if (body.length > MAX_BODY) {
    return res.status(400).json({ error: `Note max ${MAX_BODY} characters` });
  }
  const safeColor = COLORS.includes(color) ? color : 'yellow';
  try {
    const { rows } = await pool.query(
      'SELECT created_by FROM director_notes WHERE id = $1 AND location_id = $2',
      [req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Note not found' });
    if (req.session.role !== 'admin' && rows[0].created_by !== req.session.userId) {
      return res.status(403).json({ error: 'Only the author can edit this note' });
    }
    const { rows: updated } = await pool.query(`
      UPDATE director_notes SET body = $1, color = $2, updated_at = now()
      WHERE id = $3
      RETURNING id, body, color, position_x, position_y, created_by, created_at, updated_at
    `, [body.trim(), safeColor, req.params.id]);
    const { rows: named } = await pool.query('SELECT display_name FROM users WHERE id = $1', [updated[0].created_by]);
    res.json({ ...updated[0], created_by_name: named[0]?.display_name ?? null });
  } catch (err) {
    console.error('Error updating director note:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// PATCH /api/director-notes/:id/position — move a note on the board.
// Deliberately NOT author-gated like edit/delete: the board is shared, so any
// director at the center can tidy the arrangement. Only coordinates are written,
// never the note text.
router.patch('/:id/position', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const x = Number(req.body?.position_x);
  const y = Number(req.body?.position_y);
  const valid = (n) => Number.isInteger(n) && n >= 0 && n <= MAX_COORD;
  if (!valid(x) || !valid(y)) {
    return res.status(400).json({ error: 'Position must be whole numbers on the board' });
  }
  try {
    const { rows } = await pool.query(
      `UPDATE director_notes SET position_x = $1, position_y = $2
       WHERE id = $3 AND location_id = $4
       RETURNING id, position_x, position_y`,
      [x, y, req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Note not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error moving director note:', err);
    res.status(500).json({ error: 'Failed to move note' });
  }
});

// DELETE /api/director-notes/:id — remove (author or admin only)
router.delete('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      'SELECT created_by FROM director_notes WHERE id = $1 AND location_id = $2',
      [req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Note not found' });
    if (req.session.role !== 'admin' && rows[0].created_by !== req.session.userId) {
      return res.status(403).json({ error: 'Only the author can delete this note' });
    }
    await pool.query('DELETE FROM director_notes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting director note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;
