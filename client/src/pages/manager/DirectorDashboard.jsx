import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import ProgramBadge from '../../components/ui/ProgramBadge';
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

function StatTile({ to, label, value, tone = 'navy', delay = 0 }) {
  const tones = {
    navy:  'text-ninja-navy',
    blue:  'text-ninja-blue',
    amber: 'text-amber-500',
    red:   'text-ninja-red',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Link
        to={to}
        className="block bg-white border border-ninja-border rounded-2xl p-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
      >
        <CountUp value={value} className={`block text-3xl font-black font-ninja ${tones[tone]}`} />
        <span className="block text-ninja-muted font-ninja text-xs font-semibold mt-1">{label}</span>
      </Link>
    </motion.div>
  );
}

// Inline SVG donut. Segments drawn with framer pathLength; program colors pinned.
function EnrollmentDonut({ data, total }) {
  const segments = [];
  let acc = 0;
  const sum = data.reduce((s, d) => s + d.count, 0) || 1;
  for (const d of data) {
    const frac = d.count / sum;
    segments.push({ ...d, frac, offset: acc });
    acc += frac;
  }
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-32 h-32 flex-shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="13" className="text-ninja-bg" />
          {segments.map((seg, i) => (
            <motion.circle
              key={seg.program}
              cx="60" cy="60" r="52"
              fill="none"
              stroke={hexFor(seg.program)}
              strokeWidth="13"
              strokeLinecap="butt"
              style={{ pathOffset: seg.offset }}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: seg.frac }}
              transition={{ duration: 0.8, delay: 0.15 + i * 0.1, ease: 'easeOut' }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <CountUp value={total} className="text-2xl font-black font-ninja text-ninja-navy leading-none" />
          <span className="text-ninja-muted font-ninja text-[10px] font-semibold mt-0.5">ninjas</span>
        </div>
      </div>
      <div className="flex-1 min-w-0 space-y-1.5">
        {data.map((d) => (
          <div key={d.program} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: hexFor(d.program) }} />
            <span className="font-ninja text-sm text-ninja-navy truncate flex-1">{d.program}</span>
            <span className="font-ninja text-sm font-bold text-ninja-navy">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, action, children }) {
  return (
    <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-ninja font-bold text-ninja-navy text-lg">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

const lastSeen = (dateStr) => {
  if (!dateStr) return 'No sessions yet';
  return `Last seen ${formatDate(dateStr)}`;
};

export default function DirectorDashboard() {
  const { user } = useAuth();
  const todayStr = today();
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get(`/daily?date=${todayStr}`).catch(() => []),
      api.get('/clubs').catch(() => []),
      api.get('/reports/overview').catch(() => null),
    ]).then(([daily, clubData, ov]) => {
      if (!alive) return;
      setAssignments(daily || []);
      setClubs(clubData || []);
      setOverview(ov);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [todayStr, user?.activeLocation?.id]);

  const isPast = (a) => a.session_date && String(a.session_date).split('T')[0] < todayStr;
  const logged = assignments.filter((a) => a.completed).length;
  const overdueLogs = assignments.filter((a) => !a.completed && isPast(a)).length;
  const total = assignments.length;
  const pct = total ? Math.round((logged / total) * 100) : 0;

  const overdueClubs = clubs.filter((s) => !s.notes && String(s.session_date).split('T')[0] < todayStr);
  const inactive = overview?.inactive ?? [];
  const enrollment = overview?.enrollment ?? [];
  const beltLog = overview?.beltLog ?? [];
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

        {/* Stat tiles */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile to="/manager/dashboard" label="Checked in today" value={total} tone="navy" delay={0.02} />
          <StatTile to="/manager/dashboard" label="Logged today" value={logged} tone="blue" delay={0.08} />
          <StatTile to="/manager/dashboard" label="Overdue logs" value={overdueLogs} tone="amber" delay={0.14} />
          <StatTile to="/clubs" label="Overdue clubs" value={overdueClubs.length} tone="red" delay={0.2} />
        </div>

        {/* Main + rail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Needs attention */}
          <div className="lg:col-span-2">
            <Panel
              title="Needs attention"
              action={<span className="font-ninja text-xs text-ninja-muted">No activity in 30+ days</span>}
            >
              {loading ? (
                <p className="text-ninja-muted font-ninja text-sm py-4">Loading…</p>
              ) : inactive.length === 0 ? (
                <div className="text-center py-8">
                  <p className="font-ninja font-bold text-ninja-navy">Everyone's active 🎉</p>
                  <p className="text-ninja-muted font-ninja text-sm mt-1">No ninjas have gone quiet this month.</p>
                </div>
              ) : (
                <div className="divide-y divide-ninja-border">
                  {inactive.slice(0, 8).map((s) => (
                    <Link
                      key={s.id}
                      to={`/manager/students/${s.id}`}
                      className="flex items-center justify-between gap-3 py-2.5 -mx-1 px-1 rounded-lg hover:bg-ninja-bg transition-colors"
                    >
                      <span className="font-ninja font-semibold text-ninja-navy text-sm truncate">{s.full_name}</span>
                      <span className="font-ninja text-xs text-ninja-muted flex-shrink-0">{lastSeen(s.last_session)}</span>
                    </Link>
                  ))}
                  {inactive.length > 8 && (
                    <p className="font-ninja text-xs text-ninja-muted pt-2.5">+ {inactive.length - 8} more</p>
                  )}
                </div>
              )}
            </Panel>
          </div>

          {/* Right rail */}
          <div className="space-y-4">
            {/* Enrollment */}
            <Panel
              title="Enrollment"
              action={
                <Link to="/manager/reports" className="font-ninja text-xs font-bold text-ninja-blue hover:underline">
                  Reports →
                </Link>
              }
            >
              {loading ? (
                <p className="text-ninja-muted font-ninja text-sm py-4">Loading…</p>
              ) : enrollment.length === 0 ? (
                <p className="text-ninja-muted font-ninja text-sm py-4">No enrollment data.</p>
              ) : (
                <EnrollmentDonut data={enrollment} total={totalStudents} />
              )}
            </Panel>

            {/* Recent belt-ups */}
            <Panel title="Recent belt-ups" action={<span className="font-ninja text-xs text-ninja-muted">Last 30 days</span>}>
              {loading ? (
                <p className="text-ninja-muted font-ninja text-sm py-4">Loading…</p>
              ) : beltLog.length === 0 ? (
                <p className="text-ninja-muted font-ninja text-sm py-4">No belt advancements yet this month.</p>
              ) : (
                <div className="space-y-2.5">
                  {beltLog.slice(0, 6).map((b, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-ninja font-semibold text-ninja-navy text-sm truncate">{b.full_name}</p>
                        <p className="font-ninja text-xs text-ninja-muted truncate">by {b.sensei_name}</p>
                      </div>
                      <span className="font-ninja text-xs font-bold text-ninja-navy bg-ninja-bg border border-ninja-border rounded-md px-2 py-0.5 flex-shrink-0">
                        {b.belt_level_at}{b.belt_sublevel_at ? ` ${b.belt_sublevel_at}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </Layout>
  );
}
