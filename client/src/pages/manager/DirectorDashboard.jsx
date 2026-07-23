import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import StaffAnnouncements from '../../components/manager/StaffAnnouncements';
import DirectorStickyNotes from '../../components/manager/DirectorStickyNotes';
import { api } from '../../api/client';
import { today, formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

// Donut segment colors. Program identity stays pinned (JR purple, the coding
// academies in the blue family) but each gets a distinct shade so adjacent
// segments are readable — an all-blue donut would be unreadable.
const PROGRAM_HEX = {
  'CREATE':           '#3b82f6', // blue-500
  'Robotics Academy': '#0ea5e9', // sky-500
  'AI Academy':       '#6366f1', // indigo-500
  'JR':               '#a855f7', // purple-500 (pinned)
  'VR Coding':        '#14b8a6', // teal-500
  'Silver':           '#94a3b8', // slate-400
  'Gold Unity':       '#f59e0b', // amber-500
  'Gold Godot':       '#d97706', // amber-600
};
const hexFor = (p) => PROGRAM_HEX[p] || '#cbd5e1';

// Count-up number. rAF-driven; eases out so it settles rather than snaps.
function CountUp({ value = 0, className }) {
  const [n, setN] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    const from = ref.current;
    const to = value;
    if (from === to) { setN(to); return; }
    let raf;
    let start;
    const dur = 650;
    const step = (t) => {
      if (start === undefined) start = t;
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(step);
      else ref.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={className}>{n}</span>;
}

/* ---------------------------------------------------------------- icons -- */

const RosterIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
  </svg>
);
const ClubIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M15.59 14.37a6 6 0 0 1-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 0 0 6.16-12.12A14.98 14.98 0 0 0 9.63 8.41m5.96 5.96a14.926 14.926 0 0 1-5.841 2.58m-.119-8.54a6 6 0 0 0-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 0 0-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 0 1-2.448-2.448 14.9 14.9 0 0 1 .06-.312m-2.24 2.39a4.493 4.493 0 0 0-1.757 4.306 4.493 4.493 0 0 0 4.306-1.758M16.5 9a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z" />
  </svg>
);
const StaffIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
  </svg>
);
const CurriculumIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
  </svg>
);

/* ------------------------------------------------------------ dial card -- */

// Gauge dial for today's logging progress. 270° sweep, tick ring outside it —
// the arc animates from empty so the number and the ring settle together.
const DIAL_R = 58;
const DIAL_C = 2 * Math.PI * DIAL_R;
const SWEEP = 0.75; // 270 of 360 degrees
const TICKS = 44;

function ProgressDial({ pct, logged, total, loading }) {
  const ticks = [];
  for (let i = 0; i < TICKS; i++) {
    const a = (135 + (i * 270) / (TICKS - 1)) * (Math.PI / 180);
    const on = i / (TICKS - 1) <= pct / 100;
    ticks.push({
      x1: 80 + Math.cos(a) * 68, y1: 80 + Math.sin(a) * 68,
      x2: 80 + Math.cos(a) * 75, y2: 80 + Math.sin(a) * 75,
      on,
    });
  }
  return (
    <div className="relative w-44 h-44 flex-shrink-0">
      <svg viewBox="0 0 160 160" className="w-full h-full">
        <g transform="rotate(135 80 80)">
          <circle
            cx="80" cy="80" r={DIAL_R}
            fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round"
            className="text-ninja-bg"
            strokeDasharray={`${DIAL_C * SWEEP} ${DIAL_C}`}
          />
          <motion.circle
            cx="80" cy="80" r={DIAL_R}
            fill="none" stroke="currentColor" strokeWidth="13" strokeLinecap="round"
            className="text-ninja-blue"
            strokeDasharray={`${DIAL_C * SWEEP} ${DIAL_C}`}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: loading ? 0 : (pct / 100) * SWEEP }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
          />
        </g>
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            className={t.on && !loading ? 'text-ninja-blue' : 'text-ninja-border'}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="flex items-start">
          <CountUp value={loading ? 0 : pct} className="text-4xl font-black font-ninja text-ninja-navy leading-none" />
          <span className="text-lg font-black font-ninja text-ninja-navy leading-none mt-0.5">%</span>
        </div>
        <span className="text-ninja-muted font-ninja text-[11px] font-semibold mt-1">
          {total === 0 ? 'nobody in yet' : `${logged} of ${total} logged`}
        </span>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- belt trend -- */

// Belt advancements over the last 32 days, bucketed into 4-day windows.
// Source is /reports/overview's beltLog (already fetched) — no extra request.
const BUCKETS = 8;
const BUCKET_DAYS = 4;

function buildTrend(beltLog) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (BUCKETS * BUCKET_DAYS - 1));
  const points = Array.from({ length: BUCKETS }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i * BUCKET_DAYS);
    return { date: d, count: 0 };
  });
  for (const row of beltLog || []) {
    if (!row.session_date) continue;
    // pg DATE serializes as UTC midnight — read the calendar day off the string.
    const [y, m, day] = String(row.session_date).split('T')[0].split('-').map(Number);
    const local = new Date(y, m - 1, day);
    const idx = Math.floor((local - start) / (BUCKET_DAYS * 86400000));
    if (idx >= 0 && idx < BUCKETS) points[idx].count += 1;
  }
  return points;
}

