const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');

// GET /api/curriculum — public, returns { subPrograms, curriculum } matching progressData.js shape
router.get('/', async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows: modules } = await pool.query(`
      SELECT m.id, m.program, m.sub_program, m.module_name, m.module_order,
             COALESCE(json_agg(
               json_build_object('id', l.id, 'lesson_name', l.lesson_name, 'lesson_order', l.lesson_order)
               ORDER BY l.lesson_order ASC
             ) FILTER (WHERE l.id IS NOT NULL), '[]') AS lessons
      FROM curriculum_modules m
      LEFT JOIN curriculum_lessons l ON l.module_id = m.id
      GROUP BY m.id
      ORDER BY m.program ASC, m.sub_program ASC NULLS FIRST, m.module_order ASC
    `);

    if (!modules.length) {
      return res.status(204).end(); // not seeded yet — frontend falls back to static data
    }

    // Build subPrograms map
    const subPrograms = {};
    const programsSeen = new Set();
    for (const m of modules) {
      programsSeen.add(m.program);
      if (m.sub_program && !subPrograms[m.program]) subPrograms[m.program] = [];
      if (m.sub_program && !subPrograms[m.program].includes(m.sub_program)) {
        subPrograms[m.program].push(m.sub_program);
      }
    }
    for (const prog of programsSeen) {
      if (!subPrograms[prog]) subPrograms[prog] = null;
    }

    // Build curriculum map keyed by sub_program (if present) or program
    const curriculum = {};
    for (const m of modules) {
      const key = m.sub_program || m.program;
      if (!curriculum[key]) curriculum[key] = [];
      curriculum[key].push({
        id: m.id,
        module: m.module_name,
        lessons: m.lessons.map(l => l.lesson_name),
        _lessons: m.lessons, // includes ids for admin UI
      });
    }

    res.json({ subPrograms, curriculum });
  } catch (err) {
    // Table doesn't exist yet — migration hasn't been run; frontend falls back to static data
    if (err.code === '42P01') return res.status(204).end();
    console.error('Error fetching curriculum:', err);
    res.status(500).json({ error: 'Failed to fetch curriculum' });
  }
});

// POST /api/curriculum/modules — add a module
router.post('/modules', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { program, sub_program, module_name } = req.body;
  if (!program || !module_name) return res.status(400).json({ error: 'program and module_name are required' });

  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM curriculum_modules WHERE program = $1 AND module_name = $2 AND (sub_program = $3 OR (sub_program IS NULL AND $3::text IS NULL))',
      [program, module_name, sub_program || null]
    );
    if (existing.length) return res.status(409).json({ error: 'A module with that name already exists in this program' });

    const { rows: maxOrder } = await pool.query(
      'SELECT COALESCE(MAX(module_order), -1) AS max FROM curriculum_modules WHERE program = $1 AND (sub_program = $2 OR (sub_program IS NULL AND $2::text IS NULL))',
      [program, sub_program || null]
    );
    const nextOrder = maxOrder[0].max + 1;

    const { rows } = await pool.query(
      'INSERT INTO curriculum_modules (program, sub_program, module_name, module_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [program, sub_program || null, module_name, nextOrder]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error adding module:', err);
    res.status(500).json({ error: 'Failed to add module' });
  }
});

// PATCH /api/curriculum/modules/:id — rename a module
router.patch('/modules/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { module_name } = req.body;
  if (!module_name) return res.status(400).json({ error: 'module_name is required' });

  try {
    const { rows } = await pool.query(
      'UPDATE curriculum_modules SET module_name = $1 WHERE id = $2 RETURNING *',
      [module_name, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Module not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating module:', err);
    res.status(500).json({ error: 'Failed to update module' });
  }
});

// DELETE /api/curriculum/modules/:id — deletes module + all its lessons (CASCADE)
router.delete('/modules/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rowCount } = await pool.query('DELETE FROM curriculum_modules WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Module not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting module:', err);
    res.status(500).json({ error: 'Failed to delete module' });
  }
});

// POST /api/curriculum/modules/:id/lessons — add a lesson
router.post('/modules/:moduleId/lessons', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { lesson_name } = req.body;
  if (!lesson_name) return res.status(400).json({ error: 'lesson_name is required' });

  try {
    const { rows: maxOrder } = await pool.query(
      'SELECT COALESCE(MAX(lesson_order), -1) AS max FROM curriculum_lessons WHERE module_id = $1',
      [req.params.moduleId]
    );
    const nextOrder = maxOrder[0].max + 1;

    const { rows } = await pool.query(
      'INSERT INTO curriculum_lessons (module_id, lesson_name, lesson_order) VALUES ($1, $2, $3) RETURNING *',
      [req.params.moduleId, lesson_name, nextOrder]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error adding lesson:', err);
    res.status(500).json({ error: 'Failed to add lesson' });
  }
});

