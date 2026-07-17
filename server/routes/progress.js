const express = require('express');
const router = express.Router();
const { requireSensei, requireOwnLocation } = require('../middleware/auth');
const { ALL_BELTS, isValidBelt, validateSublevel } = require('../lib/belts');

// Free-text curriculum/progress fields are intentionally freeform (senseis log custom
// lesson/module names not in the curriculum tables), so they're bounded by length
// rather than a closed vocabulary — same defense-in-depth as the notes cap.
const MAX_FIELD = 200;

// POST /api/progress
// Accepts either single-lesson fields OR lesson_entries array for multi-lesson sessions.
router.post('/', requireSensei, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const {
    student_id,
    program,
    session_date,
    notes,
    belt_level_at,
    belt_sublevel_at,
    project_at,
    status_at,
    update_student,
    sub_program,
    module_name,
    lesson_name,
    lesson_entries, // array of { sub_program, module_name, lesson_name } for multi-lesson sessions
  } = req.body;

  if (!student_id || !program || !notes) {
    return res.status(400).json({ error: 'student_id, program, and notes are required' });
  }
  if (notes.length > 2000) return res.status(400).json({ error: 'Notes too long (max 2000 chars)' });

  // Build the list of lesson entries to insert — fall back to single-lesson fields if no array
  const entries = (Array.isArray(lesson_entries) && lesson_entries.length > 0)
    ? lesson_entries
    : [{ sub_program: sub_program || null, module_name: module_name || null, lesson_name: lesson_name || null }];

  // belt_level_at must be a real belt label (or absent) — block junk stored verbatim
  // in the log row. The overwrite path below applies the same ALL_BELTS whitelist.
  if (!isValidBelt(belt_level_at)) {
    return res.status(400).json({ error: 'Invalid belt level' });
  }
  // Bound every free-text curriculum/progress field (top-level + per-entry) by length.
  const cappedFields = [
    sub_program, module_name, lesson_name, project_at, status_at,
    ...entries.flatMap((e) => [e.sub_program, e.module_name, e.lesson_name, e.project_at, e.status]),
  ];
  if (cappedFields.some((v) => typeof v === 'string' && v.length > MAX_FIELD)) {
    return res.status(400).json({ error: `Field too long (max ${MAX_FIELD} chars)` });
  }

  // session_date (when provided) is written straight into progress_logs, so it must
  // be a real calendar date — not the future, not absurdly old. Without this an
  // authenticated sensei can backdate/post-date a log to any year (e.g. 2030).
  const pacificToday = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  if (session_date != null) {
    const validFormat = /^\d{4}-\d{2}-\d{2}$/.test(session_date) && !Number.isNaN(Date.parse(session_date));
    if (!validFormat || session_date > pacificToday || session_date < '2020-01-01') {
      return res.status(400).json({ error: 'Invalid session date' });
    }
  }

  const senseiId = req.session.userId;

  try {
    // Bound belt_sublevel_at against the real max for the belt (blocks values like 1000).
    const subError = await validateSublevel(pool, belt_level_at ?? null, belt_sublevel_at ?? null);
    if (subError) return res.status(400).json({ error: subError });

    // Prefer today's pending assignment so logging clears the kid from the board.
    // A generic check-in (program IS NULL) is also eligible — the sensei picking a
    // class here claims it. Exact program matches win over a generic row.
    const { rows: assignmentRows } = await pool.query(
      `SELECT id, session_date FROM daily_assignments
       WHERE student_id = $1 AND completed = false AND (program = $2 OR program IS NULL)
       ORDER BY (CASE WHEN program = $2 THEN 0 ELSE 1 END),
                (session_date = $3::date) DESC, session_date ASC, created_at ASC LIMIT 1`,
      [student_id, program, pacificToday]
    );
    const date = assignmentRows[0]
      ? new Date(assignmentRows[0].session_date).toISOString().split('T')[0]
      : (session_date || new Date().toISOString().split('T')[0]);
    const assignmentId = assignmentRows[0]?.id || null;

    const { rows: studentRows } = await pool.query(
      'SELECT id FROM students WHERE id = $1 AND active = true AND location_id = $2',
      [student_id, req.session.activeLocationId]
    );
    if (!studentRows[0]) return res.status(404).json({ error: 'Student not found' });

    // Reject anything that isn't a program the student is actually enrolled in.
    // Without this, an arbitrary `program` string lands in progress_logs and
    // daily_assignments and then pollutes the TodayBoard program filter.
    const { rows: enrollRows } = await pool.query(
      'SELECT 1 FROM student_programs WHERE student_id = $1 AND program = $2',
      [student_id, program]
    );
    if (!enrollRows[0]) return res.status(400).json({ error: 'Student not enrolled in this program' });

    let lastLogId = null;
    let lastEntry = entries[entries.length - 1];
    const client = await pool.connect();

    // Insert one progress_log row per lesson entry
    try {
      await client.query('BEGIN');
    for (const entry of entries) {
      const { rows: logRows } = await client.query(`
        INSERT INTO progress_logs (student_id, program, sensei_id, session_date, belt_level_at, belt_sublevel_at, project_at, status_at, notes, sub_program, module_name, lesson_name)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING id
      `, [
        student_id,
        program,
        senseiId,
        date,
        belt_level_at || null,
        belt_sublevel_at || null,
        entry.project_at ?? project_at ?? null,
        entry.status ?? status_at ?? null,
        notes,
        entry.sub_program || null,
        entry.module_name || null,
        entry.lesson_name || null,
      ]);
      lastLogId = logRows[0].id;
    }

    // Always update last_sub_program, last_module_name, last_lesson_name, last_session_date
    const { rows: enrollmentRows } = await client.query(
      'SELECT * FROM student_programs WHERE student_id = $1 AND program = $2',
      [student_id, program]
    );
    const enrollment = enrollmentRows[0];
    if (enrollment) {
      if (update_student) {
        await client.query(`
          UPDATE student_programs
          SET belt_level = $1, belt_sublevel = $2, current_project = $3, project_status = $4,
              last_sub_program = $5, last_module_name = $6, last_lesson_name = $7, last_session_date = $8
          WHERE student_id = $9 AND program = $10
        `, [
          // Any real belt (incl. Bronze/Silver/Platinum/Gold — they're full ladder
          // belts since the restructure) may overwrite the tracked belt. isValidBelt
          // already 400s anything else, so only real labels reach this point.
          (belt_level_at !== undefined && (belt_level_at === null || ALL_BELTS.has(belt_level_at))) ? belt_level_at : enrollment.belt_level,
          belt_sublevel_at !== undefined ? belt_sublevel_at : enrollment.belt_sublevel,
          project_at !== undefined ? project_at : enrollment.current_project,
          status_at !== undefined ? status_at : enrollment.project_status,
          lastEntry.sub_program || enrollment.last_sub_program,
          lastEntry.module_name || enrollment.last_module_name,
          lastEntry.lesson_name || enrollment.last_lesson_name,
          date,
          student_id,
          program,
        ]);
      } else {
        await client.query(`
          UPDATE student_programs
          SET last_sub_program = COALESCE($1, last_sub_program),
              last_module_name = COALESCE($2, last_module_name),
              last_lesson_name = COALESCE($3, last_lesson_name),
              last_session_date = $4
          WHERE student_id = $5 AND program = $6
        `, [
          lastEntry.sub_program || null,
          lastEntry.module_name || null,
          lastEntry.lesson_name || null,
          date,
          student_id,
          program,
        ]);
      }
    }

    // Mark only the oldest pending assignment complete (not all — there may be multiple check-ins).
    // If the ninja was never checked in (no assignment), create one already-completed so the
    // logged session still lands on Today's Board under "Logged" instead of vanishing.
    if (assignmentId) {
      // Also stamp the program — this claims a generic (null-program) check-in for
      // the class the sensei chose; harmless when the row already had this program.
      await client.query(
        'UPDATE daily_assignments SET completed = true, program = $2 WHERE id = $1',
        [assignmentId, program]
      );
    } else {
      await client.query(
        'INSERT INTO daily_assignments (student_id, program, session_date, sensei_id, completed) VALUES ($1, $2, $3, $4, true)',
        [student_id, program, date, senseiId]
      );
    }

    // Auto-compute percent_complete: lessons done in current module / total lessons in that module
    const lastModuleName = lastEntry.module_name;
    const lastSubProgram = lastEntry.sub_program;

    if (program !== 'CREATE' && lastModuleName && lastEntry.lesson_name) {
      const { rows: doneRows } = await client.query(
        "SELECT COUNT(DISTINCT lesson_name) AS cnt FROM progress_logs WHERE student_id = $1 AND program = $2 AND module_name = $3 AND lesson_name IS NOT NULL AND status_at = 'Completed'",
        [student_id, program, lastModuleName]
      );
      const { rows: totalRows } = await client.query(
        `SELECT COUNT(cl.id) AS total
         FROM curriculum_lessons cl
         JOIN curriculum_modules cm ON cl.module_id = cm.id
         WHERE cm.program = $1 AND cm.module_name = $2
           AND (cm.sub_program = $3 OR (cm.sub_program IS NULL AND $3::text IS NULL))`,
        [program, lastModuleName, lastSubProgram || null]
      );
      const totalLessons = parseInt(totalRows[0].total);
      if (totalLessons > 0) {
        const pct = Math.min(100, Math.round((parseInt(doneRows[0].cnt) / totalLessons) * 100));
        await client.query(
          'UPDATE student_programs SET percent_complete = $1 WHERE student_id = $2 AND program = $3',
          [pct, student_id, program]
        );
      }
    }

    await client.query('COMMIT');
    } catch (txErr) {
      await client.query('ROLLBACK').catch(() => {});
      throw txErr;
    } finally {
      client.release();
    }

    const { rows } = await pool.query(`
      SELECT pl.*, u.display_name as sensei_name
      FROM progress_logs pl
      LEFT JOIN users u ON pl.sensei_id = u.id
      WHERE pl.id = $1
    `, [lastLogId]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating progress log:', err.message, '| code:', err.code, '| detail:', err.detail);
    res.status(500).json({ error: 'Failed to create progress log' });
  }
});

