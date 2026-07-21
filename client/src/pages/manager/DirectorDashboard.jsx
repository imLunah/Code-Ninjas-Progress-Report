import { useState, useEffect, useRef } from 'react';
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
    <div className="flex flex-col sm:flex-row items-center gap-6">
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
      <div className="flex-1 min-w-0 w-full space-y-2">
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

  const firstName = user?.displayName?.split(' ')[0] ?? '';

  return (
    <Layout>
      <div className="space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="bg-white border border-ninja-border rounded-2xl p-6 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black font-ninja text-ninja-navy tracking-wide">
                Welcome back{firstName && ', '}<span className="text-ninja-blue">{firstName}</span>
              </h1>
              <p className="text-ninja-muted font-ninja mt-1">{formatDate(todayStr)}</p>
            </div>
            <Link
              to="/manager/dashboard"
              className="font-ninja text-sm font-bold text-ninja-blue hover:underline"
            >
              Go to Today's Board →
            </Link>
          </div>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-ninja text-sm text-ninja-navy font-semibold">
                {loading ? 'Loading…' : total === 0 ? 'No ninjas checked in yet' : `${logged} of ${total} ninjas logged today`}
              </span>
              <span className="font-ninja text-sm font-bold text-ninja-blue">{pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-ninja-bg overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-ninja-blue"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
              />
            </div>
          </div>
        </motion.div>

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

        {/* Announcements to staff */}
        <StaffAnnouncements />

        {/* CD sticky notes */}
        <DirectorStickyNotes />
      </div>
    </Layout>
  );
}
