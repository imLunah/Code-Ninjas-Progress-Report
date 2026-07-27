const express = require('express');
const router = express.Router();
const { requireManager, requireOwnLocation } = require('../middleware/auth');

const COLORS = ['yellow', 'blue', 'green', 'pink', 'purple'];
const MAX_BODY = 2000;
// Matches the CHECK on the column.
const MAX_ORDER = 10000;

// Sticky notes for Center Directors — center-scoped, visible to all CDs/admin at
// the location. Not shown to senseis or parents (this route is manager-gated).

// GET /api/director-notes — notes for the active location
router.get('/', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT n.id, n.body, n.color, n.sort_order,
             n.created_by, n.created_at, n.updated_at,
             u.display_name AS created_by_name
      FROM director_notes n
      LEFT JOIN users u ON u.id = n.created_by
      WHERE n.location_id = $1
      ORDER BY n.sort_order ASC NULLS FIRST, n.created_at DESC
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
      RETURNING id, body, color, sort_order, created_by, created_at, updated_at
    `, [req.session.activeLocationId, body.trim(), safeColor, req.session.userId]);
    const { rows: named } = await pool.query('SELECT display_name FROM users WHERE id = $1', [req.session.userId]);
    res.status(201).json({ ...rows[0], created_by_name: named[0]?.display_name ?? null });
  } catch (err) {
    console.error('Error creating director note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PATCH /api/director-notes/reorder — store the board arrangement.
// MUST stay above PATCH /:id or Express matches 'reorder' as an id.
// Deliberately NOT author-gated like edit/delete: the board is shared, so any
// director at the center can tidy it. Only the ordering is written, never text.
router.patch('/reorder', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_ORDER) {
    return res.status(400).json({ error: 'A list of note ids is required' });
  }
  const clean = ids.map(Number);
  if (clean.some((n) => !Number.isInteger(n) || n < 1)) {
    return res.status(400).json({ error: 'Note ids must be whole numbers' });
  }
  if (new Set(clean).size !== clean.length) {
    return res.status(400).json({ error: 'Note ids must be unique' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Location-scoped: ids from another center simply match no rows.
    await client.query(
      `UPDATE director_notes AS n
       SET sort_order = v.position
       FROM unnest($1::int[]) WITH ORDINALITY AS v(id, position)
       WHERE n.id = v.id AND n.location_id = $2`,
      [clean, req.session.activeLocationId]
    );
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error reordering director notes:', err);
    res.status(500).json({ error: 'Failed to save the arrangement' });
  } finally {
    client.release();
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
      RETURNING id, body, color, sort_order, created_by, created_at, updated_at
    `, [body.trim(), safeColor, req.params.id]);
    const { rows: named } = await pool.query('SELECT display_name FROM users WHERE id = $1', [updated[0].created_by]);
    res.json({ ...updated[0], created_by_name: named[0]?.display_name ?? null });
  } catch (err) {
    console.error('Error updating director note:', err);
    res.status(500).json({ error: 'Failed to update note' });
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
