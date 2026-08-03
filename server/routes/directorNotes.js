const express = require('express');
const router = express.Router();
const { requireManager, requireOwnLocation } = require('../middleware/auth');

const COLORS = ['yellow', 'blue', 'green', 'pink', 'purple'];
const MAX_BODY = 2000;
// Matches the CHECK on the column.
const MAX_ORDER = 10000;

// Lanes. Matches director_notes_status_check, so a bad value is refused here
// rather than surfacing as a constraint violation from the driver.
const STATUSES = ['todo', 'doing', 'done'];

// Sticky notes for Center Directors — center-scoped, visible to all CDs/admin at
// the location. Not shown to senseis or parents (this route is manager-gated).
//
// A note carries a lane as well as a colour, so this one board is both the
// reminder wall and the center's task board. Nothing about that is a second
// kind of record: the "task" is a note that happens to be sitting in To do.

const SELECT = `
  SELECT n.id, n.body, n.color, n.status, n.sort_order,
         n.created_by, n.created_at, n.updated_at, n.completed_at,
         u.display_name AS created_by_name
  FROM director_notes n
  LEFT JOIN users u ON u.id = n.created_by
`;

// GET /api/director-notes — notes for the active location
router.get('/', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      `${SELECT} WHERE n.location_id = $1
       ORDER BY n.sort_order ASC NULLS FIRST, n.created_at DESC`,
      [req.session.activeLocationId],
    );
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
  const safeStatus = STATUSES.includes(req.body?.status) ? req.body.status : 'todo';
  try {
    const { rows } = await pool.query(`
      INSERT INTO director_notes (location_id, body, color, status, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `, [req.session.activeLocationId, body.trim(), safeColor, safeStatus, req.session.userId]);
    const { rows: created } = await pool.query(`${SELECT} WHERE n.id = $1`, [rows[0].id]);
    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error creating director note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// PATCH /api/director-notes/reorder — store the board arrangement.
// MUST stay above PATCH /:id or Express matches 'reorder' as an id.
//
// Takes the whole board as lanes: [{ status, ids }]. A note moving from To do
// to Done is the same operation as a note moving up its own lane, so the board
// sends one payload for both rather than a move endpoint and a sort endpoint
// that could disagree with each other.
//
// Deliberately NOT author-gated like edit/delete: the board is shared, so any
// director at the center can tidy it or move a card along. Only position and
// lane are written, never text.
router.patch('/reorder', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const lanes = req.body?.lanes;

  if (!Array.isArray(lanes) || lanes.length === 0 || lanes.length > STATUSES.length) {
    return res.status(400).json({ error: 'The board arrangement is required' });
  }

  const clean = [];
  const seen = new Set();
  for (const lane of lanes) {
    if (!STATUSES.includes(lane?.status)) {
      return res.status(400).json({ error: 'Unknown lane' });
    }
    const ids = Array.isArray(lane.ids) ? lane.ids.map(Number) : null;
    if (!ids || ids.length > MAX_ORDER) {
      return res.status(400).json({ error: 'A list of note ids is required' });
    }
    if (ids.some((n) => !Number.isInteger(n) || n < 1)) {
      return res.status(400).json({ error: 'Note ids must be whole numbers' });
    }
    // Across the whole board, not per lane: the same note appearing in two
    // lanes would leave its final position down to which one was written last.
    for (const id of ids) {
      if (seen.has(id)) return res.status(400).json({ error: 'Note ids must be unique' });
      seen.add(id);
    }
    clean.push({ status: lane.status, ids });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const lane of clean) {
      if (lane.ids.length === 0) continue;
      // Location-scoped: ids from another center simply match no rows.
      await client.query(
        `UPDATE director_notes AS n
         SET sort_order = v.position,
             status = $3,
             -- Finished-on is stamped by whatever puts the note in Done, and
             -- cleared when it comes back out, so the date never outlives the
             -- lane it belongs to.
             completed_at = CASE WHEN $3 = 'done' THEN COALESCE(n.completed_at, now()) END
         FROM unnest($1::int[]) WITH ORDINALITY AS v(id, position)
         WHERE n.id = v.id AND n.location_id = $2`,
        [lane.ids, req.session.activeLocationId, lane.status],
      );
    }
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
    await pool.query(
      'UPDATE director_notes SET body = $1, color = $2, updated_at = now() WHERE id = $3',
      [body.trim(), safeColor, req.params.id],
    );
    const { rows: updated } = await pool.query(`${SELECT} WHERE n.id = $1`, [req.params.id]);
    res.json(updated[0]);
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