// Catmull-Rom through the points, emitted as cubic beziers, so the line curves
// like the reference instead of reading as a jagged polyline.
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6},`
       + ` ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6},`
       + ` ${p2.x} ${p2.y}`;
  }
  return d;
}

const W = 320;
const H = 120;
const PAD_T = 12;
const PAD_B = 20;

function BeltTrend({ beltLog }) {
  const points = useMemo(() => buildTrend(beltLog), [beltLog]);
  const max = Math.max(1, ...points.map((p) => p.count));
  const coords = points.map((p, i) => ({
    x: (i / (BUCKETS - 1)) * W,
    y: PAD_T + (1 - p.count / max) * (H - PAD_T - PAD_B),
    ...p,
  }));
  const line = smoothPath(coords);
  const area = `${line} L ${W} ${H - PAD_B} L 0 ${H - PAD_B} Z`;
  const totalUps = points.reduce((s, p) => s + p.count, 0);
  const last = coords[coords.length - 1];
  const label = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-ninja text-sm text-ninja-navy font-semibold">
          <CountUp value={totalUps} className="font-black" /> belt-up{totalUps === 1 ? '' : 's'}
        </span>
        <span className="font-ninja text-xs text-ninja-muted">last 32 days</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-28" preserveAspectRatio="none">
        <defs>
          <linearGradient id="beltTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={area}
          fill="url(#beltTrendFill)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        />
        <motion.path
          d={line}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="2.5"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.9, ease: 'easeInOut' }}
        />
        <motion.circle
          cx={last.x} cy={last.y} r="7"
          fill="#f59e0b" stroke="#fff" strokeWidth="2.5"
          vectorEffect="non-scaling-stroke"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.9 }}
        />
      </svg>
      <div className="flex justify-between font-ninja text-[10px] text-ninja-muted mt-1">
        <span>{label(coords[0].date)}</span>
        <span>{label(coords[Math.floor(BUCKETS / 2)].date)}</span>
        <span>Today</span>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- donut --- */

// Inline SVG donut. stroke-dasharray/offset computed manually per segment so
// each program's slice sits in its own arc with its real color. Program colors
// pinned (JR purple, coding academies in the blue family).
const R = 52;
const C = 2 * Math.PI * R;

function EnrollmentDonut({ data, total }) {
  const sum = data.reduce((s, d) => s + d.count, 0) || 1;
  const segments = [];
  let acc = 0; // fraction consumed so far
  for (const d of data) {
    const frac = d.count / sum;
    segments.push({ ...d, len: frac * C, offset: acc * C });
    acc += frac;
  }
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="relative w-36 h-36 flex-shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" strokeWidth="13" className="text-ninja-bg" />
          {/* One line sweeps around the full ring once... */}
          <motion.circle
            cx="60" cy="60" r={R}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="13"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: 'easeInOut' }}
          />
          {/* ...then the program colors blend in on top. */}
          {segments.map((seg, i) => (
            <motion.circle
              key={seg.program}
              cx="60" cy="60" r={R}
              fill="none"
              stroke={hexFor(seg.program)}
              strokeWidth="13"
              strokeLinecap="butt"
              strokeDasharray={`${seg.len} ${C}`}
              strokeDashoffset={-seg.offset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.9 + i * 0.06, ease: 'easeOut' }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <CountUp value={total} className="text-3xl font-black font-ninja text-ninja-navy leading-none" />
          <span className="text-ninja-muted font-ninja text-[11px] font-semibold mt-0.5">ninjas</span>
        </div>
      </div>
      <div className="w-full space-y-2">
        {data.map((d) => (
          <div key={d.program} className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: hexFor(d.program) }} />
            <span className="font-ninja text-sm text-ninja-navy truncate flex-1">{d.program}</span>
            <span className="font-ninja text-sm font-bold text-ninja-navy">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- quick tiles -- */

// Solid inline hex so the tiles read identically in light and dark — the
// global `.dark .bg-*` overrides would wash them out otherwise.
const QUICK_TILES = [
  { label: 'Roster',     to: '/manager/students',   bg: '#2563eb', Icon: RosterIcon },
  { label: 'Clubs',      to: '/clubs',              bg: '#f5a623', Icon: ClubIcon },
  { label: 'Staff',      to: '/manager/staff',      bg: '#f4795b', Icon: StaffIcon },
  { label: 'Curriculum', to: '/curriculum-roadmap', bg: '#35c6e0', Icon: CurriculumIcon },
];

function QuickTiles() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {QUICK_TILES.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 * i }}
        >
          <Link
            to={t.to}
            style={{ backgroundColor: t.bg }}
            className="flex flex-col justify-between h-24 rounded-2xl p-3.5 text-white shadow-sm hover:brightness-110 transition"
          >
            <t.Icon className="w-6 h-6" />
            <span className="font-ninja font-bold text-sm">{t.label}</span>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------- page -- */

export default function DirectorDashboard() {
  const { user } = useAuth();
  const todayStr = today();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get(`/daily?date=${todayStr}`).catch(() => []),
      api.get('/reports/overview').catch(() => null),
    ]).then(([daily, ov]) => {
      if (!alive) return;
      setAssignments(daily || []);
      setOverview(ov);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [todayStr, user?.activeLocation?.id]);

  const logged = assignments.filter((a) => a.completed).length;
  const total = assignments.length;
  const pct = total ? Math.round((logged / total) * 100) : 0;

  const enrollment = overview?.enrollment ?? [];
  const totalStudents = overview?.totalStudents ?? 0;
  const beltLog = overview?.beltLog ?? [];

  const firstName = user?.displayName?.split(' ')[0] ?? '';

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ------------------------------------------------------ main -- */}
        <div className="lg:col-span-2 space-y-6">
          {/* Greeting banner */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-br from-amber-100 via-amber-50 to-orange-100 dark:from-[#2b2440] dark:via-[#221f33] dark:to-[#2a2036]"
          >
            {/* Soft shapes standing in for the reference illustration. */}
            <div className="pointer-events-none absolute -right-10 -top-12 w-48 h-48 rounded-full bg-amber-300/30 dark:bg-white/5" />
            <div className="pointer-events-none absolute right-16 top-16 w-28 h-28 rounded-full bg-orange-300/25 dark:bg-white/5" />
            <div className="relative">
              <h1 className="text-2xl sm:text-3xl font-black font-ninja text-ninja-navy tracking-wide">
                Hello{firstName && ', '}<span className="text-ninja-blue">{firstName}</span>!
              </h1>
              <p className="text-ninja-muted font-ninja mt-1 max-w-md">
                {loading
                  ? 'Pulling up today…'
                  : total === 0
                    ? 'Nobody is checked in yet. The board is clear.'
                    : `${total} ninja${total === 1 ? '' : 's'} on the board today, ${total - logged} still waiting on a log.`}
              </p>
              <p className="text-ninja-muted font-ninja text-sm mt-3">{formatDate(todayStr)}</p>
              <Link
                to="/manager/dashboard"
                className="inline-block mt-4 font-ninja text-sm font-bold text-ninja-blue hover:underline"
              >
                Go to Today's Board →
              </Link>
            </div>
          </motion.div>

          {/* Today's logging dial */}
          <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-ninja font-bold text-ninja-navy text-lg">Today's progress</h2>
              <span className="font-ninja text-xs text-ninja-muted">{formatDate(todayStr)}</span>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ProgressDial pct={pct} logged={logged} total={total} loading={loading} />
              <div className="flex-1 w-full grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-ninja-bg p-3.5">
                  <CountUp value={loading ? 0 : total} className="block text-2xl font-black font-ninja text-ninja-navy leading-none" />
                  <span className="font-ninja text-xs text-ninja-muted">checked in</span>
                </div>
                <div className="rounded-xl bg-ninja-bg p-3.5">
                  <CountUp value={loading ? 0 : logged} className="block text-2xl font-black font-ninja text-ninja-blue leading-none" />
                  <span className="font-ninja text-xs text-ninja-muted">logged</span>
                </div>
                <div className="col-span-2 rounded-xl bg-ninja-bg p-3.5">
                  <CountUp value={loading ? 0 : total - logged} className="block text-2xl font-black font-ninja text-ninja-navy leading-none" />
                  <span className="font-ninja text-xs text-ninja-muted">still to log</span>
                </div>
              </div>
            </div>
          </div>

          {/* Announcements to staff */}
          <StaffAnnouncements />

          {/* CD sticky notes */}
          <DirectorStickyNotes />
        </div>

        {/* ------------------------------------------------------ rail -- */}
        <div className="space-y-6">
          <QuickTiles />

          {/* Enrollment */}
          <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-ninja font-bold text-ninja-navy text-lg">Enrollment</h2>
              <Link to="/manager/reports" className="font-ninja text-sm font-bold text-ninja-blue hover:underline">
                Reports →
              </Link>
            </div>
            {loading ? (
              <p className="text-ninja-muted font-ninja text-sm py-4">Loading…</p>
            ) : enrollment.length === 0 ? (
              <p className="text-ninja-muted font-ninja text-sm py-4">No enrollment data.</p>
            ) : (
              <EnrollmentDonut data={enrollment} total={totalStudents} />
            )}
          </div>

          {/* Belt advancements */}
          <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
            <h2 className="font-ninja font-bold text-ninja-navy text-lg mb-3">Belt-ups</h2>
            {loading ? (
              <p className="text-ninja-muted font-ninja text-sm py-4">Loading…</p>
            ) : (
              <BeltTrend beltLog={beltLog} />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
