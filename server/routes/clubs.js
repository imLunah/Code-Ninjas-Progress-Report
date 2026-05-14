const express = require('express');
const router = express.Router();
const { requireAuth, requireSensei, requireManager, requireOwnLocation } = require('../middleware/auth');

function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function getValidClubNames(pool, locationId) {
  const { rows } = await pool.query(
    'SELECT name FROM club_definitions WHERE location_id = $1 OR location_id IS NULL',
    [locationId]
  );
  return new Set(rows.map((r) => r.name));
}

const SESSION_SELECT = `
  SELECT
    cs.id, cs.club_name, cs.session_date, cs.notes, cs.created_at,
    cs.sensei_id,
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

// ─── Club definitions ─────────────────────────────────────────────────────────

// GET /api/clubs/definitions — all clubs available at this location
router.get('/definitions', requireAuth, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      `SELECT cd.id, cd.name, cd.slug, cd.description, cd.color_key, cd.location_id, cd.created_at, cd.schedule,
              u.display_name AS creator_name
       FROM club_definitions cd
       LEFT JOIN users u ON cd.created_by = u.id
       WHERE cd.location_id = $1 OR cd.location_id IS NULL
       ORDER BY cd.location_id NULLS FIRST, cd.created_at ASC`,
      [req.session.activeLocationId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Club definitions fetch error:', err);
    res.status(500).json({ error: 'Failed to load clubs' });
  }
});

// POST /api/clubs/definitions — manager creates a new club
router.post('/definitions', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { name, description, color_key, schedule } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Club name is required' });

  const slug = toSlug(name.trim());
  try {
    const { rows } = await pool.query(
      `INSERT INTO club_definitions (name, slug, description, color_key, location_id, created_by, schedule)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name.trim(), slug, description?.trim() || null, color_key || 'blue', req.session.activeLocationId, req.session.userId, schedule?.trim() || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A club with that name already exists' });
    console.error('Club definition create error:', err);
    res.status(500).json({ error: 'Failed to create club' });
  }
});

// PATCH /api/clubs/definitions/:id — manager edits a custom club
router.patch('/definitions/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { name, description, color_key } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'Club name is required' });
  try {
    const { rows: existing } = await pool.query(
      'SELECT id, location_id FROM club_definitions WHERE id = $1',
      [req.params.id]
    );
    if (!existing[0]) return res.status(404).json({ error: 'Club not found' });
    if (existing[0].location_id === null) return res.status(403).json({ error: 'Cannot edit a built-in club' });
    if (existing[0].location_id !== req.session.activeLocationId) return res.status(403).json({ error: 'Forbidden' });

    const { schedule } = req.body;
    const slug = toSlug(name.trim());
    const { rows } = await pool.query(
      `UPDATE club_definitions SET name = $1, slug = $2, description = $3, color_key = $4, schedule = $5
       WHERE id = $6 RETURNING *`,
      [name.trim(), slug, description?.trim() || null, color_key || 'blue', schedule?.trim() || null, req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'A club with that name already exists' });
    console.error('Club definition update error:', err);
    res.status(500).json({ error: 'Failed to update club' });
  }
});

// DELETE /api/clubs/definitions/:id — manager deletes a custom club
router.delete('/definitions/:id', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(
      'SELECT id, location_id FROM club_definitions WHERE id = $1',
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Club not found' });
    if (rows[0].location_id === null) return res.status(403).json({ error: 'Cannot delete a built-in club' });
    if (rows[0].location_id !== req.session.activeLocationId) return res.status(403).json({ error: 'Forbidden' });
    await pool.query('DELETE FROM club_definitions WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('Club definition delete error:', err);
    res.status(500).json({ error: 'Failed to delete club' });
  }
});

// ─── Session list / create ────────────────────────────────────────────────────

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

