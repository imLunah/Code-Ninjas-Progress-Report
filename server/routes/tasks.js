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

// What kind of work a task is. Taken from the Operations Tracker rather than
// invented, because those are the words the work is already called.
const CATEGORIES = ['follow_up', 'resume_hold', 'cancel', 'submit_invoice', 'print', 'other'];

// The invoice payload, kept 1:1 in task_invoices. Text fields are capped by the
// CHECKs on the columns; these are the ones this route writes.
const INVOICE_TEXT = ['rc_name', 'payment_processor', 'service_coordinator', 'program'];

// Center task board — center-scoped, visible to all CDs/admin at the location.
// Not shown to senseis or parents (this route is manager-gated).
//
// The table is still called director_notes because it started life as the
// sticky board and production is, right now, a deployment that still reads it
// under that name. Renaming it would take the live site down mid-deploy. The
// rename belongs in the same change that ships this to main, along with
// dropping the `color` and `board` columns, which nothing here writes any more.

// to_char, not the raw DATE: pg hands a DATE back as a JS Date, which
// serialises to a UTC-midnight ISO string and lands on the previous day for
// anyone west of Greenwich. A due date has no time in it, so it travels as the
// string it is.
// The invoice arrives as a nested object rather than eight more top-level
// fields, so a follow-up card is never a row with eight nulls in it. NULL when
// the task has no invoice attached.
const SELECT = `
  SELECT n.id, n.title, n.body, n.status, n.category, n.sort_order,
         to_char(n.due_date, 'YYYY-MM-DD') AS due_date,
         n.assignee_id, n.student_id, n.created_by, n.created_at, n.updated_at, n.completed_at,
         u.display_name AS created_by_name,
         a.display_name AS assignee_name,
         s.full_name    AS student_name,
         CASE WHEN i.task_id IS NULL THEN NULL ELSE jsonb_build_object(
           'rc_name', i.rc_name,
           'payment_processor', i.payment_processor,
           'service_coordinator', i.service_coordinator,
           'program', i.program,
           'service_month', i.service_month,
           'service_year', i.service_year,
           'order_received', to_char(i.order_received, 'YYYY-MM-DD'),
           'amount', i.amount
         ) END AS invoice
  FROM director_notes n
  LEFT JOIN users u        ON u.id = n.created_by
  LEFT JOIN users a        ON a.id = n.assignee_id
  LEFT JOIN students s     ON s.id = n.student_id
  LEFT JOIN task_invoices i ON i.task_id = n.id
`;

// Directors of this center, from membership rather than home center: a director
// covering a second location belongs on its board too. Admins are included
// because they can act anywhere, which is the whole point of the role.
const ASSIGNEE_SELECT = `
  SELECT u.id, u.display_name
  FROM users u
  WHERE u.active = true
    AND u.role IN ('manager', 'admin')
    AND u.id IN (SELECT user_id FROM user_locations WHERE location_id = $1)
  ORDER BY u.display_name ASC
`;

// Optional, and clearable: undefined means "leave it alone", empty means "take
// it off". Anything else has to be a real calendar date, so a typo lands as a
// 400 rather than as a card that is quietly overdue forever.
function readDueDate(raw) {
  if (raw === undefined) return { skip: true };
  if (raw === null || raw === '') return { value: null };
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return { error: 'Due date must be a date' };
  }
  const [y, m, d] = raw.split('-').map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (probe.getUTCFullYear() !== y || probe.getUTCMonth() !== m - 1 || probe.getUTCDate() !== d) {
    return { error: 'That date does not exist' };
  }
  return { value: raw };
}

// Same shape as the assignee check, same reason: a task naming a ninja can
// only name one enrolled at this center, or the board becomes a way to read
// names off another location.
async function readStudent(pool, raw, locationId) {
  if (raw === undefined) return { skip: true };
  if (raw === null || raw === '') return { value: null };
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) return { error: 'Unknown ninja' };
  const { rows } = await pool.query(
    'SELECT 1 FROM students WHERE id = $1 AND location_id = $2',
    [id, locationId],
  );
  if (!rows[0]) return { error: 'That ninja is not at this center' };
  return { value: id };
}

