const express = require('express');
const router = express.Router();
const { requireSensei } = require('../middleware/auth');

// Release notes are authored by the developer directly (DB), not in-app.
// These endpoints are read-only: the What's New modal and Changelog page.

// GET /api/releases — published releases, newest first (Changelog page). Any staff.
router.get('/', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT r.id, r.title, r.version, r.body_md, r.media, r.published_at, u.display_name AS author
      FROM releases r
      LEFT JOIN users u ON u.id = r.created_by
      WHERE r.published = TRUE
      ORDER BY r.published_at DESC NULLS LAST, r.id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching releases:', err);
    res.status(500).json({ error: 'Failed to fetch releases' });
  }
});

// GET /api/releases/unseen — published releases newer than the user's last-seen marker (modal).
router.get('/unseen', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT r.id, r.title, r.version, r.body_md, r.media, r.published_at
      FROM releases r
      WHERE r.published = TRUE
        AND r.published_at > COALESCE(
          (SELECT last_seen_release_at FROM users WHERE id = $1),
          TIMESTAMP 'epoch'
        )
      ORDER BY r.published_at DESC NULLS LAST, r.id DESC
      LIMIT 10
    `, [req.session.userId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching unseen releases:', err);
    res.status(500).json({ error: 'Failed to fetch unseen releases' });
  }
});

// POST /api/releases/seen — mark everything published so far as seen for this user.
router.post('/seen', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  try {
    await pool.query('UPDATE users SET last_seen_release_at = NOW() WHERE id = $1', [req.session.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error marking releases seen:', err);
    res.status(500).json({ error: 'Failed to update' });
  }
});

module.exports = router;
