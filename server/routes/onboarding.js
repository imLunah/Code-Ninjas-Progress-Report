const express = require('express');
const router = express.Router();
const { requireSensei, requireAdmin } = require('../middleware/auth');

const MAX_MEDIA = 10;
const AUDIENCES = ['all', 'sensei', 'manager'];

function cleanMedia(media) {
  if (!Array.isArray(media)) return [];
  return media
    .filter((m) => m && (m.type === 'image' || m.type === 'video') && typeof m.url === 'string' && m.url.trim())
    .slice(0, MAX_MEDIA)
    .map((m) => ({ type: m.type, url: m.url.trim() }));
}

// Which audiences a given role should see (CD/admin = manager track; sensei = sensei track).
function audiencesFor(role) {
  return role === 'sensei' ? ['all', 'sensei'] : ['all', 'manager'];
}

// GET /api/onboarding/steps — published steps for the caller's track, in order (the tour).
router.get('/steps', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT id, title, body_md, media, audience, step_order
      FROM onboarding_steps
      WHERE published = TRUE AND audience = ANY($1)
      ORDER BY step_order ASC, id ASC
    `, [audiencesFor(req.session.role)]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching onboarding steps:', err);
    res.status(500).json({ error: 'Failed to fetch onboarding' });
  }
});

// POST /api/onboarding/complete — mark this user as onboarded.
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

// GET /api/onboarding/steps/all — every step incl. drafts (admin authoring).
router.get('/steps/all', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT id, title, body_md, media, audience, step_order, published, created_at, updated_at
      FROM onboarding_steps
      ORDER BY step_order ASC, id ASC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching all onboarding steps:', err);
    res.status(500).json({ error: 'Failed to fetch onboarding' });
  }
});

// POST /api/onboarding/steps — admin creates.
router.post('/steps', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { title, body_md, media, audience, step_order, published } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (title.trim().length > 120) return res.status(400).json({ error: 'Title max 120 characters' });
  const aud = AUDIENCES.includes(audience) ? audience : 'all';
  try {
    const { rows } = await pool.query(`
      INSERT INTO onboarding_steps (title, body_md, media, audience, step_order, published)
      VALUES ($1, $2, $3::jsonb, $4, $5, $6)
      RETURNING id, title, body_md, media, audience, step_order, published, created_at, updated_at
    `, [
      title.trim(),
      body_md || '',
      JSON.stringify(cleanMedia(media)),
      aud,
      Number.isInteger(step_order) ? step_order : 0,
      !!published,
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating onboarding step:', err);
    res.status(500).json({ error: 'Failed to create step' });
  }
});

// PATCH /api/onboarding/steps/:id — admin edits / reorders / publishes.
router.patch('/steps/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  const { title, body_md, media, audience, step_order, published } = req.body;
  if (title !== undefined && !title?.trim()) return res.status(400).json({ error: 'Title is required' });
  const aud = audience === undefined ? null : (AUDIENCES.includes(audience) ? audience : 'all');
  try {
    const { rows: existing } = await pool.query('SELECT id FROM onboarding_steps WHERE id = $1', [id]);
    if (!existing[0]) return res.status(404).json({ error: 'Step not found' });

    const { rows } = await pool.query(`
      UPDATE onboarding_steps SET
        title = COALESCE($1, title),
        body_md = COALESCE($2, body_md),
        media = COALESCE($3::jsonb, media),
        audience = COALESCE($4, audience),
        step_order = COALESCE($5, step_order),
        published = COALESCE($6, published),
        updated_at = NOW()
      WHERE id = $7
      RETURNING id, title, body_md, media, audience, step_order, published, created_at, updated_at
    `, [
      title?.trim() ?? null,
      body_md ?? null,
      media === undefined ? null : JSON.stringify(cleanMedia(media)),
      aud,
      Number.isInteger(step_order) ? step_order : null,
      published === undefined ? null : !!published,
      id,
    ]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating onboarding step:', err);
    res.status(500).json({ error: 'Failed to update step' });
  }
});

// DELETE /api/onboarding/steps/:id
router.delete('/steps/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query('DELETE FROM onboarding_steps WHERE id = $1 RETURNING id', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Step not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting onboarding step:', err);
    res.status(500).json({ error: 'Failed to delete step' });
  }
});

module.exports = router;
