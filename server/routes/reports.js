const express = require('express');
const router = express.Router();
const { requireManager } = require('../middleware/auth');

// GET /api/reports/overview — enrollment counts, belt distribution, activity stats
router.get('/overview', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  const locationId = req.session.activeLocationId;
  try {
    const [enrollment, belts, activity, inactive, beltLog] = await Promise.all([
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

      // Sessions per week (last 8 weeks)
      pool.query(`
        SELECT DATE_TRUNC('week', da.session_date::timestamp)::date AS week_start,
               COUNT(*)::int AS session_count
        FROM daily_assignments da
        JOIN students s ON da.student_id = s.id
        WHERE s.location_id = $1
          AND da.session_date >= CURRENT_DATE - INTERVAL '56 days'
        GROUP BY week_start
        ORDER BY week_start ASC
      `, [locationId]),

      // Students with no activity in the last 30 days
      pool.query(`
        SELECT s.id, s.full_name,
               (SELECT MAX(pl.session_date) FROM progress_logs pl WHERE pl.student_id = s.id) AS last_session
        FROM students s
        WHERE s.location_id = $1 AND s.active = true
          AND NOT EXISTS (
            SELECT 1 FROM daily_assignments da
            WHERE da.student_id = s.id AND da.session_date >= CURRENT_DATE - INTERVAL '30 days'
          )
        ORDER BY last_session ASC NULLS FIRST
        LIMIT 20
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
          AND pl.belt_level_at IS NOT NULL
          AND pl.session_date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY pl.student_id, pl.program, pl.belt_level_at, pl.session_date DESC
        LIMIT 50
      `, [locationId]),
    ]);

    res.json({
      enrollment: enrollment.rows,
      belts: belts.rows,
      activity: activity.rows,
      inactive: inactive.rows,
      beltLog: beltLog.rows,
    });
  } catch (err) {
    console.error('Error fetching reports:', err);
    res.status(500).json({ error: 'Failed to fetch report data' });
  }
});

// GET /api/reports/export — CSV of all active students with program + belt info
router.get('/export', requireManager, async (req, res) => {
  const pool = req.app.get('db');
  const locationId = req.session.activeLocationId;
  try {
    const { rows } = await pool.query(`
      SELECT s.full_name, s.birthday,
             sp.program, sp.belt_level, sp.belt_sublevel, sp.current_project, sp.project_status,
             sp.percent_complete,
             (SELECT MAX(pl.session_date) FROM progress_logs pl WHERE pl.student_id = s.id AND pl.program = sp.program) AS last_session
      FROM students s
      JOIN student_programs sp ON sp.student_id = s.id
      WHERE s.location_id = $1 AND s.active = true
      ORDER BY s.full_name ASC, sp.program ASC
    `, [locationId]);

    const header = 'Name,Birthday,Program,Belt,Sublevel,Project,Status,Progress %,Last Session\n';
    const csvRows = rows.map(r =>
      [r.full_name, r.birthday?.toISOString?.()?.split('T')[0] || '', r.program, r.belt_level || '',
       r.belt_sublevel || '', r.current_project || '', r.project_status || '',
       r.percent_complete || 0, r.last_session?.toISOString?.()?.split('T')[0] || '']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students-export.csv"');
    res.send(header + csvRows);
  } catch (err) {
    console.error('Error exporting:', err);
    res.status(500).json({ error: 'Failed to export' });
  }
});

module.exports = router;