// POST /api/clubs — check in a club session (manager only); attendees/notes filled in later by senseis
router.post('/', requireManager, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { club_name, session_date, notes, student_ids } = req.body;

  if (!club_name) return res.status(400).json({ error: 'Club name is required' });

  const validClubs = await getValidClubNames(pool, req.session.activeLocationId);
  if (!validClubs.has(club_name)) return res.status(400).json({ error: 'Invalid club name' });

  const date = session_date || new Date().toISOString().split('T')[0];
  const ids = Array.isArray(student_ids) ? student_ids : [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rows } = await client.query(
      `INSERT INTO club_sessions (club_name, session_date, location_id, sensei_id, notes)
       VALUES ($1, $2, $3, NULL, $4) RETURNING id`,
      [club_name, date, req.session.activeLocationId, notes?.trim() || null]
    );
    const sessionId = rows[0].id;
    for (const sid of ids) {
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

// GET /api/clubs/profile/:clubName
router.get('/profile/:clubName', requireAuth, async (req, res) => {
  const pool = req.app.get('db');
  const clubName = decodeURIComponent(req.params.clubName);

  const validClubs = await getValidClubNames(pool, req.session.activeLocationId);
  if (!validClubs.has(clubName)) return res.status(400).json({ error: 'Invalid club' });

  try {
    const [profileRes, resourceRes, memberRes] = await Promise.all([
      pool.query('SELECT * FROM club_profiles WHERE club_name = $1 AND location_id = $2', [clubName, req.session.activeLocationId]),
      pool.query('SELECT * FROM club_resources WHERE club_name = $1 AND location_id = $2 ORDER BY created_at DESC', [clubName, req.session.activeLocationId]),
      pool.query('SELECT COUNT(*) AS count FROM club_members WHERE club_name = $1 AND location_id = $2', [clubName, req.session.activeLocationId]),
    ]);
    const profile = profileRes.rows[0] || null;
    const member_count = parseInt(memberRes.rows[0].count, 10);
    res.json({ profile, resources: resourceRes.rows, member_count });
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

  const validClubs = await getValidClubNames(pool, req.session.activeLocationId);
  if (!validClubs.has(clubName)) return res.status(400).json({ error: 'Invalid club' });

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
  const { title, url, resource_type, file_name } = req.body;

  const validClubs = await getValidClubNames(pool, req.session.activeLocationId);
  if (!validClubs.has(clubName)) return res.status(400).json({ error: 'Invalid club' });
  if (!title?.trim() || !url?.trim()) return res.status(400).json({ error: 'Title and URL are required' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO club_resources (club_name, location_id, title, url, added_by, resource_type, file_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [clubName, req.session.activeLocationId, title.trim(), url.trim(), req.session.displayName,
       resource_type || 'url', file_name?.trim() || null]
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
    const { rows } = await pool.query(
      'DELETE FROM club_resources WHERE id = $1 AND location_id = $2 RETURNING url, resource_type',
      [req.params.id, req.session.activeLocationId]
    );
    res.json({ ok: true, deleted: rows[0] || null });
  } catch (err) {
    console.error('Club resource delete error:', err);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

// GET /api/clubs/sessions/:id
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

// PATCH /api/clubs/:id/attendees — any staff can update the attendee list
router.patch('/:id/attendees', requireSensei, requireOwnLocation, async (req, res) => {
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
    const { rows: sessionInfo } = await client.query(
      'SELECT club_name, location_id FROM club_sessions WHERE id = $1', [req.params.id]
    );
    await client.query('DELETE FROM club_attendees WHERE club_session_id = $1', [req.params.id]);
    for (const sid of student_ids) {
      await client.query(
        'INSERT INTO club_attendees (club_session_id, student_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.params.id, sid]
      );
      if (sessionInfo[0]) {
        await client.query(
          'INSERT INTO club_members (club_name, location_id, student_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [sessionInfo[0].club_name, sessionInfo[0].location_id, sid]
        );
      }
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

// PATCH /api/clubs/:id/notes — managers edit any session; senseis edit only unclaimed or their own
router.patch('/:id/notes', requireSensei, requireOwnLocation, async (req, res) => {
  const pool = req.app.get('db');
  const { notes } = req.body;
  const isManager = req.session.role === 'manager';
  try {
    const ownershipClause = isManager ? '' : 'AND (sensei_id IS NULL OR sensei_id = $3)';
    const params = isManager
      ? [notes?.trim() || null, req.session.userId, req.params.id, req.session.activeLocationId]
      : [notes?.trim() || null, req.session.userId, req.session.userId, req.params.id, req.session.activeLocationId];

    const { rows } = await pool.query(
      `UPDATE club_sessions SET notes = $1, sensei_id = $2
       WHERE id = $${isManager ? 3 : 4} AND location_id = $${isManager ? 4 : 5}
       ${ownershipClause}
       RETURNING id`,
      params
    );
    if (!rows[0]) return res.status(404).json({ error: 'Session not found or not yours' });
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
