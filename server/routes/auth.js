const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { requireManager } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const db = req.app.get('db');
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.displayName = user.display_name;
    req.session.activeLocationId = user.location_id;
    req.session.homeLocationId = user.location_id;  // never changes on switch

    const activeLocation = db.prepare('SELECT id, name, slug FROM locations WHERE id = ?').get(user.location_id);
    const availableLocations = user.role === 'manager'
      ? db.prepare('SELECT id, name, slug FROM locations ORDER BY name').all()
      : [activeLocation];

    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      homeLocationId: user.location_id,
      activeLocation,
      availableLocations,
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
router.post('/switch-location', requireManager, (req, res) => {
  const db = req.app.get('db');
  const { locationId } = req.body;
  if (!locationId) return res.status(400).json({ error: 'locationId is required' });
  const location = db.prepare('SELECT id, name, slug FROM locations WHERE id = ?').get(locationId);
  if (!location) return res.status(404).json({ error: 'Location not found' });
  req.session.activeLocationId = location.id;
  res.json({ activeLocation: location });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const db = req.app.get('db');
  const user = db.prepare('SELECT id, username, display_name, role, location_id FROM users WHERE id = ?').get(req.session.userId);

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  const activeLocation = db.prepare('SELECT id, name, slug FROM locations WHERE id = ?').get(req.session.activeLocationId);
  const availableLocations = user.role === 'manager'
    ? db.prepare('SELECT id, name, slug FROM locations ORDER BY name').all()
    : [activeLocation];

  res.json({
    id: user.id,
    username: user.username,
    displayName: user.display_name,
    role: user.role,
    homeLocationId: user.location_id,
    activeLocation,
    availableLocations,
  });
});

module.exports = router;
