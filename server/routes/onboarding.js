const express = require('express');
const router = express.Router();
const { requireSensei } = require('../middleware/auth');

// POST /api/onboarding/complete — mark this user as onboarded (stops the Getting Started page
// from auto-showing on future logins). The page content itself is static/client-side.
router.post('/complete', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  try {
    await pool.query('UPDATE users SET onboarded_at = NOW() WHERE id = $1', [req.session.userId]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Error completing onboarding:', err);
    res.status(500).json({ error: 'Failed to update' });
  }
});

module.exports = router;
