const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const { generateTempPassword } = require('../lib/tempPassword');
const { validateUsername } = require('../lib/username');

const SALT_ROUNDS = 10;

// GET /api/admin/locations
router.get('/locations', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT l.id, l.name, l.slug, l.active, l.created_at,
             COUNT(DISTINCT s.id) FILTER (WHERE s.active = true)::int AS student_count,
             COUNT(DISTINCT u.id) FILTER (WHERE u.active = true AND u.role IN ('manager','sensei'))::int AS staff_count
      FROM locations l
      LEFT JOIN students s ON s.location_id = l.id
      LEFT JOIN user_locations ul ON ul.location_id = l.id
      LEFT JOIN users u ON u.id = ul.user_id
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

    const checkedManager = validateUsername(manager_username);
    if (checkedManager.error) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: checkedManager.error });
    }
    const { rows: existingUser } = await client.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [checkedManager.value]);
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
      [checkedManager.value, hash, manager_display_name.trim(), 'manager', location.id]
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

// PATCH /api/admin/locations/:id — rename or toggle active
router.patch('/locations/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  const { name, active } = req.body;

  try {
    const { rows: existing } = await pool.query('SELECT * FROM locations WHERE id = $1', [id]);
    if (!existing[0]) return res.status(404).json({ error: 'Location not found' });

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) return res.status(400).json({ error: 'Name cannot be empty' });
      const { rows: conflict } = await pool.query('SELECT id FROM locations WHERE name = $1 AND id != $2', [trimmed, id]);
      if (conflict[0]) return res.status(409).json({ error: 'A location with that name already exists' });
    }

    const { rows } = await pool.query(
      `UPDATE locations SET
         name   = COALESCE($1, name),
         active = COALESCE($2, active)
       WHERE id = $3
       RETURNING id, name, slug, active, created_at`,
      [name?.trim() ?? null, active ?? null, id]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// DELETE /api/admin/locations/:id — cascade deletes all location data
router.delete('/locations/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check location exists
    const { rows: loc } = await client.query('SELECT id FROM locations WHERE id = $1', [id]);
    if (!loc[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Location not found' }); }

    // Club session dependents
    await client.query(`DELETE FROM club_attendees WHERE club_session_id IN (SELECT id FROM club_sessions WHERE location_id = $1)`, [id]);
    await client.query(`DELETE FROM club_session_comments WHERE session_id IN (SELECT id FROM club_sessions WHERE location_id = $1)`, [id]);
    await client.query('DELETE FROM club_sessions WHERE location_id = $1', [id]);
    await client.query('DELETE FROM club_profiles WHERE location_id = $1', [id]);
    await client.query('DELETE FROM club_resources WHERE location_id = $1', [id]);
    await client.query('DELETE FROM club_definitions WHERE location_id = $1', [id]);
    // club_members has CASCADE on location_id — handled automatically

    // Student dependents
    await client.query(`DELETE FROM progress_log_comments WHERE log_id IN (SELECT id FROM progress_logs WHERE student_id IN (SELECT id FROM students WHERE location_id = $1))`, [id]);
    await client.query(`DELETE FROM progress_logs WHERE student_id IN (SELECT id FROM students WHERE location_id = $1)`, [id]);
    await client.query(`DELETE FROM daily_assignments WHERE student_id IN (SELECT id FROM students WHERE location_id = $1)`, [id]);
    await client.query(`DELETE FROM student_programs WHERE student_id IN (SELECT id FROM students WHERE location_id = $1)`, [id]);
    await client.query('DELETE FROM students WHERE location_id = $1', [id]);

    // Nullify all FK references to users at this location before deleting them
    await client.query(`UPDATE progress_logs SET sensei_id = NULL WHERE sensei_id IN (SELECT id FROM users WHERE location_id = $1)`, [id]);
    await client.query(`UPDATE progress_log_comments SET user_id = NULL WHERE user_id IN (SELECT id FROM users WHERE location_id = $1)`, [id]);
    await client.query(`UPDATE club_sessions SET sensei_id = NULL WHERE sensei_id IN (SELECT id FROM users WHERE location_id = $1)`, [id]);
    await client.query(`UPDATE club_session_comments SET user_id = NULL WHERE user_id IN (SELECT id FROM users WHERE location_id = $1)`, [id]);
    await client.query(`UPDATE daily_assignments SET sensei_id = NULL WHERE sensei_id IN (SELECT id FROM users WHERE location_id = $1)`, [id]);
    await client.query(`UPDATE club_definitions SET created_by = NULL WHERE created_by IN (SELECT id FROM users WHERE location_id = $1)`, [id]);
    await client.query(`UPDATE app_settings SET updated_by = NULL WHERE updated_by IN (SELECT id FROM users WHERE location_id = $1)`, [id]);
    await client.query(`DELETE FROM users WHERE location_id = $1 AND role != 'admin'`, [id]);

    await client.query('DELETE FROM locations WHERE id = $1', [id]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting location:', err);
    res.status(500).json({ error: 'Failed to delete location' });
  } finally {
    client.release();
  }
});

// GET /api/admin/users
router.get('/users', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { location_id, role, inactive } = req.query;
  const showInactive = inactive === 'true';

  try {
    let query = `
      SELECT u.id, u.username, u.display_name, u.role, u.active, u.location_id, u.created_at,
             u.must_reset_password, l.name AS location_name,
             COALESCE(array_agg(DISTINCT ul.location_id) FILTER (WHERE ul.location_id IS NOT NULL), '{}') AS location_ids
      FROM users u
      LEFT JOIN locations l ON u.location_id = l.id
      LEFT JOIN user_locations ul ON ul.user_id = u.id
      WHERE u.role != 'admin'
        AND u.active = $1
    `;
    const params = [!showInactive];
    let p = 1;

    if (location_id) { p++; query += ` AND u.id IN (SELECT user_id FROM user_locations WHERE location_id = $${p})`; params.push(location_id); }
    if (role && ['manager', 'sensei'].includes(role)) { p++; query += ` AND u.role = $${p}`; params.push(role); }

    query += ` GROUP BY u.id, l.name ORDER BY l.name ASC, u.role ASC, u.display_name ASC`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching admin users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/admin/users
router.post('/users', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { username, display_name, role, location_id, location_ids } = req.body;

  // Accept a list of centers; fall back to the single location_id for older callers.
  const requestedIds = Array.isArray(location_ids) && location_ids.length
    ? [...new Set(location_ids.map(Number).filter(Boolean))]
    : (location_id ? [Number(location_id)] : []);

  if (!username?.trim() || !display_name?.trim() || !role || !requestedIds.length) {
    return res.status(400).json({ error: 'username, display_name, role, and at least one center are required' });
  }
  if (!['manager', 'sensei'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const checkedUser = validateUsername(username);
    if (checkedUser.error) return res.status(400).json({ error: checkedUser.error });
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [checkedUser.value]);
    if (existing[0]) return res.status(409).json({ error: 'Username already taken' });

    const { rows: validLocs } = await pool.query('SELECT id FROM locations WHERE id = ANY($1)', [requestedIds]);
    const validIds = validLocs.map((r) => r.id);
    if (!validIds.length) return res.status(400).json({ error: 'No valid centers selected' });
    const homeId = validIds[0];

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, SALT_ROUNDS);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        'INSERT INTO users (username, password_hash, display_name, role, location_id, must_reset_password) VALUES ($1, $2, $3, $4, $5, true) RETURNING id, username, display_name, role, location_id, active, created_at',
        [checkedUser.value, hash, display_name.trim(), role, homeId]
      );
      const newUser = rows[0];
      for (const locId of validIds) {
        await client.query('INSERT INTO user_locations (user_id, location_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [newUser.id, locId]);
      }
      const { rows: locRows } = await client.query('SELECT name FROM locations WHERE id = $1', [homeId]);
      await client.query('COMMIT');
      res.status(201).json({ ...newUser, location_ids: validIds, location_name: locRows[0]?.name, temp_password: tempPassword });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error creating admin user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  const { display_name, role, location_id, location_ids, active } = req.body;

  // When a center list is supplied, replace the user's membership and reset home.
  let validIds = null;
  if (Array.isArray(location_ids)) {
    const requestedIds = [...new Set(location_ids.map(Number).filter(Boolean))];
    if (!requestedIds.length) return res.status(400).json({ error: 'Select at least one center' });
    const { rows: validLocs } = await pool.query('SELECT id FROM locations WHERE id = ANY($1)', [requestedIds]);
    validIds = validLocs.map((r) => r.id);
    if (!validIds.length) return res.status(400).json({ error: 'No valid centers selected' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows: existing } = await client.query("SELECT * FROM users WHERE id = $1 AND role != 'admin'", [id]);
    if (!existing[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'User not found' }); }
    const u = existing[0];

    // Keep the current home if still assigned, otherwise fall back to the first center.
    const homeId = validIds
      ? (validIds.includes(u.location_id) ? u.location_id : validIds[0])
      : (location_id ?? u.location_id);

    const { rows } = await client.query(
      `UPDATE users SET display_name = $1, role = $2, location_id = $3, active = $4
       WHERE id = $5 RETURNING id, username, display_name, role, location_id, active`,
      [
        display_name ?? u.display_name,
        (role && ['manager', 'sensei'].includes(role)) ? role : u.role,
        homeId,
        active !== undefined ? active : u.active,
        id,
      ]
    );

    if (validIds) {
      await client.query('DELETE FROM user_locations WHERE user_id = $1', [id]);
      for (const locId of validIds) {
        await client.query('INSERT INTO user_locations (user_id, location_id) VALUES ($1, $2)', [id, locId]);
      }
    }

    const { rows: locRows } = await client.query('SELECT name FROM locations WHERE id = $1', [rows[0].location_id]);
    await client.query('COMMIT');
    res.json({ ...rows[0], location_ids: validIds ?? undefined, location_name: locRows[0]?.name });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating admin user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  } finally {
    client.release();
  }
});

// PATCH /api/admin/users/:id/reset-password
router.patch('/users/:id/reset-password', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;

  try {
    const { rows } = await pool.query("SELECT id, username FROM users WHERE id = $1 AND role != 'admin'", [id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash = $1, must_reset_password = true WHERE id = $2', [hash, id]);
    res.json({ username: rows[0].username, temp_password: tempPassword });
  } catch (err) {
    console.error('Error resetting password:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// DELETE /api/admin/users/:id — permanent hard delete, nullifies all FK references
router.delete('/users/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;

  try {
    const { rows } = await pool.query("SELECT id, username, role FROM users WHERE id = $1 AND role != 'admin'", [id]);
    if (!rows[0]) return res.status(404).json({ error: 'User not found' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Same rule as the center-level delete in routes/users.js: the person goes,
      // their session history stays and reads as "Deleted user". Nulling user_name
      // alongside user_id is what keeps their name from outliving the account.
      await client.query('UPDATE progress_logs SET sensei_id = NULL WHERE sensei_id = $1', [id]);
      await client.query('UPDATE progress_log_comments SET user_id = NULL, user_name = NULL WHERE user_id = $1', [id]);
      await client.query('UPDATE club_session_comments SET user_id = NULL, user_name = NULL WHERE user_id = $1', [id]);
      // Nullify the remaining FK references (all NO ACTION, so a miss fails the delete)
      await client.query('UPDATE daily_assignments SET sensei_id = NULL WHERE sensei_id = $1', [id]);
      await client.query('UPDATE club_sessions SET sensei_id = NULL WHERE sensei_id = $1', [id]);
      await client.query('UPDATE club_definitions SET created_by = NULL WHERE created_by = $1', [id]);
      await client.query('UPDATE club_resources SET created_by = NULL WHERE created_by = $1', [id]);
      await client.query('UPDATE app_settings SET updated_by = NULL WHERE updated_by = $1', [id]);
      await client.query('UPDATE announcements SET created_by = NULL WHERE created_by = $1', [id]);
      await client.query('UPDATE releases SET created_by = NULL WHERE created_by = $1', [id]);
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
    console.error('Error hard-deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// GET /api/admin/settings
router.get('/settings', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query('SELECT key, value, updated_at FROM app_settings');
    const settings = rows.reduce((acc, r) => ({ ...acc, [r.key]: r.value }), {});
    res.json(settings);
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/admin/settings/:key
router.put('/settings/:key', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { key } = req.params;
  const { value } = req.body;

  const ALLOWED_KEYS = ['announcement'];
  if (!ALLOWED_KEYS.includes(key)) return res.status(400).json({ error: 'Unknown setting key' });

  try {
    await pool.query(
      `INSERT INTO app_settings (key, value, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
      [key, value || null, req.session.userId]
    );
    res.json({ ok: true, key, value: value || null });
  } catch (err) {
    console.error('Error saving setting:', err);
    res.status(500).json({ error: 'Failed to save setting' });
  }
});

module.exports = router;
