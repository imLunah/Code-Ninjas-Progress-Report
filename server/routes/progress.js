const express = require('express');
const router = express.Router();
const { requireSensei, requireManager, requireOwnLocation } = require('../middleware/auth');

// For Robotics/JR: distinct modules visited vs total in that sub-program
const CURRICULUM_MODULE_COUNTS = {
  'JR Coding': 10,
  'Snap Circuits': 1,
  'Ozobot Evo': 2,
  'LEGO Spike Essentials': 8,
  'LEGO Spike Prime': 4,
  'VEX GO': 4,
};

// For AI Academy: lessons visited within the current module
const AI_MODULE_LESSON_COUNTS = {
  'Module 1': 6,
  'Module 2': 8,
  'Module 3': 8,
  'Module 4': 8,
  'Module 5': 8,
  'Module 6': 8,
  'Module 7': 9,
  'Module 8': 8,
  'Module 9': 8,
};

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

  // Build the list of lesson entries to insert — fall back to single-lesson fields if no array
  const entries = (Array.isArray(lesson_entries) && lesson_entries.length > 0)
    ? lesson_entries
    : [{ sub_program: sub_program || null, module_name: module_name || null, lesson_name: lesson_name || null }];

  // Use the pending daily_assignment's session_date so the log matches the actual
  // check-in date even if the sensei logs on a later day.
  const { rows: assignmentRows } = await pool.query(
    `SELECT id, session_date FROM daily_assignments
     WHERE student_id = $1 AND program = $2 AND completed = false
     ORDER BY session_date ASC, created_at ASC LIMIT 1`,
    [student_id, program]
  );
  const date = assignmentRows[0]
    ? new Date(assignmentRows[0].session_date).toISOString().split('T')[0]
    : (session_date || new Date().toISOString().split('T')[0]);
  const assignmentId = assignmentRows[0]?.id || null;
  const senseiId = req.session.userId;

  try {
    const { rows: studentRows } = await pool.query(
      'SELECT id FROM students WHERE id = $1 AND active = true AND location_id = $2',
      [student_id, req.session.activeLocationId]
    );
    if (!studentRows[0]) return res.status(404).json({ error: 'Student not found' });

    let lastLogId = null;

    // Insert one progress_log row per lesson entry
    for (const entry of entries) {
      const { rows: logRows } = await pool.query(`
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
        project_at || null,
        status_at || null,
        notes,
        entry.sub_program || null,
        entry.module_name || null,
        entry.lesson_name || null,
      ]);
      lastLogId = logRows[0].id;
    }

    // Use last entry's lesson fields for student_programs update
    const lastEntry = entries[entries.length - 1];

    // Always update last_sub_program, last_module_name, last_lesson_name, last_session_date
    const { rows: enrollmentRows } = await pool.query(
      'SELECT * FROM student_programs WHERE student_id = $1 AND program = $2',
      [student_id, program]
    );
    const enrollment = enrollmentRows[0];
    if (enrollment) {
      if (update_student) {
        await pool.query(`
          UPDATE student_programs
          SET belt_level = $1, belt_sublevel = $2, current_project = $3, project_status = $4,
              last_sub_program = $5, last_module_name = $6, last_lesson_name = $7, last_session_date = $8
          WHERE student_id = $9 AND program = $10
        `, [
          belt_level_at !== undefined ? belt_level_at : enrollment.belt_level,
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
        await pool.query(`
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

    // Mark only the oldest pending assignment complete (not all — there may be multiple check-ins)
    if (assignmentId) {
      await pool.query(
        'UPDATE daily_assignments SET completed = true WHERE id = $1',
        [assignmentId]
      );
    }

    // Auto-compute percent_complete using the last lesson entry's fields
    const lastModuleName = lastEntry.module_name;
    const lastSubProgram = lastEntry.sub_program;

    // Check if this is a custom program (name-based lookup, no prefix needed)
    const { rows: cpLookup } = await pool.query(
      'SELECT id FROM custom_programs WHERE name = $1 AND location_id = $2 AND is_active = true',
      [program, req.session.activeLocationId]
    );
    const isCustomProgram = !!cpLookup[0];
    const customProgramId = cpLookup[0]?.id ?? null;

    if (isCustomProgram && lastModuleName) {
      // Custom program: percent = distinct (module, lesson) pairs logged / total lessons in program
      const { rows: totalRows } = await pool.query(
        `SELECT COUNT(*) AS cnt FROM custom_program_lessons cpl
         JOIN custom_program_modules cpm ON cpl.module_id = cpm.id
         WHERE cpm.custom_program_id = $1`,
        [customProgramId]
      );
      const totalLessons = parseInt(totalRows[0].cnt);
      if (totalLessons > 0) {
        const { rows: doneRows } = await pool.query(
          `SELECT COUNT(*) AS cnt FROM (
             SELECT DISTINCT module_name, lesson_name FROM progress_logs
             WHERE student_id = $1 AND program = $2 AND module_name IS NOT NULL AND lesson_name IS NOT NULL
           ) x`,
          [student_id, program]
        );
        const pct = Math.min(100, Math.round((parseInt(doneRows[0].cnt) / totalLessons) * 100));
        await pool.query(
          'UPDATE student_programs SET percent_complete = $1 WHERE student_id = $2 AND program = $3',
          [pct, student_id, program]
        );
      }
    } else if (program === 'AI Academy' && lastModuleName) {
      const totalLessons = AI_MODULE_LESSON_COUNTS[lastModuleName];
      if (totalLessons) {
        const { rows: cntRows } = await pool.query(
          'SELECT COUNT(DISTINCT lesson_name) AS cnt FROM progress_logs WHERE student_id = $1 AND program = $2 AND module_name = $3 AND lesson_name IS NOT NULL',
          [student_id, program, lastModuleName]
        );
        const pct = Math.min(100, Math.round((parseInt(cntRows[0].cnt) / totalLessons) * 100));
        await pool.query(
          'UPDATE student_programs SET percent_complete = $1 WHERE student_id = $2 AND program = $3',
          [pct, student_id, program]
        );
      }
    } else if (program === 'JR' && lastSubProgram) {
      // JR: sequential position — if student reaches Module 5, credit modules 1-5 as complete
      if (lastSubProgram === 'JR Coding' && lastModuleName) {
        const JR_CODING_MODULES = ['Module 1', 'Module 2', 'Module 3', 'Module 4', 'Module 5',
          'Module 6', 'Module 7', 'Module 8', 'Module 9', 'Module 10'];
        const { rows: modRows } = await pool.query(
          'SELECT DISTINCT module_name FROM progress_logs WHERE student_id = $1 AND program = $2 AND sub_program = $3 AND module_name IS NOT NULL',
          [student_id, program, 'JR Coding']
        );
        const highestIdx = Math.max(-1, ...modRows.map((r) => JR_CODING_MODULES.indexOf(r.module_name)));
        if (highestIdx >= 0) {
          const pct = Math.round(((highestIdx + 1) / JR_CODING_MODULES.length) * 100);
          await pool.query(
            'UPDATE student_programs SET percent_complete = $1 WHERE student_id = $2 AND program = $3',
            [pct, student_id, program]
          );
        }
      } else if (lastSubProgram === 'Snap Circuits') {
        const lastLessonName = lastEntry.lesson_name;
        if (lastLessonName) {
          const { rows: lessonRows } = await pool.query(
            'SELECT lesson_name FROM progress_logs WHERE student_id = $1 AND program = $2 AND sub_program = $3 AND lesson_name IS NOT NULL',
            [student_id, program, 'Snap Circuits']
          );
          const nums = lessonRows.map((r) => {
            const m = r.lesson_name?.match(/Project\s+(\d+)/i);
            return m ? parseInt(m[1], 10) : 0;
          });
          const highest = nums.length > 0 ? Math.max(0, ...nums) : 0;
          if (highest > 0) {
            const pct = Math.min(100, Math.round((highest / 24) * 100));
            await pool.query(
              'UPDATE student_programs SET percent_complete = $1 WHERE student_id = $2 AND program = $3',
              [pct, student_id, program]
            );
          }
        }
      }
    } else if (program !== 'CREATE' && program !== 'AI Academy' && program !== 'JR' && !isCustomProgram && lastModuleName) {
      const lookupKey = lastSubProgram || program;
      const totalModules = CURRICULUM_MODULE_COUNTS[lookupKey];
      if (totalModules) {
        const cntSql = lastSubProgram
          ? 'SELECT COUNT(DISTINCT module_name) AS cnt FROM progress_logs WHERE student_id = $1 AND program = $2 AND sub_program = $3 AND module_name IS NOT NULL'
          : 'SELECT COUNT(DISTINCT module_name) AS cnt FROM progress_logs WHERE student_id = $1 AND program = $2 AND module_name IS NOT NULL';
        const cntParams = lastSubProgram ? [student_id, program, lastSubProgram] : [student_id, program];
        const { rows: cntRows } = await pool.query(cntSql, cntParams);
        const pct = Math.min(100, Math.round((parseInt(cntRows[0].cnt) / totalModules) * 100));
        await pool.query(
          'UPDATE student_programs SET percent_complete = $1 WHERE student_id = $2 AND program = $3',
          [pct, student_id, program]
        );
      }
    }

    const { rows } = await pool.query(`
      SELECT pl.*, u.display_name as sensei_name
      FROM progress_logs pl
      LEFT JOIN users u ON pl.sensei_id = u.id
      WHERE pl.id = $1
    `, [lastLogId]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating progress log:', err);
    res.status(500).json({ error: 'Failed to create progress log' });
  }
});

// PATCH /api/progress/:id — managers edit any log; senseis edit only their own
router.patch('/:id', requireSensei, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { notes } = req.body;
  if (!notes?.trim()) return res.status(400).json({ error: 'Notes are required' });

  const isManager = req.session.role === 'manager';
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

// DELETE /api/progress/:id — manager deletes a progress log
router.delete('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      `DELETE FROM progress_logs
       USING students s
       WHERE progress_logs.id = $1 AND progress_logs.student_id = s.id AND s.location_id = $2
       RETURNING progress_logs.id`,
      [req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Log not found' });
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