// PATCH /api/progress/:id — managers edit any log; senseis edit only their own
router.patch('/:id', requireSensei, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { notes } = req.body;
  if (!notes?.trim()) return res.status(400).json({ error: 'Notes are required' });

  const isManager = ['manager', 'admin'].includes(req.session.role);
  try {
    const ownershipClause = isManager ? '' : 'AND progress_logs.sensei_id = $4';
    const params = isManager
      ? [notes.trim(), req.params.id, req.session.activeLocationId]
      : [notes.trim(), req.params.id, req.session.activeLocationId, req.session.userId];

    const { rows } = await pool.query(
      `UPDATE progress_logs SET notes = $1
       FROM students s
       WHERE progress_logs.id = $2 AND progress_logs.student_id = s.id AND s.location_id = $3
       ${ownershipClause}
       RETURNING progress_logs.id`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Log not found or not yours' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Progress log update error:', err);
    res.status(500).json({ error: 'Failed to update log' });
  }
});

// DELETE /api/progress/:id — managers delete any log in their center; senseis delete only their own
router.delete('/:id', requireSensei, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const isManager = ['manager', 'admin'].includes(req.session.role);
  try {
    const ownershipClause = isManager ? '' : 'AND progress_logs.sensei_id = $3';
    const params = isManager
      ? [req.params.id, req.session.activeLocationId]
      : [req.params.id, req.session.activeLocationId, req.session.userId];

    const { rows } = await pool.query(
      `DELETE FROM progress_logs
       USING students s
       WHERE progress_logs.id = $1 AND progress_logs.student_id = s.id AND s.location_id = $2
       ${ownershipClause}
       RETURNING progress_logs.id`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Log not found or not yours' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Progress log delete error:', err);
    res.status(500).json({ error: 'Failed to delete log' });
  }
});

// POST /api/progress/:id/comments — any staff member can comment on a log entry
router.post('/:id/comments', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });

  try {
    const { rows: logRows } = await pool.query(
      `SELECT pl.id FROM progress_logs pl
       JOIN students s ON pl.student_id = s.id
       WHERE pl.id = $1 AND s.location_id = $2`,
      [req.params.id, req.session.activeLocationId]
    );
    if (!logRows[0]) return res.status(404).json({ error: 'Log not found' });

    const { rows } = await pool.query(
      `INSERT INTO progress_log_comments (log_id, user_id, user_name, body)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.session.userId, req.session.displayName, body.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Progress log comment error:', err);
    res.status(500).json({ error: 'Failed to save comment' });
  }
});

module.exports = router;