// PATCH /api/curriculum/lessons/:id — rename a lesson
router.patch('/lessons/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { lesson_name } = req.body;
  if (!lesson_name) return res.status(400).json({ error: 'lesson_name is required' });

  try {
    const { rows } = await pool.query(
      'UPDATE curriculum_lessons SET lesson_name = $1 WHERE id = $2 RETURNING *',
      [lesson_name, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Lesson not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating lesson:', err);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
});

// DELETE /api/curriculum/lessons/:id
router.delete('/lessons/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rowCount } = await pool.query('DELETE FROM curriculum_lessons WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Lesson not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting lesson:', err);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
});

// POST /api/curriculum/seed — initialize from defaults (admin only, only if tables are empty)
router.post('/seed', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM curriculum_modules');
    if (parseInt(rows[0].count) > 0) {
      return res.status(409).json({ error: 'Curriculum already seeded. Use the editor to make changes.' });
    }
    // Run the seed script inline
    const { execSync } = require('child_process');
    execSync('node server/db/seed_curriculum.js', { stdio: 'inherit', cwd: process.cwd() });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error seeding curriculum:', err);
    res.status(500).json({ error: 'Failed to seed curriculum' });
  }
});

// ── Belt level projects (CREATE program) ─────────────────────────────────────

// GET /api/curriculum/belt-projects — returns { [belt_name]: { [sublevel]: [{id, project_name}] } }
router.get('/belt-projects', async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      'SELECT id, belt_name, sublevel, project_name, project_order FROM belt_level_projects ORDER BY belt_name ASC, sublevel ASC, project_order ASC'
    );
    if (!rows.length) return res.status(204).end();

    const data = {};
    for (const r of rows) {
      if (!data[r.belt_name]) data[r.belt_name] = {};
      if (!data[r.belt_name][r.sublevel]) data[r.belt_name][r.sublevel] = [];
      data[r.belt_name][r.sublevel].push({ id: r.id, project_name: r.project_name, project_order: r.project_order });
    }
    res.json(data);
  } catch (err) {
    if (err.code === '42P01') return res.status(204).end();
    console.error('Error fetching belt projects:', err);
    res.status(500).json({ error: 'Failed to fetch belt projects' });
  }
});

// POST /api/curriculum/belt-projects/seed — seed from defaults (admin only)
router.post('/belt-projects/seed', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query('SELECT COUNT(*) FROM belt_level_projects');
    if (parseInt(rows[0].count) > 0) {
      return res.status(409).json({ error: 'Belt projects already seeded.' });
    }
    const { execSync } = require('child_process');
    execSync('node server/db/seed_belt_projects.js', { stdio: 'inherit', cwd: process.cwd() });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '42P01') return res.status(503).json({ error: 'Run migration 004 first.' });
    console.error('Error seeding belt projects:', err);
    res.status(500).json({ error: 'Failed to seed belt projects' });
  }
});

// POST /api/curriculum/belt-projects — add a project to a belt+sublevel
router.post('/belt-projects', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { belt_name, sublevel, project_name } = req.body;
  if (!belt_name || !sublevel || !project_name) return res.status(400).json({ error: 'belt_name, sublevel, and project_name are required' });
  try {
    const { rows: maxOrder } = await pool.query(
      'SELECT COALESCE(MAX(project_order), -1) AS max FROM belt_level_projects WHERE belt_name = $1 AND sublevel = $2',
      [belt_name, sublevel]
    );
    const { rows } = await pool.query(
      'INSERT INTO belt_level_projects (belt_name, sublevel, project_name, project_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [belt_name, parseInt(sublevel), project_name, maxOrder[0].max + 1]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error adding belt project:', err);
    res.status(500).json({ error: 'Failed to add project' });
  }
});

// PATCH /api/curriculum/belt-projects/:id — rename a project
router.patch('/belt-projects/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { project_name } = req.body;
  if (!project_name) return res.status(400).json({ error: 'project_name is required' });
  try {
    const { rows } = await pool.query(
      'UPDATE belt_level_projects SET project_name = $1 WHERE id = $2 RETURNING *',
      [project_name, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Project not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Error renaming belt project:', err);
    res.status(500).json({ error: 'Failed to rename project' });
  }
});

// DELETE /api/curriculum/belt-projects/:id
router.delete('/belt-projects/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rowCount } = await pool.query('DELETE FROM belt_level_projects WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Project not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting belt project:', err);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

module.exports = router;