// The invoice block. Absent means "leave it alone"; null means "this is not an
// invoice any more, drop it". Every field inside is optional: a claim gets
// filled in over days, and a form that refuses to save half of one is a form
// people keep in a spreadsheet instead.
function readInvoice(raw) {
  if (raw === undefined) return { skip: true };
  if (raw === null) return { value: null };
  if (typeof raw !== 'object') return { error: 'Invoice details are not readable' };

  const out = {};
  for (const key of INVOICE_TEXT) {
    const v = raw[key];
    if (v === undefined || v === null || v === '') { out[key] = null; continue; }
    if (typeof v !== 'string') return { error: 'Invoice details must be text' };
    if (v.trim().length > 120) return { error: 'Invoice details are too long' };
    out[key] = v.trim() || null;
  }

  const num = (v, min, max, label) => {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < min || n > max) throw new Error(label);
    return n;
  };
  try {
    out.service_month = num(raw.service_month, 1, 12, 'Month of service must be 1 to 12');
    out.service_year = num(raw.service_year, 2000, 2100, 'Year of service looks wrong');
    out.amount = num(raw.amount, 0, 10_000_000, 'Amount must be a positive number');
  } catch (err) {
    return { error: err.message };
  }
  if (out.service_month !== null) out.service_month = Math.trunc(out.service_month);
  if (out.service_year !== null) out.service_year = Math.trunc(out.service_year);

  const received = readDueDate(raw.order_received);
  if (received.error) return { error: 'Order received must be a date' };
  out.order_received = received.skip ? null : received.value;

  return { value: out };
}

async function writeInvoice(client, taskId, invoice) {
  if (invoice === null) {
    await client.query('DELETE FROM task_invoices WHERE task_id = $1', [taskId]);
    return;
  }
  await client.query(`
    INSERT INTO task_invoices
      (task_id, rc_name, payment_processor, service_coordinator, program,
       service_month, service_year, order_received, amount)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (task_id) DO UPDATE SET
      rc_name = EXCLUDED.rc_name,
      payment_processor = EXCLUDED.payment_processor,
      service_coordinator = EXCLUDED.service_coordinator,
      program = EXCLUDED.program,
      service_month = EXCLUDED.service_month,
      service_year = EXCLUDED.service_year,
      order_received = EXCLUDED.order_received,
      amount = EXCLUDED.amount
  `, [
    taskId, invoice.rc_name, invoice.payment_processor, invoice.service_coordinator,
    invoice.program, invoice.service_month, invoice.service_year,
    invoice.order_received, invoice.amount,
  ]);
}

// A task can only be handed to a director of this center. Without the
// membership check the board would be a way to write a row naming any user in
// the system, and to read their name back out of it.
async function readAssignee(pool, raw, locationId) {
  if (raw === undefined) return { skip: true };
  if (raw === null || raw === '') return { value: null };
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1) return { error: 'Unknown director' };
  const { rows } = await pool.query(
    `SELECT 1 FROM users u
     WHERE u.id = $1 AND u.active = true AND u.role IN ('manager', 'admin')
       AND u.id IN (SELECT user_id FROM user_locations WHERE location_id = $2)`,
    [id, locationId],
  );
  if (!rows[0]) return { error: 'That director is not at this center' };
  return { value: id };
}

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

// GET /api/tasks/assignees — directors a task can be handed to.
// Above any /:id route, or Express matches 'assignees' as an id.
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

// How much of Done a board carries before you have to ask for the rest.
// Nothing ever leaves that column on its own, so without a cutoff the least
// interesting third of the board is also the largest and it only grows.
const DONE_WINDOW_DAYS = 14;

// A finished card with no completed_at predates the column existing. Those are
// the three that came over from the sticky wall; they are treated as recent so
// they don't vanish from a board nobody has archived yet.
const RECENT_DONE = `(
  n.status <> 'done'
  OR n.completed_at IS NULL
  OR n.completed_at >= now() - ($2 || ' days')::interval
)`;

