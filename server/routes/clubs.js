const express = require('express');
const router = express.Router();
const { requireAuth, requireSensei, requireManager, requireOwnLocation } = require('../middleware/auth');

const CLUB_NAMES = ['3D Design Club', 'Minecraft Club', 'Roblox Club'];

const SESSION_SELECT = `
  SELECT
    cs.id, cs.club_name, cs.session_date, cs.notes, cs.created_at,
    u.display_name AS sensei_name,
    COALESCE(
      (SELECT json_agg(json_build_object('id', s.id, 'full_name', s.full_name) ORDER BY s.full_name)
       FROM club_attendees ca JOIN students s ON ca.student_id = s.id
       WHERE ca.club_session_id = cs.id),
      '[]'::json
    ) AS attendees,
    COALESCE(
      (SELECT json_agg(json_build_object('id', c.id, 'user_name', c.user_name, 'body', c.body, 'created_at', c.created_at) ORDER BY c.created_at ASC)
       FROM club_session_comments c WHERE c.session_id = cs.id),
      '[]'::json
    ) AS comments
  FROM club_sessions cs
  LEFT JOIN users u ON cs.sensei_id = u.id
`;

// GET /api/clubs — all sessions for this location (optional ?club= filter)
router.get('/', requireAuth, async (req, res) => {
  const pool = req.app.get('db');
  try {
    let query = SESSION_SELECT + ' WHERE cs.location_id = $1';
    const params = [req.session.activeLocationId];
    if (req.query.club) {
      query += ' AND cs.club_name = $2';
      params.push(req.query.club);
    }
    query += ' ORDER BY cs.session_date DESC, cs.created_at DESC LIMIT 50';
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Club sessions fetch error:', err);
    res.status(500).json({ error: 'Failed to load club sessions' });
  }
});

// POST /api/clubs — create a club session (manager only)
router.post('/', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { club_name, session_date, notes, student_ids } = req.body;

  if (!club_name || !CLUB_NAMES.includes(club_name)) {
    return res.status(400).json({ error: 'Invalid club name' });
  }
  if (!Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({ error: 'At least one student is required' });
  }

  const date = session_date || new Date().toISOString().split('T')[0];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO club_sessions (club_name, session_date, location_id, sensei_id, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [club_name, date, req.session.activeLocationId, req.session.userId, notes?.trim() || null]
    );
    const sessionId = rows[0].id;
    for (const sid of student_ids) {
      await client.query(
        'INSERT INTO club_attendees (club_session_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [sessionId, sid]
      );
    }
    await client.query('COMMIT');
    res.status(201).json({ id: sessionId });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Club session create error:', err);
    res.status(500).json({ error: 'Failed to log club session' });
  } finally {
    client.release();
  }
});

// ─── Club profile routes (must come before /:id routes) ──────────────────────

// GET /api/clubs/profile/:clubName — pinned note + resources for a club
router.get('/profile/:clubName', requireAuth, async (req, res) => {
  const pool = req.app.get('db');
  const clubName = decodeURIComponent(req.params.clubName);
  if (!CLUB_NAMES.includes(clubName)) return res.status(400).json({ error: 'Invalid club' });

  try {
    const { rows: profileRows } = await pool.query(
      'SELECT * FROM club_profiles WHERE club_name = $1 AND location_id = $2',
      [clubName, req.session.activeLocationId]
    );
    const { rows: resourceRows } = await pool.query(
      'SELECT * FROM club_resources WHERE club_name = $1 AND location_id = $2 ORDER BY created_at DESC',
      [clubName, req.session.activeLocationId]
    );
    res.json({ profile: profileRows[0] || null, resources: resourceRows });
  } catch (err) {
    console.error('Club profile fetch error:', err);
    res.status(500).json({ error: 'Failed to load club profile' });
  }
});

