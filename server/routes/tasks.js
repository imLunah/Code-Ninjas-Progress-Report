const express = require('express');
const router = express.Router();
const { requireManager, requireOwnLocation } = require('../middleware/auth');

const MAX_BODY = 2000;
const MAX_TITLE = 200;
// Matches the CHECK on the column.
const MAX_ORDER = 10000;

// Columns. Matches director_notes_status_check, so a bad value is refused here
// rather than surfacing as a constraint violation from the driver.
const STATUSES = ['todo', 'doing', 'done'];

// What kind of work a task is.
const CATEGORIES = ['cancellation', 'reenrollment', 'print', 'other'];

// Center task board — center-scoped, visible to all CDs/admin at the location.
// Not shown to senseis or parents (this route is manager-gated).
//
// The table is still called director_notes because it started life as the
// sticky board and production is, right now, a deployment that still reads it
// under that name. Renaming it would take the live site down mid-deploy. The
// rename belongs in the same change that ships this to main, along with
// dropping the `color` and `board` columns, which nothing here writes any more.

const SELECT = `
  SELECT n.id, n.title, n.body, n.status, n.category, n.sort_order,
         n.created_by, n.created_at, n.updated_at, n.completed_at,
         u.display_name AS created_by_name
  FROM director_notes n
  LEFT JOIN users u ON u.id = n.created_by
`;

// A card is its title, or its body if it came from the old sticky wall and
// never had one. Neither board can hold a card with nothing on it at all.
// Mirrors director_notes_has_content_check.
function readContent(raw) {
  const title = typeof raw?.title === 'string' ? raw.title.trim() : '';
  const body = typeof raw?.body === 'string' ? raw.body.trim() : '';
  if (!title && !body) return { error: 'Give it a name or some text' };
  if (title.length > MAX_TITLE) return { error: `Title max ${MAX_TITLE} characters` };
  if (body.length > MAX_BODY) return { error: `Text max ${MAX_BODY} characters` };
  return { title: title || null, body: body || null };
}

// GET /api/tasks — every task at the active location
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
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks — add a task at the active location
router.post('/', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const content = readContent(req.body);
  if (content.error) return res.status(400).json({ error: content.error });

  const safeStatus = STATUSES.includes(req.body?.status) ? req.body.status : 'todo';
  const safeCategory = CATEGORIES.includes(req.body?.category) ? req.body.category : 'other';
  try {
    const { rows } = await pool.query(`
      INSERT INTO director_notes (location_id, title, body, status, category, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [
      req.session.activeLocationId, content.title, content.body,
      safeStatus, safeCategory, req.session.userId,
    ]);
    const { rows: created } = await pool.query(`${SELECT} WHERE n.id = $1`, [rows[0].id]);
    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/tasks/reorder — store the board arrangement.
// MUST stay above PATCH /:id or Express matches 'reorder' as an id.
//
// Takes the whole board as columns: [{ status, ids }]. A card moving from To do
// to Done is the same operation as a card moving up its own column, so the
// board sends one payload for both rather than a move endpoint and a sort
// endpoint that could disagree with each other.
//
// Deliberately NOT author-gated like edit/delete: the board is shared, so any
// director at the center can tidy it or move a card along. Only position and
// column are written, never text.
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
      return res.status(400).json({ error: 'Unknown column' });
    }
    const ids = Array.isArray(lane.ids) ? lane.ids.map(Number) : null;
    if (!ids || ids.length > MAX_ORDER) {
      return res.status(400).json({ error: 'A list of task ids is required' });
    }
    if (ids.some((n) => !Number.isInteger(n) || n < 1)) {
      return res.status(400).json({ error: 'Task ids must be whole numbers' });
    }
    // Across the whole board, not per column: the same card appearing twice
    // would leave its final position down to which group was written last.
    for (const id of ids) {
      if (seen.has(id)) return res.status(400).json({ error: 'Task ids must be unique' });
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
             -- Finished-on is stamped by whatever puts the card in Done, and
             -- cleared when it comes back out, so the date never outlives the
             -- column it belongs to.
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
    console.error('Error reordering tasks:', err);
    res.status(500).json({ error: 'Failed to save the arrangement' });
  } finally {
    client.release();
  }
});

// PATCH /api/tasks/:id — edit (author or admin only)
router.patch('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const content = readContent(req.body);
  if (content.error) return res.status(400).json({ error: content.error });

  const category = req.body?.category === undefined
    ? null
    : CATEGORIES.includes(req.body.category) ? req.body.category : null;
  if (req.body?.category !== undefined && category === null) {
    return res.status(400).json({ error: 'Unknown category' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT created_by FROM director_notes WHERE id = $1 AND location_id = $2',
      [req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    if (req.session.role !== 'admin' && rows[0].created_by !== req.session.userId) {
      return res.status(403).json({ error: 'Only the author can edit this task' });
    }
    await pool.query(
      `UPDATE director_notes
       SET title = $1, body = $2, category = COALESCE($3, category), updated_at = now()
       WHERE id = $4`,
      [content.title, content.body, category, req.params.id],
    );
    const { rows: updated } = await pool.query(`${SELECT} WHERE n.id = $1`, [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id — remove (author or admin only)
router.delete('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      'SELECT created_by FROM director_notes WHERE id = $1 AND location_id = $2',
      [req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    if (req.session.role !== 'admin' && rows[0].created_by !== req.session.userId) {
      return res.status(403).json({ error: 'Only the author can delete this task' });
    }
    await pool.query('DELETE FROM director_notes WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
