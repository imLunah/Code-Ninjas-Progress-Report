const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');

const SALT_ROUNDS = 10;

function generateTempPassword() {
  const digits = crypto.randomInt(1000, 9999);
  return `Ninja${digits}!`;
}

// GET /api/admin/locations
router.get('/locations', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT l.id, l.name, l.slug, l.created_at,
             COUNT(DISTINCT s.id) FILTER (WHERE s.active = true)::int AS student_count,
             COUNT(DISTINCT u.id) FILTER (WHERE u.active = true AND u.role IN ('manager','sensei'))::int AS staff_count
      FROM locations l
      LEFT JOIN students s ON s.location_id = l.id
      LEFT JOIN users u ON u.location_id = l.id
      GROUP BY l.id
      ORDER BY l.created_at ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
});

// POST /api/admin/locations — create location + initial manager account
router.post('/locations', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { name, slug, manager_username, manager_display_name } = req.body;

  if (!name || !slug || !manager_username || !manager_display_name) {
    return res.status(400).json({ error: 'name, slug, manager_username, and manager_display_name are required' });
  }

  const cleanSlug = slug.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  if (!cleanSlug) return res.status(400).json({ error: 'Invalid slug' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: existingLoc } = await client.query('SELECT id FROM locations WHERE slug = $1 OR name = $2', [cleanSlug, name.trim()]);
    if (existingLoc.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'A location with that name or slug already exists' });
    }

    const { rows: existingUser } = await client.query('SELECT id FROM users WHERE username = $1', [manager_username.trim()]);
    if (existingUser.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Username already taken' });
    }

    const { rows: locRows } = await client.query(
      'INSERT INTO locations (name, slug) VALUES ($1, $2) RETURNING id, name, slug, created_at',
      [name.trim(), cleanSlug]
    );
    const location = locRows[0];

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    const { rows: userRows } = await client.query(
      'INSERT INTO users (username, password_hash, display_name, role, location_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, display_name, role',
      [manager_username.trim(), hash, manager_display_name.trim(), 'manager', location.id]
    );

    await client.query('COMMIT');
    res.status(201).json({ location, manager: userRows[0], temp_password: tempPassword });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating location:', err);
    res.status(500).json({ error: 'Failed to create location' });
  } finally {
    client.release();
  }
});

// DELETE /api/admin/locations/:id — only allowed if location has no active students/staff
router.delete('/locations/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  try {
    const { rows: deps } = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM students WHERE location_id = $1 AND active = true)::int AS students,
         (SELECT COUNT(*) FROM users WHERE location_id = $1 AND active = true)::int AS staff`,
      [id]
    );
    const { students, staff } = deps[0];
    if (students > 0 || staff > 0) {
      return res.status(409).json({ error: `Cannot delete — location has ${students} active student(s) and ${staff} active staff member(s)` });
    }
    await pool.query('DELETE FROM locations WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting location:', err);
    res.status(500).json({ error: 'Failed to delete location' });
  }
});

module.exports = router;
