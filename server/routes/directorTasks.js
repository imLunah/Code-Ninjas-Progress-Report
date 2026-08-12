const express = require('express');
const router = express.Router();
const { requireManager, requireOwnLocation } = require('../middleware/auth');

// Center Director task board. One shared board per location: every director at
// a center sees and edits the same cards, same model as StaffAnnouncements.
// Senseis never reach this — every route is requireManager, and writes add
// requireOwnLocation so a director browsing another center gets it read-only.

const COLUMNS = ['todo', 'doing', 'review', 'done'];
const COLORS = ['none', 'blue', 'amber', 'green', 'purple', 'red'];

const TITLE_MAX = 200;
// Bodies are freeform markdown. The cap is a denial-of-service guard, not a
// content rule — same reasoning as the 2000-char cap on pinned notes.
const BODY_MAX = 4000;

// A checklist is a handful of sub-steps, not a second task list. The cap is
// what stops a card becoming a project, and it matches the CHECK on the column.
const CHECKLIST_MAX = 20;
const CHECKLIST_TEXT_MAX = 200;

const SELECT = `
  SELECT t.id, t.title, t.body, t.column_key, t.color, t.position,
         to_char(t.due_date, 'YYYY-MM-DD') AS due_date,
         t.assignee_id, t.assignee_center, t.checklist, t.archived_at,
         t.created_at, t.updated_at,
         u.display_name AS created_by_name,
         a.display_name AS assignee_name,
         l.name AS location_name
  FROM director_tasks t
  LEFT JOIN users u ON u.id = t.created_by
  LEFT JOIN users a ON a.id = t.assignee_id
  LEFT JOIN locations l ON l.id = t.location_id
`;

// Directors of this center, by membership rather than home center, so someone
// covering two locations appears on both boards. Admins are included because
// acting anywhere is the whole point of the role.
const ASSIGNEE_SELECT = `
  SELECT u.id, u.display_name
  FROM users u
  WHERE u.active = true
    AND u.role IN ('manager', 'admin')
    AND u.id IN (SELECT user_id FROM user_locations WHERE location_id = $1)
  ORDER BY u.display_name ASC
`;

// Who is carrying a card: nobody, the center, or one director. The three are
// exclusive, and the server decides which it is rather than trusting two fields
// to agree — the DB carries the same rule as a CHECK.
//
// Absent means "leave it alone". A named director has to be one who is actually
// at this center: without that check the board would be a way to write a row
// naming any user in the system and read their display name back out of it.
async function readAssignee(pool, body, locationId) {
  const rawId = body?.assignee_id;
  const center = body?.assignee_center;
  if (rawId === undefined && center === undefined) return { skip: true };
  if (center === true) return { id: null, center: true };
  if (rawId === null || rawId === undefined || rawId === '') return { id: null, center: false };

  const id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) return { error: 'Unknown director' };
  const { rows } = await pool.query(
    `SELECT 1 FROM users u
     WHERE u.id = $1 AND u.active = true AND u.role IN ('manager', 'admin')
       AND u.id IN (SELECT user_id FROM user_locations WHERE location_id = $2)`,
    [id, locationId]
  );
  if (!rows[0]) return { error: 'That director is not at this center' };
  return { id, center: false };
}

// pg serializes a DATE as UTC midnight, which a browser in a negative offset
// reads as the day before. to_char keeps it a plain calendar string all the way
// to the card, which is the same fix club session dates needed.

function validate(body) {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length > TITLE_MAX) return { error: `Title max ${TITLE_MAX} characters` };

  const note = body.body;
  if (note != null && typeof note !== 'string') return { error: 'Invalid note' };
  if (note && note.length > BODY_MAX) return { error: `Note max ${BODY_MAX} characters` };

  // A card must say something, but it chooses whether that is a title or a
  // body. Everything carried over from the sticky wall is a paragraph with no
  // title, and demanding one would have made those cards unsaveable the moment
  // anyone opened them. Mirrors the has_content CHECK on the table.
  if (!title && !note?.trim()) return { error: 'Give the task a title or a note' };

  const column_key = body.column_key ?? 'todo';
  if (!COLUMNS.includes(column_key)) return { error: 'Invalid column' };

  const color = body.color ?? 'none';
  if (!COLORS.includes(color)) return { error: 'Invalid color' };

  // Absent means "leave it alone"; anything present has to be the real shape.
  // Stored as jsonb, so a bad array would land in the database as-is and come
  // back to the card as a crash rather than a 400.
  let checklist;
  if (body.checklist !== undefined) {
    if (!Array.isArray(body.checklist)) return { error: 'Invalid checklist' };
    if (body.checklist.length > CHECKLIST_MAX) return { error: `A card can hold ${CHECKLIST_MAX} checklist items` };
    checklist = [];
    for (const item of body.checklist) {
      const text = typeof item?.text === 'string' ? item.text.trim() : '';
      if (!text) continue; // a blank row is somebody mid-typing, not an item
      if (text.length > CHECKLIST_TEXT_MAX) return { error: `Checklist item max ${CHECKLIST_TEXT_MAX} characters` };
      checklist.push({ text, done: item.done === true });
    }
  }

  // Empty string comes back from a cleared <input type="date">; both it and an
  // absent field mean "no due date".
  const due = body.due_date;
  if (due != null && due !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    return { error: 'Invalid due date' };
  }

  return {
    title: title || null,
    body: note?.trim() || null,
    column_key,
    color,
    due_date: due || null,
    checklist,
  };
}

