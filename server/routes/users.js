const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { requireManager, requireSensei, requireOwnLocation } = require('../middleware/auth');
const { generateTempPassword } = require('../lib/tempPassword');

const SALT_ROUNDS = 10;

function validatePassword(pw) {
  return pw.length >= 6 && /[A-Z]/.test(pw) && /[^A-Za-z0-9]/.test(pw);
}

// GET /api/users
router.get('/', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  const { role } = req.query;
  const showInactive = req.query.inactive === 'true' && ['manager', 'admin'].includes(req.session.role);

  try {
    if (role === 'sensei' || role === 'staff') {
      const roleFilter = role === 'staff' ? `u.role IN ('sensei', 'manager')` : `u.role = 'sensei'`;
      const { rows } = await pool.query(`
        SELECT u.id, u.username, u.display_name, u.role, u.location_id, u.created_at,
               u.profile_pic_url, u.active, COUNT(pl.id)::int AS progress_log_count
        FROM users u
        LEFT JOIN progress_logs pl ON pl.sensei_id = u.id
        WHERE ${roleFilter} AND u.location_id = $1 AND u.active = $2
        GROUP BY u.id
        ORDER BY u.role ASC, u.display_name ASC
      `, [req.session.activeLocationId, !showInactive]);
      return res.json(rows);
    }

    // Always filter by own location — never expose other locations' users
    const { rows } = await pool.query(
      `SELECT id, username, display_name, role, location_id, created_at FROM users
       WHERE location_id = $1 AND active = true ORDER BY role, display_name ASC`,
      [req.session.activeLocationId]
    );
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
      'SELECT id, username, display_name, role, location_id, created_at, profile_pic_url FROM users WHERE id = $1 AND active = true AND location_id = $2',
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
  const { username, display_name, role } = req.body;

  if (!username || !display_name || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (username.length > 50) return res.status(400).json({ error: 'Username too long (max 50 chars)' });
  if (display_name.length > 80) return res.status(400).json({ error: 'Display name too long (max 80 chars)' });

  if (!['manager', 'sensei'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (existing[0]) return res.status(409).json({ error: 'Username already taken' });

    // Always use the manager's own location — never trust location_id from request body
    const locationId = req.session.activeLocationId;

    // Match the admin flow: generate a temp password, force reset → onboarding on first login.
    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    const { rows } = await pool.query(
      'INSERT INTO users (username, password_hash, display_name, role, location_id, must_reset_password) VALUES ($1, $2, $3, $4, $5, true) RETURNING id, username, display_name, role, location_id, created_at',
      [username, hash, display_name, role, locationId]
    );

    res.status(201).json({ ...rows[0], temp_password: tempPassword });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /api/users/me/avatar — save profile picture URL
router.patch('/me/avatar', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  const { profile_pic_url } = req.body;
  if (profile_pic_url) {
    const isPreset = /^\/profile\/[\w\-]+\.png$/.test(profile_pic_url);
    if (!isPreset) {
      try {
        const parsed = new URL(profile_pic_url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          return res.status(400).json({ error: 'Invalid URL' });
        }
      } catch {
        return res.status(400).json({ error: 'Invalid URL' });
      }
    }
  }
  try {
    await pool.query('UPDATE users SET profile_pic_url = $1 WHERE id = $2', [profile_pic_url || null, req.session.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Avatar update error:', err);
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// PATCH /api/users/me — any staff can update their own username/password
router.patch('/me', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  const { username, new_password, current_password, display_name } = req.body;
  if (!username?.trim() && !new_password?.trim() && !display_name?.trim()) {
    return res.status(400).json({ error: 'Nothing to update' });
  }
  if (display_name && display_name.trim().length > 80) {
    return res.status(400).json({ error: 'Display name too long (max 80 chars)' });
  }
  if (new_password?.trim() && !req.session.mustResetPassword) {
    if (!current_password?.trim()) return res.status(400).json({ error: 'Current password is required to set a new password' });
    const { rows: self } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.session.userId]);
    if (!self[0] || !(await bcrypt.compare(current_password.trim(), self[0].password_hash))) {
      return res.status(403).json({ error: 'Current password is incorrect' });
    }
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
    if (display_name?.trim()) {
      await pool.query('UPDATE users SET display_name = $1 WHERE id = $2', [display_name.trim(), req.session.userId]);
      req.session.displayName = display_name.trim();
    }
    if (new_password?.trim()) {
      if (!validatePassword(new_password.trim())) return res.status(400).json({ error: 'Password must be at least 6 characters and include an uppercase letter and a special character' });
      const hash = await bcrypt.hash(new_password.trim(), SALT_ROUNDS);
      await pool.query('UPDATE users SET password_hash = $1, must_reset_password = false WHERE id = $2', [hash, req.session.userId]);
      req.session.mustResetPassword = false;
    }
    res.json({ ok: true, username: username?.trim() || undefined, display_name: display_name?.trim() || undefined });
  } catch (err) {
    console.error('Self credential update error:', err);
    if (err.code === '23505') return res.status(409).json({ error: 'Username already taken' });
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
    if (rows[0].role !== 'sensei') return res.status(403).json({ error: 'Can only edit credentials of senseis' });
    if (username?.trim()) {
      const { rows: existing } = await pool.query(
        'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id != $2',
        [username.trim(), targetId]
      );
      if (existing[0]) return res.status(409).json({ error: 'Username already taken' });
      await pool.query('UPDATE users SET username = $1 WHERE id = $2', [username.trim(), targetId]);
    }
    if (new_password?.trim()) {
      if (!validatePassword(new_password.trim())) return res.status(400).json({ error: 'Password must be at least 6 characters and include an uppercase letter and a special character' });
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
    if (target.id === req.session.userId) return res.status(403).json({ error: 'Cannot remove your own account' });
    if (target.role !== 'sensei') return res.status(403).json({ error: 'Can only remove senseis' });

    await pool.query('UPDATE users SET active = false WHERE id = $1', [id]);
    res.json({ message: 'Staff member removed' });
  } catch (err) {
    console.error('Error removing user:', err);
    res.status(500).json({ error: 'Failed to remove sensei' });
  }
});

// PATCH /api/users/:id/restore
router.patch('/:id/restore', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND active = false AND location_id = $2',
      [id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Archived user not found' });
    await pool.query('UPDATE users SET active = true WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error restoring user:', err);
    res.status(500).json({ error: 'Failed to restore user' });
  }
});

module.exports = router;
