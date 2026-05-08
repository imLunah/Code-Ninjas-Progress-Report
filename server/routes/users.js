const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { requireManager, requireOwnLocation } = require('../middleware/auth');

const SALT_ROUNDS = 10;

// GET /api/users
router.get('/', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  const { role } = req.query;

  try {
    if (role === 'sensei') {
      const { rows } = await pool.query(`
        SELECT u.id, u.username, u.display_name, u.role, u.location_id, u.created_at,
               COUNT(pl.id)::int AS progress_log_count
        FROM users u
        LEFT JOIN progress_logs pl ON pl.sensei_id = u.id
        WHERE u.role = 'sensei' AND u.location_id = $1 AND u.active = true
        GROUP BY u.id
        ORDER BY u.display_name ASC
      `, [req.session.activeLocationId]);
      return res.json(rows);
    }

    let query = 'SELECT id, username, display_name, role, location_id, created_at FROM users';
    const conditions = [];
    const params = [];
    let paramCount = 0;

    if (role) {
      paramCount++;
      conditions.push(`role = $${paramCount}`);
      params.push(role);
    }

    if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
    query += ' ORDER BY role, display_name ASC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users
router.post('/', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { username, password, display_name, role } = req.body;

  if (!username || !password || !display_name || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!['manager', 'sensei'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (existing[0]) return res.status(409).json({ error: 'Username already taken' });

    const locationId = role === 'sensei'
      ? req.session.activeLocationId
      : (req.body.location_id || req.session.activeLocationId);

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await pool.query(
      'INSERT INTO users (username, password_hash, display_name, role, location_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, display_name, role, location_id, created_at',
      [username, hash, display_name, role, locationId]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE /api/users/:id (soft delete — manager only, own location, senseis only)
router.delete('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      'SELECT id, role FROM users WHERE id = $1 AND active = true AND location_id = $2',
      [id, req.session.activeLocationId]
    );
    const target = rows[0];
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.role !== 'sensei') return res.status(403).json({ error: 'Can only remove sensei accounts' });

    await pool.query('UPDATE users SET active = false WHERE id = $1', [id]);
    res.json({ message: 'Sensei removed' });
  } catch (err) {
    console.error('Error removing user:', err);
    res.status(500).json({ error: 'Failed to remove sensei' });
  }
});

module.exports = router;