// GET /api/director-tasks/assignees — the directors a card can be handed to.
// Above every /:id route, or Express reads 'assignees' as an id.
router.get('/assignees', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(ASSIGNEE_SELECT, [req.session.activeLocationId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching assignees:', err);
    res.status(500).json({ error: 'Failed to fetch directors' });
  }
});

// GET /api/director-tasks — the whole live board for the active location.
// ?archived=true returns what has been cleared off it instead, newest first,
// which is a different question and a different order: an archived card has no
// place on a board, only a date it left one.
router.get('/', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  const archived = req.query.archived === 'true';
  try {
    const { rows } = await pool.query(
      `${SELECT} WHERE t.location_id = $1 AND t.archived_at IS ${archived ? 'NOT NULL' : 'NULL'}
       ORDER BY ${archived ? 't.archived_at DESC' : 't.position ASC'}, t.id ASC`,
      [req.session.activeLocationId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// POST /api/director-tasks — new card, appended to the end of its column.
router.post('/', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const fields = validate(req.body);
  if (fields.error) return res.status(400).json({ error: fields.error });

  try {
    const assignee = await readAssignee(pool, req.body, req.session.activeLocationId);
    if (assignee.error) return res.status(400).json({ error: assignee.error });

    const { rows } = await pool.query(
      `INSERT INTO director_tasks
         (location_id, title, body, column_key, color, due_date, assignee_id, assignee_center, checklist, position, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb,
         COALESCE((SELECT MAX(position) + 1 FROM director_tasks
                   WHERE location_id = $1 AND column_key = $4 AND archived_at IS NULL), 0),
         $10)
       RETURNING id`,
      [
        req.session.activeLocationId,
        fields.title,
        fields.body,
        fields.column_key,
        fields.color,
        fields.due_date,
        assignee.skip ? null : assignee.id,
        assignee.skip ? false : assignee.center,
        JSON.stringify(fields.checklist ?? []),
        req.session.userId,
      ]
    );
    // Re-read through SELECT so the response carries created_by_name and the
    // to_char'd date, exactly like the list endpoint.
    const { rows: full } = await pool.query(`${SELECT} WHERE t.id = $1`, [rows[0].id]);
    res.status(201).json(full[0]);
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// POST /api/director-tasks/archive-done — clear the finished column.
//
// One statement rather than one PATCH per card: a dropped connection halfway
// through a fan-out leaves a board half-cleared, and there is no reason for the
// client to enumerate rows the server can select for itself. MUST stay above
// the /:id routes, or Express reads 'archive-done' as an id.
router.post('/archive-done', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      `UPDATE director_tasks SET archived_at = now(), updated_at = now()
       WHERE location_id = $1 AND column_key = 'done' AND archived_at IS NULL
       RETURNING id`,
      [req.session.activeLocationId]
    );
    res.json({ archived: rows.map((r) => r.id) });
  } catch (err) {
    console.error('Error clearing finished tasks:', err);
    res.status(500).json({ error: 'Failed to clear finished tasks' });
  }
});

// POST /api/director-tasks/:id/archive — take a card off the board.
// Not a delete: the work happened, and a center's record of what it did should
// not depend on nobody having tidied up. location_id in the WHERE is the
// authorization, same as every other write here.
router.post('/:id/archive', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      `UPDATE director_tasks SET archived_at = now(), updated_at = now()
       WHERE id = $1 AND location_id = $2 AND archived_at IS NULL
       RETURNING id`,
      [req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error archiving task:', err);
    res.status(500).json({ error: 'Failed to archive task' });
  }
});

// POST /api/director-tasks/:id/restore — put it back, at the end of whichever
// column it left from. Its old position belonged to a board that has moved on.
router.post('/:id/restore', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      `UPDATE director_tasks t
       SET archived_at = NULL, updated_at = now(),
           position = COALESCE((SELECT MAX(d.position) + 1 FROM director_tasks d
                                WHERE d.location_id = t.location_id
                                  AND d.column_key = t.column_key
                                  AND d.archived_at IS NULL), 0)
       WHERE t.id = $1 AND t.location_id = $2 AND t.archived_at IS NOT NULL
       RETURNING t.id`,
      [req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    const { rows: full } = await pool.query(`${SELECT} WHERE t.id = $1`, [rows[0].id]);
    res.json(full[0]);
  } catch (err) {
    console.error('Error restoring task:', err);
    res.status(500).json({ error: 'Failed to restore task' });
  }
});

// PATCH /api/director-tasks/reorder — persist a drag.
//
// MUST stay above PATCH /:id. Express matches the literal segment as an id, so
// declared after it this route is simply unreachable — the same trap that
// /students/birthdays and the old /director-notes/reorder had to dodge.
//
// Takes the full board as [{ id, column_key, position }]. The client already
// knows the arrangement it just drew; sending it whole means a dropped card and
// the cards that shifted under it commit in one transaction rather than as a
// burst of PATCHes that can half-apply.
router.patch('/reorder', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { items } = req.body;

  if (!Array.isArray(items)) return res.status(400).json({ error: 'items must be an array' });
  if (items.length > 500) return res.status(400).json({ error: 'Too many items' });
  for (const it of items) {
    if (!Number.isInteger(it?.id)) return res.status(400).json({ error: 'Invalid id' });
    if (!COLUMNS.includes(it?.column_key)) return res.status(400).json({ error: 'Invalid column' });
    if (!Number.isInteger(it?.position)) return res.status(400).json({ error: 'Invalid position' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const it of items) {
      // location_id in the WHERE is the authorization: ids from another center
      // match nothing and update nothing, so a forged payload can't reshuffle a
      // board the caller can't see.
      await client.query(
        `UPDATE director_tasks
         SET column_key = $1, position = $2, updated_at = now()
         WHERE id = $3 AND location_id = $4`,
        [it.column_key, it.position, it.id, req.session.activeLocationId]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error reordering tasks:', err);
    res.status(500).json({ error: 'Failed to reorder tasks' });
  } finally {
    client.release();
  }
});

// PATCH /api/director-tasks/:id — edit a card.
// Deliberately NOT author-gated. The board belongs to the center, not to
// whoever typed the card, so any director on shift can move a task along.
router.patch('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const fields = validate(req.body);
  if (fields.error) return res.status(400).json({ error: fields.error });

  try {
    const assignee = await readAssignee(pool, req.body, req.session.activeLocationId);
    if (assignee.error) return res.status(400).json({ error: assignee.error });

    // The editor can move a card between columns, and a card carrying its old
    // rank into a new column lands at an arbitrary spot among cards that never
    // moved. Changing column re-ranks to the end of the destination; staying
    // put keeps the rank a drag gave it. In an UPDATE, the column references on
    // the right of SET still read the OLD row, so this is one atomic statement
    // rather than a read-then-write that another director could interleave.
    const { rows } = await pool.query(
      `UPDATE director_tasks t
       SET title = $1, body = $2, column_key = $3, color = $4, due_date = $5,
           assignee_id = CASE WHEN $6::boolean THEN t.assignee_id ELSE $7 END,
           assignee_center = CASE WHEN $6::boolean THEN t.assignee_center ELSE $10 END,
           checklist = COALESCE($11::jsonb, t.checklist),
           position = CASE
             WHEN t.column_key = $3 THEN t.position
             ELSE COALESCE((SELECT MAX(d.position) + 1 FROM director_tasks d
                            WHERE d.location_id = t.location_id AND d.column_key = $3
                              AND d.archived_at IS NULL), 0)
           END,
           updated_at = now()
       WHERE t.id = $8 AND t.location_id = $9
       RETURNING id`,
      [
        fields.title,
        fields.body,
        fields.column_key,
        fields.color,
        fields.due_date,
        !!assignee.skip,
        assignee.skip ? null : assignee.id,
        req.params.id,
        req.session.activeLocationId,
        assignee.skip ? false : assignee.center,
        fields.checklist === undefined ? null : JSON.stringify(fields.checklist),
      ]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    const { rows: full } = await pool.query(`${SELECT} WHERE t.id = $1`, [rows[0].id]);
    res.json(full[0]);
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// DELETE /api/director-tasks/:id
router.delete('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      'DELETE FROM director_tasks WHERE id = $1 AND location_id = $2 RETURNING id',
      [req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = router;
