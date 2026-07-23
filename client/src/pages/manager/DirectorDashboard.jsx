import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import StaffAnnouncements from '../../components/manager/StaffAnnouncements';
import DirectorStickyNotes from '../../components/manager/DirectorStickyNotes';
import Modal from '../../components/ui/Modal';
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

const ReportsIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 4v15a1 1 0 0 0 1 1h15" />
    <path d="M8 16v-4" />
    <path d="M13 16V8" />
    <path d="M18 16v-6" />
  </svg>
);
const SparkleIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
  </svg>
);
const CakeIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Z" />
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

/* ------------------------------------------------------------ check-ins -- */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// The API only returns days that had a check-in. Expand to every day from the
// first one on record through today, so the chart has an even x axis and quiet
// days read as real zeroes. Ranges are then sliced off the tail of this.
function buildDays(attendance) {
  const rows = attendance || [];
  if (rows.length === 0) return [];
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  const [y, m, d] = rows[0].day.split('-').map(Number);
  const cursor = new Date(y, m - 1, d);
  const map = new Map(rows.map((r) => [r.day, r.count]));
  const out = [];
  while (cursor <= end) {
    const date = new Date(cursor);
    out.push({ date, count: map.get(dayKey(date)) || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

// Calendar weeks starting Sunday, most recent `weeks` of them.
function toWeeks(dayRows, weeks = Infinity) {
  const buckets = new Map();
  for (const row of dayRows) {
    const start = new Date(row.date);
    start.setDate(start.getDate() - start.getDay());
    const k = dayKey(start);
    const b = buckets.get(k) || { date: start, count: 0 };
    b.count += row.count;
    buckets.set(k, b);
  }
  const all = [...buckets.values()].sort((a, b) => a.date - b.date);
  return weeks === Infinity ? all : all.slice(-weeks);
}

function toMonths(dayRows) {
  const buckets = new Map();
  for (const row of dayRows) {
    const start = new Date(row.date.getFullYear(), row.date.getMonth(), 1);
    const k = dayKey(start);
    const b = buckets.get(k) || { date: start, count: 0 };
    b.count += row.count;
    buckets.set(k, b);
  }
  return [...buckets.values()].sort((a, b) => a.date - b.date);
}

const bucketBy = (dayRows, bucket) =>
  bucket === 'day' ? dayRows : bucket === 'month' ? toMonths(dayRows) : toWeeks(dayRows);

// Average ninjas per occurrence of each weekday — a Tuesday-only center
// shouldn't look "busiest" purely because there are more Tuesdays in range.
function byWeekday(dayRows) {
  const acc = Array.from({ length: 7 }, () => ({ total: 0, n: 0 }));
  for (const row of dayRows) {
    const w = row.date.getDay();
    acc[w].total += row.count;
    acc[w].n += 1;
  }
  return acc.map((a, i) => ({
    index: i,
    name: WEEKDAYS[i],
    short: WEEKDAYS_SHORT[i],
    avg: a.n ? a.total / a.n : 0,
    total: a.total,
  }));
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

const CW = 320;
const PAD_X = 10;  // keeps the end dot from clipping at the edge
const PAD_T = 14;
const PAD_B = 10;

function AreaChart({ points, height = 120, gradientId, className = '' }) {
  if (points.length === 0) return null;
  const max = Math.max(1, ...points.map((p) => p.count));
  const innerW = CW - PAD_X * 2;
  const base = height - PAD_B;
  const coords = points.map((p, i) => ({
    ...p,
    x: PAD_X + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW),
    y: PAD_T + (1 - p.count / max) * (base - PAD_T),
  }));
  const line = smoothPath(coords);
  const area = `${line} L ${coords[coords.length - 1].x} ${base} L ${coords[0].x} ${base} Z`;
  const last = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${CW} ${height}`} className={`w-full ${className}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#${gradientId})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      />
      <motion.path
        d={line}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: 'easeInOut' }}
      />
      <motion.circle
        cx={last.x} cy={last.y} r="5"
        fill="#3b82f6" stroke="#fff" strokeWidth="2.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.9 }}
      />
    </svg>
  );
}

const shortDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// Collapsed card: ninjas per week for the last 8 weeks. Whole card opens the
// expanded view.
const CARD_WEEKS = 8;

function CheckInTrend({ dayRows, onExpand }) {
  const weeks = useMemo(() => toWeeks(dayRows, CARD_WEEKS), [dayRows]);
  if (weeks.length === 0) {
    return <p className="text-ninja-muted font-ninja text-sm py-4">No check-ins yet.</p>;
  }
  const thisWeek = weeks[weeks.length - 1].count;

  return (
    <button onClick={onExpand} className="block w-full text-left group">
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-ninja text-sm text-ninja-navy font-semibold">
          <CountUp value={thisWeek} className="font-black" /> ninja{thisWeek === 1 ? '' : 's'} this week
        </span>
        <span className="font-ninja text-xs text-ninja-muted group-hover:text-ninja-blue transition-colors">
          expand →
        </span>
      </div>
      <AreaChart points={weeks} gradientId="checkInCardFill" className="h-28" />
      <div className="flex justify-between font-ninja text-[10px] text-ninja-muted mt-1">
        <span>{shortDate(weeks[0].date)}</span>
        <span>{shortDate(weeks[Math.floor(weeks.length / 2)].date)}</span>
        <span>This week</span>
      </div>
    </button>
  );
}

const RANGES = [
  { key: 'week',  label: 'Week',     days: 7,    bucket: 'day',   tail: 'Today' },
  { key: 'month', label: 'Month',    days: 30,   bucket: 'day',   tail: 'Today' },
  { key: 'six',   label: '6 months', days: 182,  bucket: 'week',  tail: 'This week' },
  { key: 'all',   label: 'All time', days: null, bucket: 'month', tail: 'This month' },
];

const monthLabel = (d) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

function CheckInDetail({ dayRows }) {
  const [rangeKey, setRangeKey] = useState('month');
  const range = RANGES.find((r) => r.key === rangeKey) || RANGES[1];

  const inRange = useMemo(
    () => (range.days ? dayRows.slice(-range.days) : dayRows),
    [dayRows, range.days],
  );
  const series = useMemo(() => bucketBy(inRange, range.bucket), [inRange, range.bucket]);
  const weekdays = useMemo(() => byWeekday(inRange), [inRange]);

  const maxAvg = Math.max(0.001, ...weekdays.map((w) => w.avg));
  const ranked = [...weekdays].filter((w) => w.total > 0).sort((a, b) => b.avg - a.avg);
  const busiest = ranked[0];
  const quietest = ranked[ranked.length - 1];

  // Peak single day in range, weekly pace, and how the range compares to the
  // equally-long window before it — the raw totals said nothing actionable.
  const peak = inRange.reduce((best, d) => (d.count > (best?.count ?? -1) ? d : best), null);
  const totalVisits = inRange.reduce((s, d) => s + d.count, 0);
  const perWeek = inRange.length ? (totalVisits / inRange.length) * 7 : 0;

  const prior = range.days ? dayRows.slice(-(range.days * 2), -range.days) : [];
  const priorTotal = prior.reduce((s, d) => s + d.count, 0);
  // Needs a full prior window, else a half-empty one reads as a fake collapse.
  const hasPrior = prior.length === inRange.length && priorTotal > 0;
  const delta = hasPrior ? Math.round(((totalVisits - priorTotal) / priorTotal) * 100) : null;

  const axisLabel = (d) => (range.bucket === 'month' ? monthLabel(d) : shortDate(d));

  return (
    <div className="space-y-5">
      {/* Range chips */}
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRangeKey(r.key)}
            className={`font-ninja text-sm font-semibold px-3 py-1.5 rounded-full transition-colors ${
              rangeKey === r.key
                ? 'bg-ninja-blue text-white'
                : 'bg-ninja-bg text-ninja-muted hover:text-ninja-navy'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Trend */}
      <div>
        <AreaChart key={rangeKey} points={series} height={150} gradientId="checkInDetailFill" className="h-40" />
        <div className="flex justify-between font-ninja text-[11px] text-ninja-muted mt-1">
          <span>{series.length ? axisLabel(series[0].date) : ''}</span>
          <span>{series.length > 2 ? axisLabel(series[Math.floor(series.length / 2)].date) : ''}</span>
          <span>{range.tail}</span>
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl bg-ninja-bg p-3">
          <span className="block text-xl font-black font-ninja text-ninja-navy leading-none">
            {peak?.count ?? 0}
          </span>
          <span className="font-ninja text-xs text-ninja-muted">
            busiest day{peak?.count ? ` · ${shortDate(peak.date)}` : ''}
          </span>
        </div>
        <div className="rounded-xl bg-ninja-bg p-3">
          <span className="block text-xl font-black font-ninja text-ninja-navy leading-none">
            {Math.round(perWeek)}
          </span>
          <span className="font-ninja text-xs text-ninja-muted">ninjas a week</span>
        </div>
        <div className="rounded-xl bg-ninja-bg p-3">
          {delta === null ? (
            <>
              <span className="block text-xl font-black font-ninja text-ninja-muted leading-none">—</span>
              <span className="font-ninja text-xs text-ninja-muted">no earlier data</span>
            </>
          ) : (
            <>
              <span
                className={`block text-xl font-black font-ninja leading-none ${
                  delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-ninja-red' : 'text-ninja-navy'
                }`}
              >
                {delta > 0 ? '+' : ''}{delta}%
              </span>
              <span className="font-ninja text-xs text-ninja-muted">vs previous {range.label.toLowerCase()}</span>
            </>
          )}
        </div>
      </div>

      {/* Busy days */}
      <div>
        <h3 className="font-ninja font-bold text-ninja-navy mb-2">Busiest days</h3>
        <div className="space-y-1.5">
          {weekdays.map((w) => (
            <div key={w.index} className="flex items-center gap-3">
              <span className="font-ninja text-xs text-ninja-muted w-9 flex-shrink-0">{w.short}</span>
              <div className="flex-1 h-5 rounded-md bg-ninja-bg overflow-hidden">
                <motion.div
                  className={`h-full rounded-md ${w.index === busiest?.index ? 'bg-ninja-blue' : 'bg-ninja-blue/40'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(w.avg / maxAvg) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: 0.04 * w.index }}
                />
              </div>
              <span className="font-ninja text-xs font-bold text-ninja-navy w-10 text-right flex-shrink-0">
                {w.avg ? w.avg.toFixed(1) : '—'}
              </span>
            </div>
          ))}
        </div>
        <p className="font-ninja text-xs text-ninja-muted mt-2">Average ninjas per weekday.</p>
      </div>

      {busiest && (
        <p className="font-ninja text-sm text-ninja-navy">
          <span className="font-bold">{busiest.name}</span> is your busiest day at{' '}
          {busiest.avg.toFixed(1)} ninjas on average
          {quietest && quietest.index !== busiest.index && (
            <>, <span className="font-bold">{quietest.name}</span> the quietest at {quietest.avg.toFixed(1)}</>
          )}
          .
        </p>
      )}
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

