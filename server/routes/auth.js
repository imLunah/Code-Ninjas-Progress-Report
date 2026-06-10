const express = require('express');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const { requireManager } = require('../middleware/auth');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

// POST /api/auth/login
router.post('/login', loginLimiter, async (req, res) => {
  const { username, password, keep_signed_in } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const pool = req.app.get('db');
    const { rows } = await pool.query(
      'SELECT id, username, display_name, role, location_id, profile_pic_url, password_hash, must_reset_password FROM users WHERE LOWER(username) = LOWER($1) AND active = true',
      [username]
    );
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Verify location is still active before issuing a session (admin exempt — can switch locations)
    const { rows: locationRows } = await pool.query(
      'SELECT id, name, slug FROM locations WHERE id = $1 AND active = true',
      [user.location_id]
    );
    const activeLocation = locationRows[0];
    if (!activeLocation && user.role !== 'admin') {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    await new Promise((resolve, reject) => {
      req.session.regenerate((err) => (err ? reject(err) : resolve()));
    });

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.displayName = user.display_name;
    req.session.activeLocationId = user.location_id;
    req.session.homeLocationId = user.location_id;
    req.session.mustResetPassword = !!user.must_reset_password;
    req.session.cookie.maxAge = keep_signed_in
      ? 30 * 24 * 60 * 60 * 1000  // 30 days
      : null;                       // session cookie — expires when browser closes

    await new Promise((resolve, reject) => {
      req.session.save((err) => (err ? reject(err) : resolve()));
    });
    const availableLocations = ['manager', 'admin'].includes(user.role)
      ? (await pool.query('SELECT id, name, slug FROM locations WHERE active = true ORDER BY name')).rows
      : (activeLocation ? [activeLocation] : []);

    const { rows: annRows } = await pool.query(`SELECT value FROM app_settings WHERE key = 'announcement'`);
    const announcement = annRows[0]?.value || null;

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      homeLocationId: user.location_id,
      profilePicUrl: user.profile_pic_url || null,
      activeLocation: activeLocation ?? null,
      availableLocations,
      announcement,
      mustResetPassword: !!user.must_reset_password,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out' });
  });
});

// POST /api/auth/switch-location (manager only)
router.post('/switch-location', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  const { locationId } = req.body;
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });

  try {
    const { rows } = await pool.query(
      'SELECT id, name, slug FROM locations WHERE id = $1 AND active = true',
      [locationId]
    );
    const location = rows[0];
    if (!location) return res.status(403).json({ error: 'Location not found or inactive' });
    req.session.activeLocationId = location.id;
    res.json({ activeLocation: location });
  } catch (err) {
    console.error('Switch location error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  if (!req.session.userId) {
    return res.status(200).json(null);
  }

  try {
    const pool = req.app.get('db');
    const { rows } = await pool.query(
      'SELECT id, username, display_name, role, location_id, profile_pic_url, must_reset_password, onboarded_at FROM users WHERE id = $1',
      [req.session.userId]
    );
    const user = rows[0];

    if (!user) {
      return res.status(200).json(null);
    }

    const { rows: [activeLocation] } = await pool.query(
      'SELECT id, name, slug FROM locations WHERE id = $1 AND active = true',
      [req.session.activeLocationId]
    );
    const availableLocations = ['manager', 'admin'].includes(user.role)
      ? (await pool.query('SELECT id, name, slug FROM locations WHERE active = true ORDER BY name')).rows
      : (activeLocation ? [activeLocation] : []);

    const { rows: annRows } = await pool.query(`SELECT value FROM app_settings WHERE key = 'announcement'`);
    const announcement = annRows[0]?.value || null;

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      homeLocationId: user.location_id,
      profilePicUrl: user.profile_pic_url || null,
      activeLocation: activeLocation ?? null,
      availableLocations,
      announcement,
      mustResetPassword: req.session.mustResetPassword ?? false,
      onboarded: !!user.onboarded_at,
    });
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
