const express = require('express');
const router = express.Router();
const { requireAuth, requireManager, requireOwnLocation } = require('../middleware/auth');

// GET /api/custom-programs — list with full module+lesson tree for current location
router.get('/', requireAuth, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT
        cp.id,
        cp.name,
        cp.description,
        cp.is_active,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cpm.id,
              'name', cpm.name,
              'sort_order', cpm.sort_order,
              'lessons', (
                SELECT COALESCE(
                  json_agg(
                    json_build_object('id', cpl.id, 'name', cpl.name, 'sort_order', cpl.sort_order)
                    ORDER BY cpl.sort_order, cpl.id
                  ), '[]'
                )
                FROM custom_program_lessons cpl WHERE cpl.module_id = cpm.id
              )
            ) ORDER BY cpm.sort_order, cpm.id
          ) FILTER (WHERE cpm.id IS NOT NULL),
          '[]'
        ) AS modules
      FROM custom_programs cp
      LEFT JOIN custom_program_modules cpm ON cpm.custom_program_id = cp.id
      WHERE cp.location_id = $1 AND cp.is_active = true
      GROUP BY cp.id
      ORDER BY cp.id
    `, [req.session.activeLocationId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching custom programs:', err);
    res.status(500).json({ error: 'Failed to fetch custom programs' });
  }
});

// POST /api/custom-programs — create new program (manager only)
router.post('/', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { name, description } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO custom_programs (location_id, name, description, created_by)
       VALUES ($1, $2, $3, $4) RETURNING id, name, description, is_active`,
      [req.session.activeLocationId, name.trim(), description?.trim() || null, req.session.userId]
    );
    res.status(201).json({ ...rows[0], modules: [] });
  } catch (err) {
    console.error('Error creating custom program:', err);
    res.status(500).json({ error: 'Failed to create program' });
  }
});

// PATCH /api/custom-programs/:id — rename/edit description (manager only)
router.patch('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { name, description } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE custom_programs
       SET name = COALESCE(NULLIF($1, ''), name), description = $2
       WHERE id = $3 AND location_id = $4
       RETURNING id, name, description`,
      [name?.trim() || null, description?.trim() || null, req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Program not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update program' });
  }
});

// DELETE /api/custom-programs/:id — soft-delete (manager only)
router.delete('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      `UPDATE custom_programs SET is_active = false
       WHERE id = $1 AND location_id = $2 RETURNING id`,
      [req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Program not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete program' });
  }
});

// POST /api/custom-programs/:id/modules — add a module
router.post('/:id/modules', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  try {
    const { rows: prog } = await pool.query(
      'SELECT id FROM custom_programs WHERE id = $1 AND location_id = $2 AND is_active = true',
      [req.params.id, req.session.activeLocationId]
    );
    if (!prog[0]) return res.status(404).json({ error: 'Program not found' });

    const { rows: maxRow } = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM custom_program_modules WHERE custom_program_id = $1',
      [req.params.id]
    );

    const { rows } = await pool.query(
      'INSERT INTO custom_program_modules (custom_program_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [req.params.id, name.trim(), maxRow[0].next]
    );
    res.status(201).json({ ...rows[0], lessons: [] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add module' });
  }
});

// PATCH /api/custom-programs/:id/modules/:moduleId — rename module
router.patch('/:id/modules/:moduleId', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { name } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE custom_program_modules SET name = COALESCE(NULLIF($1, ''), name)
       WHERE id = $2 AND custom_program_id = $3 RETURNING *`,
      [name?.trim() || null, req.params.moduleId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Module not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// DELETE /api/custom-programs/:id/modules/:moduleId
router.delete('/:id/modules/:moduleId', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      'DELETE FROM custom_program_modules WHERE id = $1 AND custom_program_id = $2 RETURNING id',
      [req.params.moduleId, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Module not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

// POST /api/custom-programs/:id/modules/:moduleId/lessons — add a lesson
router.post('/:id/modules/:moduleId/lessons', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });

  try {
    const { rows: modRow } = await pool.query(
      `SELECT cpm.id FROM custom_program_modules cpm
       JOIN custom_programs cp ON cp.id = cpm.custom_program_id
       WHERE cpm.id = $1 AND cpm.custom_program_id = $2 AND cp.location_id = $3`,
      [req.params.moduleId, req.params.id, req.session.activeLocationId]
    );
    if (!modRow[0]) return res.status(404).json({ error: 'Module not found' });

    const { rows: maxRow } = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM custom_program_lessons WHERE module_id = $1',
      [req.params.moduleId]
    );

    const { rows } = await pool.query(
      'INSERT INTO custom_program_lessons (module_id, name, sort_order) VALUES ($1, $2, $3) RETURNING *',
      [req.params.moduleId, name.trim(), maxRow[0].next]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add lesson' });
  }
});

// PATCH /api/custom-programs/:id/modules/:moduleId/lessons/:lessonId
router.patch('/:id/modules/:moduleId/lessons/:lessonId', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { name } = req.body;

  try {
    const { rows } = await pool.query(
      `UPDATE custom_program_lessons SET name = COALESCE(NULLIF($1, ''), name)
       WHERE id = $2 AND module_id = $3 RETURNING *`,
      [name?.trim() || null, req.params.lessonId, req.params.moduleId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Lesson not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// DELETE /api/custom-programs/:id/modules/:moduleId/lessons/:lessonId
router.delete('/:id/modules/:moduleId/lessons/:lessonId', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      'DELETE FROM custom_program_lessons WHERE id = $1 AND module_id = $2 RETURNING id',
      [req.params.lessonId, req.params.moduleId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Lesson not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

module.exports = router;