// PATCH /api/clubs/profile/:clubName/pinned-note
router.patch('/profile/:clubName/pinned-note', requireSensei, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const clubName = decodeURIComponent(req.params.clubName);
  const { note } = req.body;
  if (!CLUB_NAMES.includes(clubName)) return res.status(400).json({ error: 'Invalid club' });

  try {
    await pool.query(
      `INSERT INTO club_profiles (club_name, location_id, pinned_note, pinned_note_author, pinned_note_updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (club_name, location_id) DO UPDATE
       SET pinned_note = $3, pinned_note_author = $4, pinned_note_updated_at = NOW()`,
      [clubName, req.session.activeLocationId, note?.trim() || null, req.session.displayName]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Club pinned note error:', err);
    res.status(500).json({ error: 'Failed to save note' });
  }
});

// POST /api/clubs/profile/:clubName/resources
router.post('/profile/:clubName/resources', requireSensei, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const clubName = decodeURIComponent(req.params.clubName);
  const { title, url } = req.body;
  if (!CLUB_NAMES.includes(clubName)) return res.status(400).json({ error: 'Invalid club' });
  if (!title?.trim() || !url?.trim()) return res.status(400).json({ error: 'Title and URL are required' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO club_resources (club_name, location_id, title, url, added_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [clubName, req.session.activeLocationId, title.trim(), url.trim(), req.session.displayName]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Club resource add error:', err);
    res.status(500).json({ error: 'Failed to add resource' });
  }
});

// DELETE /api/clubs/resources/:id
router.delete('/resources/:id', requireSensei, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    await pool.query(
      'DELETE FROM club_resources WHERE id = $1 AND location_id = $2',
      [req.params.id, req.session.activeLocationId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('Club resource delete error:', err);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

// GET /api/clubs/sessions/:id — single session detail
router.get('/sessions/:id', requireAuth, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      SESSION_SELECT + ' WHERE cs.id = $1 AND cs.location_id = $2',
      [req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Session not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Club session detail error:', err);
    res.status(500).json({ error: 'Failed to load session' });
  }
});

// ─── Session-scoped routes ────────────────────────────────────────────────────

// PATCH /api/clubs/:id/attendees — manager updates attendee list
router.patch('/:id/attendees', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { student_ids } = req.body;
  if (!Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({ error: 'At least one student is required' });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      'SELECT id FROM club_sessions WHERE id = $1 AND location_id = $2',
      [req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Session not found' }); }
    await client.query('DELETE FROM club_attendees WHERE club_session_id = $1', [req.params.id]);
    for (const sid of student_ids) {
      await client.query(
        'INSERT INTO club_attendees (club_session_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.params.id, sid]
      );
    }
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to update attendees' });
  } finally {
    client.release();
  }
});

// PATCH /api/clubs/:id/notes — sensei adds/edits notes
router.patch('/:id/notes', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  const { notes } = req.body;
  try {
    const { rows } = await pool.query(
      `UPDATE club_sessions SET notes = $1, sensei_id = $2 WHERE id = $3 AND location_id = $4 RETURNING id`,
      [notes?.trim() || null, req.session.userId, req.params.id, req.session.activeLocationId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Session not found' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save notes' });
  }
});

// POST /api/clubs/:id/comments — any staff can comment
router.post('/:id/comments', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  const { body } = req.body;
  if (!body?.trim()) return res.status(400).json({ error: 'Comment cannot be empty' });
  try {
    const { rows: sessionRows } = await pool.query(
      'SELECT id FROM club_sessions WHERE id = $1 AND location_id = $2',
      [req.params.id, req.session.activeLocationId]
    );
    if (!sessionRows[0]) return res.status(404).json({ error: 'Session not found' });
    const { rows } = await pool.query(
      `INSERT INTO club_session_comments (session_id, user_id, user_name, body) VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.params.id, req.session.userId, req.session.displayName, body.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save comment' });
  }
});

// DELETE /api/clubs/:id — manager only
router.delete('/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    await pool.query(
      'DELETE FROM club_sessions WHERE id = $1 AND location_id = $2',
      [req.params.id, req.session.activeLocationId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete club session' });
  }
});

module.exports = router;
