const express = require('express');
const router = express.Router();
const { requireAuth, requireManager, requireSensei, requireOwnLocation } = require('../middleware/auth');

const PROGRAMS_SUBQUERY = `
  COALESCE(
    (SELECT json_agg(
      json_build_object(
        'id', sp.id,
        'program', sp.program,
        'belt_level', sp.belt_level,
        'belt_sublevel', sp.belt_sublevel,
        'current_project', sp.current_project,
        'project_status', sp.project_status
      ) ORDER BY sp.created_at
    ) FROM student_programs sp WHERE sp.student_id = s.id),
    '[]'::json
  ) AS programs
`;

// GET /api/students
router.get('/', requireAuth, async (req, res) => {
  const pool = req.app.get('db');
  const { search, program, belt } = req.query;

  let query = `
    SELECT s.*,
      (SELECT MAX(pl.session_date) FROM progress_logs pl WHERE pl.student_id = s.id) AS last_activity,
      ${PROGRAMS_SUBQUERY}
    FROM students s
    WHERE s.active = true AND s.location_id = $1
  `;
  const params = [req.session.activeLocationId];
  let paramCount = 1;

  if (search) {
    paramCount++;
    query += ` AND s.full_name ILIKE $${paramCount}`;
    params.push(`%${search}%`);
  }
  if (program) {
    paramCount++;
    query += ` AND EXISTS (SELECT 1 FROM student_programs sp2 WHERE sp2.student_id = s.id AND sp2.program = $${paramCount})`;
    params.push(program);
  }
  if (belt) {
    paramCount++;
    query += ` AND EXISTS (SELECT 1 FROM student_programs sp2 WHERE sp2.student_id = s.id AND sp2.belt_level = $${paramCount})`;
    params.push(belt);
  }

  query += ' ORDER BY s.full_name ASC';

  try {
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
});

// GET /api/students/:id
router.get('/:id', requireAuth, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT s.*, ${PROGRAMS_SUBQUERY} FROM students s WHERE s.id = $1 AND s.active = true AND s.location_id = $2`,
      [id, req.session.activeLocationId]
    );
    const student = rows[0];
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { rows: progressLogs } = await pool.query(`
      SELECT pl.*, u.display_name AS sensei_name
      FROM progress_logs pl
      LEFT JOIN users u ON pl.sensei_id = u.id
      WHERE pl.student_id = $1
      ORDER BY pl.session_date DESC, pl.created_at DESC
    `, [id]);

    // Strip parent contact fields for senseis
    if (req.session.role !== 'manager') {
      delete student.parent_name;
      delete student.parent_email;
      delete student.parent_phone;
    }

    res.json({ ...student, progress_logs: progressLogs });
  } catch (err) {
    console.error('Error fetching student:', err);
    res.status(500).json({ error: 'Failed to fetch student' });
  }
});

// POST /api/students
router.post('/', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { full_name, birthday } = req.body;

  if (!full_name) return res.status(400).json({ error: 'Full name is required' });

  try {
    const { rows } = await pool.query(
      'INSERT INTO students (full_name, birthday, location_id) VALUES ($1, $2, $3) RETURNING *',
      [full_name, birthday || null, req.session.activeLocationId]
    );
    res.status(201).json({ ...rows[0], programs: [] });
  } catch (err) {
    console.error('Error creating student:', err);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

// POST /api/students/:id/programs — add a program enrollment
router.post('/:id/programs', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  const { program, belt_level, belt_sublevel, current_project, project_status } = req.body;

  if (!program) return res.status(400).json({ error: 'program is required' });

  try {
    const { rows: studentRows } = await pool.query(
      'SELECT id FROM students WHERE id = $1 AND active = true AND location_id = $2',
      [id, req.session.activeLocationId]
    );
    if (!studentRows[0]) return res.status(404).json({ error: 'Student not found' });

    const { rows } = await pool.query(`
      INSERT INTO student_programs (student_id, program, belt_level, belt_sublevel, current_project, project_status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [id, program, belt_level || null, belt_sublevel || null, current_project || null, project_status || null]);

    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Student already enrolled in this program' });
    console.error('Error adding program:', err);
    res.status(500).json({ error: 'Failed to add program' });
  }
});

// PATCH /api/students/:id/programs/:program — update enrollment details
router.patch('/:id/programs/:program', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { id, program } = req.params;
  const { belt_level, belt_sublevel, current_project, project_status } = req.body;

  try {
    const { rows } = await pool.query(`
      UPDATE student_programs
      SET belt_level = $1, belt_sublevel = $2, current_project = $3, project_status = $4
      WHERE student_id = $5 AND program = $6
      RETURNING *
    `, [
      belt_level !== undefined ? belt_level : null,
      belt_sublevel !== undefined ? belt_sublevel : null,
      current_project !== undefined ? current_project : null,
      project_status !== undefined ? project_status : null,
      id,
      decodeURIComponent(program),
    ]);
    if (!rows[0]) return res.status(404).json({ error: 'Enrollment not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating program:', err);
    res.status(500).json({ error: 'Failed to update program' });
  }
});

