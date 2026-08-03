const express = require('express');
const router = express.Router();
const { requireManager, requireOwnLocation } = require('../middleware/auth');

// Center task board — cancellations, re-enrollments, print requests and
// anything else a director is carrying. Center-scoped and manager-gated: a
// cancellation carries family context that instructors have no reason to see.
//
// Unlike the sticky notes board, edits are NOT author-gated. Notes are personal
// jottings that happen to be visible to the others; a task is shared work, and
// a director who cannot move a colleague's task the day they are off is a board
// nobody trusts. Every write is still requireOwnLocation, so this only ever
// means directors of the same center.

// Kept in step with the CHECK constraints on the columns. A value outside these
// lists is rejected here so the DB error never surfaces as a 500.
const STATUSES = ['todo', 'doing', 'done'];
const CATEGORIES = ['cancellation', 'reenrollment', 'print', 'other'];

const MAX_TITLE = 200;
const MAX_BODY = 4000;

const SELECT = `
  SELECT t.id, t.title, t.body, t.status, t.category, t.student_id,
         t.sort_order, t.created_by, t.created_at, t.updated_at, t.completed_at,
         u.display_name AS created_by_name,
         s.full_name    AS student_name
  FROM tasks t
  LEFT JOIN users u    ON u.id = t.created_by
  LEFT JOIN students s ON s.id = t.student_id
`;

// Newest first within a column. sort_order is written by nothing yet: the board
// has no drag, so the column is chronological. The column exists so adding drag
// later doesn't need a migration, and NULLS LAST keeps unordered rows behind
// anything that ever does get a position.
const ORDER = 'ORDER BY t.sort_order ASC NULLS LAST, t.created_at DESC';

function readTitle(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return { error: 'A title is required' };
  }
  if (value.trim().length > MAX_TITLE) {
    return { error: `Title max ${MAX_TITLE} characters` };
  }
  return { value: value.trim() };
}

function readBody(value) {
  if (value === undefined || value === null || value === '') return { value: null };
  if (typeof value !== 'string') return { error: 'Details must be text' };
  if (value.length > MAX_BODY) return { error: `Details max ${MAX_BODY} characters` };
  return { value: value.trim() || null };
}

// A task can name a ninja, but only one enrolled at this center — otherwise the
// board becomes a way to read names off another location.
async function readStudent(pool, value, locationId) {
  if (value === undefined || value === null || value === '') return { value: null };
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) return { error: 'Unknown ninja' };
  const { rows } = await pool.query(
    'SELECT 1 FROM students WHERE id = $1 AND location_id = $2',
    [id, locationId],
  );
  if (!rows[0]) return { error: 'That ninja is not at this center' };
  return { value: id };
}

// GET /api/tasks — every task at the active location
router.get('/', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      `${SELECT} WHERE t.location_id = $1 ${ORDER}`,
      [req.session.activeLocationId],
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks — add a task to the active location
router.post('/', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const locationId = req.session.activeLocationId;

  const title = readTitle(req.body?.title);
  if (title.error) return res.status(400).json({ error: title.error });
  const body = readBody(req.body?.body);
  if (body.error) return res.status(400).json({ error: body.error });

  const status = STATUSES.includes(req.body?.status) ? req.body.status : 'todo';
  const category = CATEGORIES.includes(req.body?.category) ? req.body.category : 'other';

  try {
    const student = await readStudent(pool, req.body?.student_id, locationId);
    if (student.error) return res.status(400).json({ error: student.error });

    const { rows } = await pool.query(`
      INSERT INTO tasks (location_id, title, body, status, category, student_id, created_by, completed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CASE WHEN $4 = 'done' THEN now() END)
      RETURNING id
    `, [locationId, title.value, body.value, status, category, student.value, req.session.userId]);

    const { rows: created } = await pool.query(`${SELECT} WHERE t.id = $1`, [rows[0].id]);
    res.status(201).json(created[0]);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// PATCH /api/tasks/:id — edit or move a task.
// Every field is optional: the board sends only status when a card moves
// columns, and the edit form sends the rest.
router.patch('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const locationId = req.session.activeLocationId;

  const sets = [];
  const params = [];
  const set = (sql, value) => { params.push(value); sets.push(`${sql} = $${params.length}`); };

  if (req.body?.title !== undefined) {
    const title = readTitle(req.body.title);
    if (title.error) return res.status(400).json({ error: title.error });
    set('title', title.value);
  }
  if (req.body?.body !== undefined) {
    const body = readBody(req.body.body);
    if (body.error) return res.status(400).json({ error: body.error });
    set('body', body.value);
  }
  if (req.body?.category !== undefined) {
    if (!CATEGORIES.includes(req.body.category)) {
      return res.status(400).json({ error: 'Unknown category' });
    }
    set('category', req.body.category);
  }
  if (req.body?.status !== undefined) {
    if (!STATUSES.includes(req.body.status)) {
      return res.status(400).json({ error: 'Unknown status' });
    }
    set('status', req.body.status);
    // Stamped here rather than left to the client so "finished on" is the
    // moment the board recorded it, and pulling a task back out of Done clears
    // it instead of leaving a date on unfinished work.
    sets.push(req.body.status === 'done' ? 'completed_at = COALESCE(completed_at, now())' : 'completed_at = NULL');
  }

  try {
    if (req.body?.student_id !== undefined) {
      const student = await readStudent(pool, req.body.student_id, locationId);
      if (student.error) return res.status(400).json({ error: student.error });
      set('student_id', student.value);
    }
    if (sets.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    params.push(req.params.id, locationId);
    const { rows } = await pool.query(
      `UPDATE tasks SET ${sets.join(', ')}, updated_at = now()
       WHERE id = $${params.length - 1} AND location_id = $${params.length}
       RETURNING id`,
      params,
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });

    const { rows: updated } = await pool.query(`${SELECT} WHERE t.id = $1`, [rows[0].id]);
    res.json(updated[0]);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/tasks/:id — remove a task
router.delete('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND location_id = $2',
      [req.params.id, req.session.activeLocationId],
    );
    if (!rowCount) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
