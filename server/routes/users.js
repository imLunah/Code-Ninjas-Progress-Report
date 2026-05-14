const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { requireManager, requireSensei, requireOwnLocation } = require('../middleware/auth');

const SALT_ROUNDS = 10;

// GET /api/users
router.get('/', requireSensei, async (req, res) => {
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

// GET /api/users/:id — sensei profile with their progress logs
router.get('/:id', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;

  try {
    const { rows: userRows } = await pool.query(
      'SELECT id, username, display_name, role, location_id, created_at FROM users WHERE id = $1 AND active = true AND location_id = $2',
      [id, req.session.activeLocationId]
    );
    const user = userRows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { rows: logs } = await pool.query(`
      SELECT pl.id, pl.session_date, pl.notes, pl.belt_level_at, pl.belt_sublevel_at, pl.project_at, pl.status_at,
             s.full_name AS student_name
      FROM progress_logs pl
      JOIN students s ON pl.student_id = s.id
      WHERE pl.sensei_id = $1 AND s.location_id = $2
      ORDER BY pl.session_date DESC, pl.created_at DESC
    `, [id, req.session.activeLocationId]);

    res.json({ ...user, progress_logs: logs });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
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

// PATCH /api/users/me — any staff can update their own username/password
router.patch('/me', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  const { username, new_password } = req.body;
  if (!username?.trim() && !new_password?.trim()) {
    return res.status(400).json({ error: 'Nothing to update' });
  }
  try {
    if (username?.trim()) {
      const { rows } = await pool.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [username.trim(), req.session.userId]
      );
      if (rows[0]) return res.status(409).json({ error: 'Username already taken' });
      await pool.query('UPDATE users SET username = $1 WHERE id = $2', [username.trim(), req.session.userId]);
    }
    if (new_password?.trim()) {
      if (new_password.trim().length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      const hash = await bcrypt.hash(new_password.trim(), SALT_ROUNDS);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, req.session.userId]);
    }
    res.json({ ok: true, username: username?.trim() || undefined });
  } catch (err) {
    console.error('Self credential update error:', err);
    res.status(500).json({ error: 'Failed to update account' });
  }
});

// PATCH /api/users/:id/credentials — manager resets another user's credentials (same location)
router.patch('/:id/credentials', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const targetId = parseInt(req.params.id, 10);
  const { username, new_password } = req.body;
  if (!username?.trim() && !new_password?.trim()) {
    return res.status(400).json({ error: 'Nothing to update' });
  }
  try {
    const { rows } = await pool.query(
      'SELECT id, role FROM users WHERE id = $1 AND location_id = $2 AND active = true',
      [targetId, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });
    if (username?.trim()) {
      const { rows: existing } = await pool.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [username.trim(), targetId]
      );
      if (existing[0]) return res.status(409).json({ error: 'Username already taken' });
      await pool.query('UPDATE users SET username = $1 WHERE id = $2', [username.trim(), targetId]);
    }
    if (new_password?.trim()) {
      if (new_password.trim().length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      const hash = await bcrypt.hash(new_password.trim(), SALT_ROUNDS);
      await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, targetId]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Credential reset error:', err);
    res.status(500).json({ error: 'Failed to update credentials' });
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