// Deliberately none of these duplicate a sidebar entry. Solid inline hex so the
// tiles read identically in light and dark — the global `.dark .bg-*` overrides
// would wash them out otherwise.
const QUICK_TILES = [
  { label: 'Reports',    to: '/manager/reports',    bg: '#2563eb', Icon: ReportsIcon },
  { label: 'Curriculum', to: '/curriculum-roadmap', bg: '#35c6e0', Icon: CurriculumIcon },
  { label: 'Birthdays',  action: 'birthdays',       bg: '#f4795b', Icon: CakeIcon },
  { label: "What's New", to: '/changelog',          bg: '#f5a623', Icon: SparkleIcon },
];

const TILE_CLASS =
  'flex flex-col justify-between w-full h-24 rounded-2xl p-3.5 text-left text-white shadow-sm hover:brightness-110 transition';

function QuickTiles({ onBirthdays }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {QUICK_TILES.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 * i }}
        >
          {t.action === 'birthdays' ? (
            <button onClick={onBirthdays} style={{ backgroundColor: t.bg }} className={TILE_CLASS}>
              <t.Icon className="w-6 h-6" />
              <span className="font-ninja font-bold text-sm">{t.label}</span>
            </button>
          ) : (
            <Link to={t.to} style={{ backgroundColor: t.bg }} className={TILE_CLASS}>
              <t.Icon className="w-6 h-6" />
              <span className="font-ninja font-bold text-sm">{t.label}</span>
            </Link>
          )}
        </motion.div>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------- birthdays -- */

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// Groups by calendar month starting with the current one, wrapping into next
// year so December doesn't strand January at the bottom of the list.
function groupBirthdays(rows) {
  const now = new Date();
  const curMonth = now.getMonth() + 1;
  const curDay = now.getDate();
  const groups = [];
  for (let i = 0; i < 12; i++) {
    const month = ((curMonth - 1 + i) % 12) + 1;
    const kids = rows
      .filter((r) => r.month === month)
      .sort((a, b) => a.day - b.day)
      .map((r) => ({
        ...r,
        isToday: month === curMonth && r.day === curDay,
        passed: i === 0 && r.day < curDay,
      }));
    if (kids.length) groups.push({ month, name: MONTH_NAMES[month - 1], kids, isCurrent: i === 0 });
  }
  return groups;
}

