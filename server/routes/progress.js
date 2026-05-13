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
  } = req.body;

  if (!student_id || !program || !notes) {
    return res.status(400).json({ error: 'student_id, program, and notes are required' });
  }

  // Use the pending daily_assignment's session_date so the log matches the actual
  // check-in date even if the sensei logs on a later day.
  const { rows: assignmentRows } = await pool.query(
    `SELECT session_date FROM daily_assignments
     WHERE student_id = $1 AND program = $2 AND completed = false
     ORDER BY session_date DESC LIMIT 1`,
    [student_id, program]
  );
  const date = assignmentRows[0]
    ? new Date(assignmentRows[0].session_date).toISOString().split('T')[0]
    : (session_date || new Date().toISOString().split('T')[0]);
  const senseiId = req.session.userId;

  try {
    const { rows: studentRows } = await pool.query(
      'SELECT id FROM students WHERE id = $1 AND active = true AND location_id = $2',
      [student_id, req.session.activeLocationId]
    );
    if (!studentRows[0]) return res.status(404).json({ error: 'Student not found' });

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
      sub_program || null,
      module_name || null,
      lesson_name || null,
    ]);

    // Always update last_sub_program, last_module_name, last_lesson_name, last_session_date
    // so each program row tracks its own "where they left off" independently.
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
          sub_program || enrollment.last_sub_program,
          module_name || enrollment.last_module_name,
          lesson_name || enrollment.last_lesson_name,
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
          sub_program || null,
          module_name || null,
          lesson_name || null,
          date,
          student_id,
          program,
        ]);
      }
    }

    await pool.query(
      'UPDATE daily_assignments SET completed = true WHERE student_id = $1 AND program = $2 AND session_date = $3',
      [student_id, program, date]
    );

    // Auto-compute percent_complete — AI Academy tracks lesson progress within the current module;
    // Robotics/JR track distinct modules visited within the current sub-program.
    if (program === 'AI Academy' && module_name) {
      const totalLessons = AI_MODULE_LESSON_COUNTS[module_name];
      if (totalLessons) {
        const { rows: cntRows } = await pool.query(
          'SELECT COUNT(DISTINCT lesson_name) AS cnt FROM progress_logs WHERE student_id = $1 AND program = $2 AND module_name = $3 AND lesson_name IS NOT NULL',
          [student_id, program, module_name]
        );
        const pct = Math.min(100, Math.round((parseInt(cntRows[0].cnt) / totalLessons) * 100));
        await pool.query(
          'UPDATE student_programs SET percent_complete = $1 WHERE student_id = $2 AND program = $3',
          [pct, student_id, program]
        );
      }
    } else if (program !== 'CREATE' && program !== 'AI Academy' && module_name) {
      const lookupKey = sub_program || program;
      const totalModules = CURRICULUM_MODULE_COUNTS[lookupKey];
      if (totalModules) {
        const cntSql = sub_program
          ? 'SELECT COUNT(DISTINCT module_name) AS cnt FROM progress_logs WHERE student_id = $1 AND program = $2 AND sub_program = $3 AND module_name IS NOT NULL'
          : 'SELECT COUNT(DISTINCT module_name) AS cnt FROM progress_logs WHERE student_id = $1 AND program = $2 AND module_name IS NOT NULL';
        const cntParams = sub_program ? [student_id, program, sub_program] : [student_id, program];
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
    `, [logRows[0].id]);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating progress log:', err);
    res.status(500).json({ error: 'Failed to create progress log' });
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
