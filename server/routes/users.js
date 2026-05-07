const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { requireManager } = require('../middleware/auth');

const SALT_ROUNDS = 10;

// GET /api/users
router.get('/', requireManager, (req, res) => {
  const db = req.app.get('db');
  const { role } = req.query;

  let query = 'SELECT id, username, display_name, role, created_at FROM users';
  const params = [];

  if (role) {
    query += ' WHERE role = ?';
    params.push(role);
  }

  query += ' ORDER BY role, display_name ASC';

  try {
    const users = db.prepare(query).all(...params);
    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users
router.post('/', requireManager, async (req, res) => {
  const db = req.app.get('db');
  const { username, password, display_name, role } = req.body;

  if (!username || !password || !display_name || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (!['manager', 'sensei'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = db.prepare(
      'INSERT INTO users (username, password_hash, display_name, role) VALUES (?, ?, ?, ?)'
    ).run(username, hash, display_name, role);

    const user = db.prepare('SELECT id, username, display_name, role, created_at FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(user);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

module.exports = router;