function BirthdayList({ rows, loading }) {
  const groups = useMemo(() => groupBirthdays(rows || []), [rows]);
  if (loading) return <p className="text-ninja-muted font-ninja text-sm py-4">Loading…</p>;
  if (groups.length === 0) {
    return <p className="text-ninja-muted font-ninja text-sm py-4">No birthdays on file yet.</p>;
  }
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.month}>
          <h3 className="font-ninja font-bold text-ninja-navy mb-2">
            {g.name}{g.isCurrent && <span className="text-ninja-muted font-semibold text-sm"> · this month</span>}
          </h3>
          <div className="space-y-1">
            {g.kids.map((k) => (
              <Link
                key={`${k.id}-${k.month}`}
                to={`/manager/students/${k.id}`}
                className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-ninja-bg transition-colors ${
                  k.passed ? 'opacity-50' : ''
                }`}
              >
                <span className="font-ninja text-sm text-ninja-navy truncate">{k.full_name}</span>
                <span className="font-ninja text-sm font-bold text-ninja-muted flex-shrink-0">
                  {k.isToday ? 'Today' : `${g.name.slice(0, 3)} ${k.day}`}
                </span>
              </Link>
            ))}
          </div>
        </div>
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
  const [attendance, setAttendance] = useState(null);
  const [trendOpen, setTrendOpen] = useState(false);
  const [birthdaysOpen, setBirthdaysOpen] = useState(false);
  const [birthdays, setBirthdays] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get(`/daily?date=${todayStr}`).catch(() => []),
      api.get('/reports/overview').catch(() => null),
      api.get('/reports/attendance?range=all').catch(() => null),
    ]).then(([daily, ov, att]) => {
      if (!alive) return;
      setAssignments(daily || []);
      setOverview(ov);
      setAttendance(att);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [todayStr, user?.activeLocation?.id]);

  // Only the birthday modal needs this, so it waits until the tile is tapped.
  useEffect(() => {
    if (!birthdaysOpen || birthdays) return;
    let alive = true;
    api.get('/students/birthdays')
      .then((rows) => { if (alive) setBirthdays(rows || []); })
      .catch(() => { if (alive) setBirthdays([]); });
    return () => { alive = false; };
  }, [birthdaysOpen, birthdays]);

  // Refetch birthdays if the director switches centers.
  useEffect(() => { setBirthdays(null); }, [user?.activeLocation?.id]);

  const dayRows = useMemo(() => buildDays(attendance?.attendance), [attendance]);

  const logged = assignments.filter((a) => a.completed).length;
  const total = assignments.length;
  const pct = total ? Math.round((logged / total) * 100) : 0;

  const enrollment = overview?.enrollment ?? [];
  const totalStudents = overview?.totalStudents ?? 0;

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
          <QuickTiles onBirthdays={() => setBirthdaysOpen(true)} />

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

          {/* Check-ins over time */}
          <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
            <h2 className="font-ninja font-bold text-ninja-navy text-lg mb-3">Check-ins</h2>
            {loading ? (
              <p className="text-ninja-muted font-ninja text-sm py-4">Loading…</p>
            ) : (
              <CheckInTrend dayRows={dayRows} onExpand={() => setTrendOpen(true)} />
            )}
          </div>
        </div>
      </div>

      <Modal
        isOpen={trendOpen}
        onClose={() => setTrendOpen(false)}
        title="Check-ins"
        width="max-w-2xl"
      >
        <CheckInDetail dayRows={dayRows} />
      </Modal>

      <Modal
        isOpen={birthdaysOpen}
        onClose={() => setBirthdaysOpen(false)}
        title="Birthdays"
        width="max-w-md"
      >
        <BirthdayList rows={birthdays} loading={birthdays === null} />
      </Modal>
    </Layout>
  );
}