// GET /api/tasks — tasks at the active location.
// ?done=all lifts the Done cutoff. The response carries how many were held
// back, so the board can offer them rather than silently deciding for you.
router.get('/', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  const all = req.query.done === 'all';
  try {
    const [{ rows }, { rows: counted }] = await Promise.all([
      pool.query(
        `${SELECT} WHERE n.location_id = $1 ${all ? '' : `AND ${RECENT_DONE}`}
         ORDER BY n.sort_order ASC NULLS FIRST, n.created_at DESC`,
        all ? [req.session.activeLocationId] : [req.session.activeLocationId, DONE_WINDOW_DAYS],
      ),
      pool.query(
        `SELECT COUNT(*)::int AS hidden FROM director_notes n
         WHERE n.location_id = $1 AND NOT ${RECENT_DONE}`,
        [req.session.activeLocationId, DONE_WINDOW_DAYS],
      ),
    ]);
    res.json({ tasks: rows, hiddenDone: counted[0]?.hidden ?? 0, windowDays: DONE_WINDOW_DAYS });
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

  const due = readDueDate(req.body?.due_date);
  if (due.error) return res.status(400).json({ error: due.error });

  const invoice = readInvoice(req.body?.invoice);
  if (invoice.error) return res.status(400).json({ error: invoice.error });

  const client = await pool.connect();
  try {
    const assignee = await readAssignee(client, req.body?.assignee_id, req.session.activeLocationId);
    if (assignee.error) return res.status(400).json({ error: assignee.error });
    const student = await readStudent(client, req.body?.student_id, req.session.activeLocationId);
    if (student.error) return res.status(400).json({ error: student.error });

    // The card and its invoice land together or not at all: a claim whose task
    // failed to write is a row nothing can reach.
    await client.query('BEGIN');
    const { rows } = await client.query(`
      INSERT INTO director_notes
        (location_id, title, body, status, category, due_date, assignee_id, student_id, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      req.session.activeLocationId, content.title, content.body,
      safeStatus, safeCategory, due.skip ? null : due.value,
      assignee.skip ? null : assignee.value, student.skip ? null : student.value,
      req.session.userId,
    ]);
    if (!invoice.skip && invoice.value) await writeInvoice(client, rows[0].id, invoice.value);
    await client.query('COMMIT');

    const { rows: created } = await client.query(`${SELECT} WHERE n.id = $1`, [rows[0].id]);
    res.status(201).json(created[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  } finally {
    client.release();
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

// PATCH /api/tasks/:id — edit a task.
//
// Rewriting what a card SAYS stays with whoever wrote it (or an admin), same as
// it always has. Who it is FOR and when it is due do not: handing a card to a
// colleague, or taking one off them because they are away, is arrangement, and
// the arrangement has always been shared. A director who cannot reassign a
// card on the day its owner is out is a board that stops being true.
router.patch('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');

  const wantsText = req.body?.title !== undefined || req.body?.body !== undefined
    || req.body?.category !== undefined;

  // title and body are validated as a pair: a card must come out of the edit
  // with something on it, and either field alone can't tell you that.
  const content = wantsText ? readContent(req.body) : null;
  if (content?.error) return res.status(400).json({ error: content.error });

  if (req.body?.category !== undefined && !CATEGORIES.includes(req.body.category)) {
    return res.status(400).json({ error: 'Unknown category' });
  }

  // Status is arrangement, not authorship, so like /reorder it is NOT gated to
  // the author: ticking a colleague's task off is the point of a shared list.
  if (req.body?.status !== undefined && !STATUSES.includes(req.body.status)) {
    return res.status(400).json({ error: 'Unknown status' });
  }

  const due = readDueDate(req.body?.due_date);
  if (due.error) return res.status(400).json({ error: due.error });

  const invoice = readInvoice(req.body?.invoice);
  if (invoice.error) return res.status(400).json({ error: invoice.error });

  const client = await pool.connect();
  try {
    const assignee = await readAssignee(client, req.body?.assignee_id, req.session.activeLocationId);
    if (assignee.error) return res.status(400).json({ error: assignee.error });
    const student = await readStudent(client, req.body?.student_id, req.session.activeLocationId);
    if (student.error) return res.status(400).json({ error: student.error });

    const sets = [];
    const params = [];
    const set = (column, value) => { params.push(value); sets.push(`${column} = $${params.length}`); };

    if (content) {
      set('title', content.title);
      set('body', content.body);
    }
    if (req.body?.category !== undefined) set('category', req.body.category);
    if (req.body?.status !== undefined) {
      params.push(req.body.status);
      sets.push(`status = $${params.length}`);
      // Same stamp-and-clear as /reorder: finished-on belongs to Done and
      // never outlives it.
      sets.push(`completed_at = CASE WHEN $${params.length} = 'done' THEN COALESCE(completed_at, now()) END`);
    }
    if (!due.skip) set('due_date', due.value);
    if (!assignee.skip) set('assignee_id', assignee.value);
    if (!student.skip) set('student_id', student.value);
    if (sets.length === 0 && invoice.skip) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    const { rows } = await client.query(
      'SELECT created_by FROM director_notes WHERE id = $1 AND location_id = $2',
      [req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Task not found' });
    if (wantsText && req.session.role !== 'admin' && rows[0].created_by !== req.session.userId) {
      return res.status(403).json({ error: 'Only the author can edit this task' });
    }

    await client.query('BEGIN');
    if (sets.length > 0) {
      params.push(req.params.id);
      await client.query(
        `UPDATE director_notes SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length}`,
        params,
      );
    }
    if (!invoice.skip) await writeInvoice(client, Number(req.params.id), invoice.value);
    await client.query('COMMIT');

    const { rows: updated } = await client.query(`${SELECT} WHERE n.id = $1`, [req.params.id]);
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  } finally {
    client.release();
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
