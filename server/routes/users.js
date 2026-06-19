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
      // Scope by membership (user_locations) so staff assigned to this center show up
      // even when it isn't their home center. location_ids carries every center the
      // member belongs to so the client can render assigned-center badges.
      const { rows } = await pool.query(`
        SELECT u.id, u.username, u.display_name, u.role, u.location_id, u.created_at,
               u.profile_pic_url, u.active, COUNT(DISTINCT pl.id)::int AS progress_log_count,
               COALESCE(array_agg(DISTINCT ul.location_id) FILTER (WHERE ul.location_id IS NOT NULL), '{}') AS location_ids
        FROM users u
        LEFT JOIN progress_logs pl ON pl.sensei_id = u.id
        LEFT JOIN user_locations ul ON ul.user_id = u.id
        WHERE ${roleFilter} AND u.active = $2
          AND u.id IN (SELECT user_id FROM user_locations WHERE location_id = $1)
        GROUP BY u.id
        ORDER BY u.role ASC, u.display_name ASC
      `, [req.session.activeLocationId, !showInactive]);
      return res.json(rows);
    }

    // Scope by membership — never expose users who aren't assigned to this center
    const { rows } = await pool.query(
      `SELECT id, username, display_name, role, location_id, created_at FROM users
       WHERE id IN (SELECT user_id FROM user_locations WHERE location_id = $1)
         AND active = true ORDER BY role, display_name ASC`,
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
      `SELECT id, username, display_name, role, location_id, created_at, profile_pic_url FROM users
       WHERE id = $1 AND active = true
         AND EXISTS (SELECT 1 FROM user_locations ul WHERE ul.user_id = users.id AND ul.location_id = $2)`,
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
  const { username, display_name, role, location_ids } = req.body;

  if (!username || !display_name || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (username.length > 50) return res.status(400).json({ error: 'Username too long (max 50 chars)' });
  if (display_name.length > 80) return res.status(400).json({ error: 'Display name too long (max 80 chars)' });

  if (!['manager', 'sensei'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // CDs may assign new staff to any active center; default to the CD's current center.
  const requestedIds = Array.isArray(location_ids) && location_ids.length
    ? [...new Set(location_ids.map(Number).filter(Boolean))]
    : [req.session.activeLocationId];

  try {
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );
    if (existing[0]) return res.status(409).json({ error: 'Username already taken' });

    const { rows: validLocs } = await pool.query(
      'SELECT id FROM locations WHERE id = ANY($1) AND active = true',
      [requestedIds]
    );
    const validIds = validLocs.map((r) => r.id);
    if (!validIds.length) return res.status(400).json({ error: 'No valid centers selected' });
    // Home = the CD's active center if included, else the first valid center.
    const homeId = validIds.includes(req.session.activeLocationId) ? req.session.activeLocationId : validIds[0];

    // Match the admin flow: generate a temp password, force reset → onboarding on first login.
    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'INSERT INTO users (username, password_hash, display_name, role, location_id, must_reset_password) VALUES ($1, $2, $3, $4, $5, true) RETURNING id, username, display_name, role, location_id, created_at',
        [username, hash, display_name, role, homeId]
      );
      const newUser = rows[0];
      for (const locId of validIds) {
        await client.query(
          'INSERT INTO user_locations (user_id, location_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [newUser.id, locId]
        );
      }
      await client.query('COMMIT');
      res.status(201).json({ ...newUser, location_ids: validIds, temp_password: tempPassword });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /api/users/:id/locations — update a staff member's assigned centers
router.patch('/:id/locations', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const targetId = parseInt(req.params.id, 10);
  const { location_ids } = req.body;
  const requestedIds = [...new Set((location_ids || []).map(Number).filter(Boolean))];
  if (!requestedIds.length) return res.status(400).json({ error: 'Select at least one center' });

  try {
    // Target must be a non-admin staff member assigned to the CD's current center.
    const { rows } = await pool.query(
      `SELECT u.id FROM users u
       WHERE u.id = $1 AND u.role != 'admin'
         AND EXISTS (SELECT 1 FROM user_locations ul WHERE ul.user_id = u.id AND ul.location_id = $2)`,
      [targetId, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Staff member not found' });

    const { rows: validLocs } = await pool.query(
      'SELECT id FROM locations WHERE id = ANY($1) AND active = true',
      [requestedIds]
    );
    const validIds = validLocs.map((r) => r.id);
    if (!validIds.length) return res.status(400).json({ error: 'No valid centers selected' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM user_locations WHERE user_id = $1', [targetId]);
      for (const locId of validIds) {
        await client.query('INSERT INTO user_locations (user_id, location_id) VALUES ($1, $2)', [targetId, locId]);
      }
      // Keep the current home if it's still assigned, otherwise fall back to the first center.
      const { rows: cur } = await client.query('SELECT location_id FROM users WHERE id = $1', [targetId]);
      const homeId = validIds.includes(cur[0]?.location_id) ? cur[0].location_id : validIds[0];
      await client.query('UPDATE users SET location_id = $1 WHERE id = $2', [homeId, targetId]);
      await client.query('COMMIT');
      res.json({ ok: true, location_ids: validIds });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error updating user locations:', err);
    res.status(500).json({ error: 'Failed to update centers' });
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

// PATCH /api/users/me/theme — persist the user's theme so it follows them across devices
router.patch('/me/theme', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  const { mode, accent } = req.body;
  if (mode && !['light', 'dark'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode' });
  }
  if (accent && (typeof accent !== 'string' || accent.length > 20)) {
    return res.status(400).json({ error: 'Invalid accent' });
  }
  try {
    await pool.query(
      'UPDATE users SET theme_mode = $1, theme_accent = $2 WHERE id = $3',
      [mode || null, accent || null, req.session.userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Theme save error:', err);
    res.status(500).json({ error: 'Failed to save theme' });
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
      `SELECT id, role FROM users WHERE id = $1 AND active = true
         AND EXISTS (SELECT 1 FROM user_locations ul WHERE ul.user_id = users.id AND ul.location_id = $2)`,
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

// POST /api/users/:id/reset-login — regenerate a temp password and force onboarding.
// Used for CD/admin staff (who set their own password via the welcome flow rather than
// having a manager type one). Works for any non-admin staff member at the CD's center.
router.post('/:id/reset-login', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const targetId = parseInt(req.params.id, 10);
  try {
    const { rows } = await pool.query(
      `SELECT id, username, role FROM users WHERE id = $1 AND active = true AND role != 'admin'
         AND EXISTS (SELECT 1 FROM user_locations ul WHERE ul.user_id = users.id AND ul.location_id = $2)`,
      [targetId, req.session.activeLocationId]
    );
    const target = rows[0];
    if (!target) return res.status(404).json({ error: 'Staff member not found' });

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    await pool.query(
      'UPDATE users SET password_hash = $1, must_reset_password = true WHERE id = $2',
      [hash, targetId]
    );
    res.json({ username: target.username, temp_password: tempPassword });
  } catch (err) {
    console.error('Error resetting login:', err);
    res.status(500).json({ error: 'Failed to reset login' });
  }
});

// DELETE /api/users/:id (soft delete — manager only, own location, senseis only)
router.delete('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT id, role FROM users WHERE id = $1 AND active = true
         AND EXISTS (SELECT 1 FROM user_locations ul WHERE ul.user_id = users.id AND ul.location_id = $2)`,
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
      `SELECT id FROM users WHERE id = $1 AND active = false
         AND EXISTS (SELECT 1 FROM user_locations ul WHERE ul.user_id = users.id AND ul.location_id = $2)`,
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

// DELETE /api/users/:id/permanent — hard-delete a sensei at the manager's own center
router.delete('/:id/permanent', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT id, role FROM users WHERE id = $1
         AND EXISTS (SELECT 1 FROM user_locations ul WHERE ul.user_id = users.id AND ul.location_id = $2)`,
      [id, req.session.activeLocationId]
    );
    const target = rows[0];
    if (!target) return res.status(404).json({ error: 'User not found' });
    if (target.id === req.session.userId) return res.status(403).json({ error: 'Cannot delete your own account' });
    if (target.role !== 'sensei') return res.status(403).json({ error: 'Can only delete senseis' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Comments this sensei left on OTHER senseis' logs (not covered by the cascade below)
      await client.query('DELETE FROM progress_log_comments WHERE user_id = $1', [id]);
      // This sensei's own logs — cascades to remaining comments on those logs
      await client.query('DELETE FROM progress_logs WHERE sensei_id = $1', [id]);
      // Club session comments by this user (NOT NULL FK — can't nullify)
      await client.query('DELETE FROM club_session_comments WHERE user_id = $1', [id]);
      // Nullify nullable references so real clubs/sessions/assignments survive
      await client.query('UPDATE daily_assignments SET sensei_id = NULL WHERE sensei_id = $1', [id]);
      await client.query('UPDATE club_sessions SET sensei_id = NULL WHERE sensei_id = $1', [id]);
      await client.query('UPDATE club_definitions SET created_by = NULL WHERE created_by = $1', [id]);
      await client.query('UPDATE announcements SET created_by = NULL WHERE created_by = $1', [id]);
      await client.query('DELETE FROM users WHERE id = $1', [id]);
      await client.query('COMMIT');
      res.json({ ok: true });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error permanently deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
