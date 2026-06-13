const express = require('express');
const router = express.Router();
const { requireSensei, requireAdmin } = require('../middleware/auth');
const storage = require('../lib/storage');

const MAX_MEDIA = 20;
const BUCKET = 'club-resources';

// Validate + normalize the media array from the client. Each item is either a
// freshly uploaded file ({ type, path } — signed server-side) or an existing
// item being kept ({ type, url }). Only release/ paths are accepted.
async function cleanMedia(media) {
  if (!Array.isArray(media)) return [];
  const items = media
    .filter((m) => m && (m.type === 'image' || m.type === 'video'))
    .slice(0, MAX_MEDIA);
  const out = [];
  for (const m of items) {
    if (typeof m.path === 'string' && m.path.startsWith('releases/') && !m.path.includes('..')) {
      try {
        out.push({ type: m.type, url: await storage.createSignedReadUrl(BUCKET, m.path) });
      } catch { /* skip un-signable item */ }
    } else if (typeof m.url === 'string' && m.url.trim()) {
      out.push({ type: m.type, url: m.url.trim() });
    }
  }
  return out;
}

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

// GET /api/releases/all — every release incl. drafts (admin authoring view).
router.get('/all', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT id, title, version, body_md, media, published, published_at, created_at, updated_at
      FROM releases
      ORDER BY COALESCE(published_at, created_at) DESC, id DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching all releases:', err);
    res.status(500).json({ error: 'Failed to fetch releases' });
  }
});

// POST /api/releases — admin creates (draft unless published:true).
router.post('/', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { title, version, body_md, media, published } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (title.trim().length > 120) return res.status(400).json({ error: 'Title max 120 characters' });
  try {
    const pub = !!published;
    const { rows } = await pool.query(`
      INSERT INTO releases (title, version, body_md, media, published, published_at, created_by)
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
      RETURNING id, title, version, body_md, media, published, published_at, created_at, updated_at
    `, [
      title.trim(),
      version?.trim() || null,
      body_md || '',
      JSON.stringify(await cleanMedia(media)),
      pub,
      pub ? new Date().toISOString() : null,
      req.session.userId,
    ]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creating release:', err);
    res.status(500).json({ error: 'Failed to create release' });
  }
});

// PATCH /api/releases/:id — admin edits / publishes / unpublishes.
router.patch('/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  const { title, version, body_md, media, published } = req.body;
  if (title !== undefined && !title?.trim()) return res.status(400).json({ error: 'Title is required' });
  try {
    const { rows: existing } = await pool.query('SELECT published FROM releases WHERE id = $1', [id]);
    if (!existing[0]) return res.status(404).json({ error: 'Release not found' });

    const willPublish = published === undefined ? existing[0].published : !!published;
    // Set published_at the first time it goes live; clear it if unpublished.
    let publishedAtExpr;
    if (willPublish && !existing[0].published) publishedAtExpr = new Date().toISOString();
    else if (!willPublish) publishedAtExpr = null;
    else publishedAtExpr = undefined; // leave as-is

    const { rows } = await pool.query(`
      UPDATE releases SET
        title = COALESCE($1, title),
        version = $2,
        body_md = COALESCE($3, body_md),
        media = COALESCE($4::jsonb, media),
        published = $5,
        published_at = CASE WHEN $7::boolean THEN $6 ELSE published_at END,
        updated_at = NOW()
      WHERE id = $8
      RETURNING id, title, version, body_md, media, published, published_at, created_at, updated_at
    `, [
      title?.trim() ?? null,
      version?.trim() || null,
      body_md ?? null,
      media === undefined ? null : JSON.stringify(await cleanMedia(media)),
      willPublish,
      publishedAtExpr ?? null,
      publishedAtExpr !== undefined,
      id,
    ]);
    res.json(rows[0]);
  } catch (err) {
    console.error('Error updating release:', err);
    res.status(500).json({ error: 'Failed to update release' });
  }
});

// DELETE /api/releases/:id
router.delete('/:id', requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query('DELETE FROM releases WHERE id = $1 RETURNING id, media', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Release not found' });
    // Clean up uploaded media objects.
    const media = Array.isArray(rows[0].media) ? rows[0].media : [];
    for (const m of media) {
      if (m && typeof m.url === 'string') await storage.removeByUrl(BUCKET, m.url);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting release:', err);
    res.status(500).json({ error: 'Failed to delete release' });
  }
});

module.exports = router;