// DELETE /api/students/:id/programs/:program — remove an enrollment
router.delete('/:id/programs/:program', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { id, program } = req.params;

  try {
    const { rows } = await pool.query(
      'DELETE FROM student_programs WHERE student_id = $1 AND program = $2 RETURNING id',
      [id, decodeURIComponent(program)]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Enrollment not found' });
    res.json({ message: 'Program removed' });
  } catch (err) {
    console.error('Error removing program:', err);
    res.status(500).json({ error: 'Failed to remove program' });
  }
});

// PATCH /api/students/:id
router.patch('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  const { full_name, birthday, parent_name, parent_email, parent_phone } = req.body;

  try {
    const { rows: existing } = await pool.query(
      'SELECT * FROM students WHERE id = $1 AND active = true AND location_id = $2',
      [id, req.session.activeLocationId]
    );
    const student = existing[0];
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { rows } = await pool.query(
      `UPDATE students SET
        full_name = $1, birthday = $2,
        parent_name = $3, parent_email = $4, parent_phone = $5
       WHERE id = $6 RETURNING *`,
      [
        full_name ?? student.full_name,
        birthday !== undefined ? birthday : student.birthday,
        parent_name !== undefined ? parent_name : student.parent_name,
        parent_email !== undefined ? parent_email : student.parent_email,
        parent_phone !== undefined ? parent_phone : student.parent_phone,
        id,
      ]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating student:', err);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

// PATCH /api/students/:id/note
router.patch('/:id/note', requireSensei, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  const { pinned_note } = req.body;

  try {
    const { rows } = await pool.query(
      'UPDATE students SET pinned_note = $1 WHERE id = $2 AND active = true AND location_id = $3 RETURNING pinned_note',
      [pinned_note || null, id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Student not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating pinned note:', err);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// DELETE /api/students/:id (soft delete)
router.delete('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      'SELECT id FROM students WHERE id = $1 AND active = true AND location_id = $2',
      [id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Student not found' });

    await pool.query('UPDATE students SET active = false WHERE id = $1', [id]);
    res.json({ message: 'Student deactivated' });
  } catch (err) {
    console.error('Error deleting student:', err);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// POST /api/students/import — bulk import from CSV data
router.post('/import', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { students: incoming } = req.body;
  const locationId = req.session.activeLocationId;

  if (!Array.isArray(incoming) || incoming.length === 0) {
    return res.status(400).json({ error: 'No student data provided' });
  }

  const BELT_MAP = {
    'White Belt': 'White', 'Yellow Belt': 'Yellow', 'Orange Belt': 'Orange',
    'Green Belt': 'Green', 'Blue Belt': 'Blue', 'Purple Belt': 'Purple',
    'Brown Belt': 'Brown', 'Red Belt': 'Red', 'Black Belt': 'Black',
  };

  const added = [];
  const duplicates = [];

  for (const row of incoming) {
    const fullName = row.full_name?.trim();
    const program = row.program?.trim();
    if (!fullName || !program) continue;

    const beltLevel = BELT_MAP[row.belt_raw?.trim()] || null;

    // Check for existing student with same name + program at this location
    const { rows: existing } = await pool.query(
      `SELECT s.id FROM students s
       JOIN student_programs sp ON sp.student_id = s.id
       WHERE LOWER(s.full_name) = LOWER($1) AND s.location_id = $2 AND sp.program = $3 AND s.active = true`,
      [fullName, locationId, program]
    );

    if (existing.length) {
      duplicates.push(fullName);
      continue;
    }

    // Find or create the student (they may exist but not in this program yet)
    const { rows: existingStudent } = await pool.query(
      'SELECT id FROM students WHERE LOWER(full_name) = LOWER($1) AND location_id = $2 AND active = true',
      [fullName, locationId]
    );

    let studentId;
    if (existingStudent.length) {
      studentId = existingStudent[0].id;
    } else {
      const birthday = row.birthday ? (() => {
        const d = new Date(row.birthday);
        return isNaN(d) ? null : d.toISOString().split('T')[0];
      })() : null;

      const { rows: inserted } = await pool.query(
        `INSERT INTO students (full_name, birthday, location_id, parent_name, parent_email, parent_phone)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [fullName, birthday, locationId, row.parent_name || null, row.parent_email || null, row.parent_phone || null]
      );
      studentId = inserted[0].id;
    }

    await pool.query(
      `INSERT INTO student_programs (student_id, program, belt_level, belt_sublevel)
       VALUES ($1, $2, $3, $4) ON CONFLICT (student_id, program) DO NOTHING`,
      [studentId, program, beltLevel, beltLevel ? 1 : null]
    );

    added.push(fullName);
  }

  res.json({ added: added.length, duplicates });
});

module.exports = router;
