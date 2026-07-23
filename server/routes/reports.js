const express = require('express');
const router = express.Router();
const { requireSensei } = require('../middleware/auth');

// GET /api/reports/overview — enrollment counts, belt distribution, activity stats
router.get('/overview', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  const locationId = req.session.activeLocationId;
  try {
    const [totalStudents, enrollment, belts, inactive, beltLog] = await Promise.all([
      // Distinct active students at this location (not double-counted across programs)
      pool.query(`
        SELECT COUNT(*)::int AS count
        FROM students s
        WHERE s.location_id = $1 AND s.active = true
      `, [locationId]),

      // Students per program
      pool.query(`
        SELECT sp.program, COUNT(DISTINCT sp.student_id)::int AS count
        FROM student_programs sp
        JOIN students s ON sp.student_id = s.id
        WHERE s.location_id = $1 AND s.active = true
        GROUP BY sp.program
        ORDER BY sp.program ASC
      `, [locationId]),

      // Belt distribution (CREATE only)
      pool.query(`
        SELECT sp.belt_level, COUNT(*)::int AS count
        FROM student_programs sp
        JOIN students s ON sp.student_id = s.id
        WHERE s.location_id = $1 AND s.active = true AND sp.program = 'CREATE' AND sp.belt_level IS NOT NULL
        GROUP BY sp.belt_level
        ORDER BY sp.belt_level ASC
      `, [locationId]),

      // Students with no activity in the last 30 days
      pool.query(`
        SELECT s.id, s.full_name,
               (SELECT MAX(pl.session_date) FROM progress_logs pl WHERE pl.student_id = s.id) AS last_session
        FROM students s
        WHERE s.location_id = $1 AND s.active = true
          AND NOT EXISTS (
            SELECT 1 FROM progress_logs pl
            WHERE pl.student_id = s.id AND pl.session_date >= CURRENT_DATE - INTERVAL '30 days'
          )
        ORDER BY last_session ASC NULLS FIRST
      `, [locationId]),

      // Belt advancements in the last 30 days
      pool.query(`
        SELECT DISTINCT ON (pl.student_id, pl.program, pl.belt_level_at)
               s.full_name, pl.belt_level_at, pl.belt_sublevel_at, pl.session_date,
               u.display_name AS sensei_name
        FROM progress_logs pl
        JOIN students s ON pl.student_id = s.id
        JOIN users u ON pl.sensei_id = u.id
        WHERE s.location_id = $1
          AND pl.belt_level_at IN ('White','Yellow','Orange','Green','Blue','Purple','Brown','Red','Black')
          AND pl.session_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY pl.student_id, pl.program, pl.belt_level_at, pl.session_date DESC
      `, [locationId]),
    ]);

    res.json({
      totalStudents: totalStudents.rows[0].count,
      enrollment: enrollment.rows,
      belts: belts.rows,
      inactive: inactive.rows,
      beltLog: beltLog.rows,
    });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch report data' });
  }
});

// GET /api/reports/attendance — ninjas checked in per day at this location.
// One row per day that had any check-in; the client fills the gaps and slices
// it into whatever range is on screen. `range=all` drops the lower bound so the
// client can offer an all-time view off a single fetch. `to_char` keeps the DATE
// a plain YYYY-MM-DD string instead of a UTC-midnight timestamp.
router.get('/attendance', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  const locationId = req.session.activeLocationId;
  const all = req.query.range === 'all';
  const days = Math.min(365, Math.max(7, parseInt(req.query.days, 10) || 120));
  const params = all ? [locationId] : [locationId, days];
  try {
    const { rows } = await pool.query(`
      SELECT to_char(da.session_date, 'YYYY-MM-DD') AS day,
             COUNT(DISTINCT da.student_id)::int AS count
      FROM daily_assignments da
      JOIN students s ON da.student_id = s.id
      WHERE s.location_id = $1
        AND da.session_date <= CURRENT_DATE
        ${all ? '' : 'AND da.session_date >= CURRENT_DATE - ($2::int - 1)'}
      GROUP BY da.session_date
      ORDER BY da.session_date ASC
    `, params);
    res.json({ range: all ? 'all' : String(days), attendance: rows });
  } catch (err) {
    console.error('Error fetching attendance:', err);
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

// GET /api/reports/growth — how the current active roster was built up over
// time, bucketed by the month each ninja was added.
//
// CAVEAT: students has no enrollment date, only created_at, which is when the
// row entered DojoLink. The first month at each location is therefore the seed
// CSV import, not real signups — the client labels it as a baseline. There is
// also no archived_at, so departures cannot be dated and this only counts
// ninjas who are still active; the cumulative line can never fall.
router.get('/growth', requireSensei, async (req, res) => {
  const pool = req.app.get('db');
  try {
    const { rows } = await pool.query(`
      SELECT to_char(date_trunc('month', s.created_at), 'YYYY-MM-DD') AS month,
             COUNT(*)::int AS added
      FROM students s
      WHERE s.location_id = $1 AND s.active = true
      GROUP BY date_trunc('month', s.created_at)
      ORDER BY date_trunc('month', s.created_at) ASC
    `, [req.session.activeLocationId]);
    res.json(rows);
  } catch (err) {
    console.error('Error fetching growth:', err);
    res.status(500).json({ error: 'Failed to fetch growth' });
  }
});

module.exports = router;
