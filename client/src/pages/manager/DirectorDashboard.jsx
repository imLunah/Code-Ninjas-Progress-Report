import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import EventCalendar from '../../components/manager/EventCalendar';
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

// Strong ease-out (Emil's design-eng default). The built-in easeOut is too
// weak to read as intentional; this matches the CSS --ease-out token.
const EASE = [0.23, 1, 0.32, 1];

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
const UsersIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
  </svg>
);
const PulseIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M3 12h4l2.5-7 5 14L17 12h4" />
  </svg>
);
const TrendIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.28m5.94 2.28-2.28 5.941" />
  </svg>
);
const ChevronRight = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

// Shared card surface. The subtle ring + shadow give cards enough lift off the
// deep-slate page that they stop reading as flat panels — the depth that was
// missing before. Explicit dark shadow because the light one is invisible on
// the dark bg.
const CARD =
  'rounded-2xl bg-white border border-ninja-border shadow-sm ' +
  'dark:shadow-[0_10px_34px_rgb(0_0_0/0.32)] ring-1 ring-transparent dark:ring-white/[0.05]';

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

const PAD_X = 10;  // keeps the end dot from clipping at the edge
const PAD_T = 14;
const PAD_B = 10;
const TIP_W = 130; // approximate tooltip width, used to keep it inside the box

// The viewBox is sized to the measured pixel width so one unit is one pixel.
// A fixed viewBox would letterbox under the default xMidYMid meet — the chart
// would sit centred at its own aspect ratio while pointer math assumed it
// spanned the full box, so the readout tracked the wrong place entirely.
function AreaChart({ points, height = 120, gradientId, className = '', formatLabel = shortDate }) {
  const [hoverIdx, setHoverIdx] = useState(null);
  const [width, setWidth] = useState(0);
  const wrapRef = useRef(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready = points.length > 0 && width > 0;
  const max = ready ? Math.max(1, ...points.map((p) => p.count)) : 1;
  const innerW = Math.max(1, width - PAD_X * 2);
  const base = height - PAD_B;
  const coords = ready
    ? points.map((p, i) => ({
        ...p,
        x: PAD_X + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW),
        y: PAD_T + (1 - p.count / max) * (base - PAD_T),
      }))
    : [];
  const line = ready ? smoothPath(coords) : '';
  const area = ready
    ? `${line} L ${coords[coords.length - 1].x} ${base} L ${coords[0].x} ${base} Z`
    : '';
  const last = coords[coords.length - 1];
  const hover = hoverIdx === null ? null : coords[hoverIdx];

  // Pointer x is now 1:1 with viewBox units. Snaps to the nearest plotted point
  // so the readout is real data, never a value interpolated off the curve.
  // Mouse only — tracking touch here would fight page scrolling on phones.
  const handleMove = (e) => {
    if (e.pointerType !== 'mouse' || !ready) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < coords.length; i++) {
      const dist = Math.abs(coords[i].x - x);
      if (dist < bestDist) { bestDist = dist; best = i; }
    }
    setHoverIdx(best);
  };

  return (
    <div ref={wrapRef} className={`relative ${className}`} style={{ height }}>
      {ready && (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="block"
        onPointerMove={handleMove}
        onPointerLeave={() => setHoverIdx(null)}
      >
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
        {hover && (
          <>
            <line
              x1={hover.x} y1={PAD_T - 8} x2={hover.x} y2={base}
              stroke="currentColor" strokeWidth="1" strokeDasharray="3 3"
              className="text-ninja-muted"
            />
            <circle cx={hover.x} cy={hover.y} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2.5" />
          </>
        )}
        {!hover && (
          <motion.circle
            cx={last.x} cy={last.y} r="5"
            fill="#3b82f6" stroke="#fff" strokeWidth="2.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.9 }}
          />
        )}
      </svg>
      )}
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-ninja-border bg-white px-2.5 py-1.5 shadow-lg"
          style={{
            left: Math.min(width - TIP_W / 2, Math.max(TIP_W / 2, hover.x)),
            top: Math.max(0, hover.y - 10),
          }}
        >
          <span className="block font-ninja text-[11px] text-ninja-muted leading-tight">
            {formatLabel(hover.date)}
          </span>
          <span className="block font-ninja text-sm font-bold text-ninja-navy leading-tight">
            {hover.count} ninja{hover.count === 1 ? '' : 's'}
          </span>
        </div>
      )}
    </div>
  );
}

const shortDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fullDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
const weekOf = (d) => `Week of ${shortDate(d)}`;
const monthOf = (d) => d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
const monthShort = (d) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

const TOOLTIP_LABEL = { day: fullDate, week: weekOf, month: monthOf };

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
    <button
      onClick={onExpand}
      className="block w-full text-left group origin-center transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.99]"
    >
      <div className="flex items-baseline justify-between mb-2">
        <span className="font-ninja text-sm text-ninja-navy font-semibold">
          <CountUp value={thisWeek} className="font-black" /> ninja{thisWeek === 1 ? '' : 's'} this week
        </span>
        <span className="font-ninja text-xs text-ninja-muted group-hover:text-ninja-blue transition-colors">
          expand →
        </span>
      </div>
      <AreaChart points={weeks} height={112} gradientId="checkInCardFill" formatLabel={weekOf} />
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

  const axisLabel = (d) => (range.bucket === 'month' ? monthShort(d) : shortDate(d));

  return (
    <div className="space-y-5">
      {/* Range chips */}
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRangeKey(r.key)}
            className={`font-ninja text-sm font-semibold px-3 py-1.5 rounded-full transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-95 ${
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
        <AreaChart
          key={rangeKey}
          points={series}
          height={170}
          gradientId="checkInDetailFill"
          formatLabel={TOOLTIP_LABEL[range.bucket]}
        />
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

// Deliberately none of these duplicate a sidebar entry.
// Restrained quick-links: neutral card surface, small tinted icon chip for a
// hint of identity, chevron nudges on hover. The full-bleed candy gradient grid
// was the most template-looking thing on the page — gone.
const QUICK_TILES = [
  { label: 'Reports',    to: '/manager/reports',    accent: '#2563eb', Icon: ReportsIcon },
  { label: 'Curriculum', to: '/curriculum-roadmap', accent: '#0e9dc4', Icon: CurriculumIcon },
  { label: 'Birthdays',  action: 'birthdays',       accent: '#e85d3d', Icon: CakeIcon },
  { label: "What's New", to: '/changelog',          accent: '#e8890f', Icon: SparkleIcon },
];

const TILE_CLASS =
  `${CARD} group flex items-center gap-3 p-3.5 w-full text-left ` +
  'transition-[transform,border-color] duration-150 ease-[var(--ease-out)] ' +
  'hover:border-ninja-blue/50 active:scale-[0.98]';

function TileInner({ Icon, label, accent }) {
  return (
    <>
      <span
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${accent}1f`, color: accent }}
      >
        <Icon className="w-[18px] h-[18px]" />
      </span>
      <span className="font-ninja font-bold text-sm text-ninja-navy truncate">{label}</span>
      <ChevronRight className="w-4 h-4 text-ninja-muted ml-auto flex-shrink-0 transition-transform duration-150 ease-[var(--ease-out)] group-hover:translate-x-0.5" />
    </>
  );
}

function QuickTiles({ onBirthdays }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {QUICK_TILES.map((t, i) => (
        <motion.div
          key={t.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE, delay: 0.05 * i }}
        >
          {t.action === 'birthdays' ? (
            <button onClick={onBirthdays} className={TILE_CLASS}>
              <TileInner Icon={t.Icon} label={t.label} accent={t.accent} />
            </button>
          ) : (
            <Link to={t.to} className={TILE_CLASS}>
              <TileInner Icon={t.Icon} label={t.label} accent={t.accent} />
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

/* -------------------------------------------------------------- kpi/ring -- */

// Small tinted-icon stat. The accent is a solid hex; the chip uses it at ~12%
// so it reads in both themes without touching the .dark overrides.
function StatCard({ label, value, accent, Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay }}
      className={`${CARD} p-4 flex items-center gap-3`}
    >
      <span
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${accent}22`, color: accent }}
      >
        <Icon className="w-5 h-5" />
      </span>
      <div className="min-w-0">
        <CountUp value={value} className="block text-2xl font-black font-ninja text-ninja-navy leading-none" />
        <span className="font-ninja text-xs text-ninja-muted">{label}</span>
      </div>
    </motion.div>
  );
}

// Today's logged-vs-on-board ring. Accent stroke on a hairline track — a single
// quiet data point in the header, not a decorative centrepiece.
function TodayRing({ logged, total }) {
  const pct = total ? logged / total : 0;
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative w-24 h-24">
      <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-ninja-border" />
        <motion.circle
          cx="40" cy="40" r={r}
          fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round"
          className="text-ninja-blue"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black font-ninja text-ninja-navy leading-none">
          {logged}<span className="text-ninja-muted text-sm">/{total}</span>
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-ninja-muted mt-1">logged</span>
      </div>
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

  const enrollment = overview?.enrollment ?? [];
  const totalStudents = overview?.totalStudents ?? 0;

  const weeks = useMemo(() => toWeeks(dayRows), [dayRows]);
  const weekCheckins = weeks.length ? weeks[weeks.length - 1].count : 0;
  const totalVisits = dayRows.reduce((s, d) => s + d.count, 0);
  const avgWeek = dayRows.length ? Math.round((totalVisits / dayRows.length) * 7) : 0;

  const firstName = user?.displayName?.split(' ')[0] ?? '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ------------------------------------------------------ main -- */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header — clean, type-led. No gradient banner, no decorative fluff. */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
            className={`${CARD} p-6 sm:p-7`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-ninja text-xs font-bold uppercase tracking-wider text-ninja-muted">
                  {formatDate(todayStr)}
                </p>
                <h1 className="mt-1.5 text-2xl sm:text-3xl font-black font-ninja text-ninja-navy tracking-tight">
                  {greeting}{firstName && ', '}<span className="text-ninja-blue">{firstName}</span>
                </h1>
                <p className="mt-2 font-ninja text-ninja-muted max-w-md">
                  {loading
                    ? 'Pulling up today…'
                    : total === 0
                      ? 'Nobody is checked in yet. The board is clear.'
                      : `${total} ninja${total === 1 ? '' : 's'} on the board today, ${total - logged} still waiting on a log.`}
                </p>
                <Link
                  to="/manager/dashboard"
                  className="mt-4 inline-flex items-center gap-1.5 font-ninja text-sm font-bold text-ninja-blue border border-ninja-border hover:border-ninja-blue rounded-full px-4 py-2 transition-[transform,border-color] duration-150 ease-[var(--ease-out)] active:scale-[0.97]"
                >
                  Go to Today's Board →
                </Link>
              </div>
              {!loading && total > 0 && (
                <div className="hidden sm:block flex-shrink-0">
                  <TodayRing logged={logged} total={total} />
                </div>
              )}
            </div>
          </motion.div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="check-ins this week" value={weekCheckins} accent="#3b82f6" Icon={PulseIcon} delay={0.05} />
            <StatCard label="ninjas enrolled"     value={totalStudents} accent="#3b82f6" Icon={UsersIcon} delay={0.1} />
            <StatCard label="avg ninjas / week"   value={avgWeek}       accent="#3b82f6" Icon={TrendIcon} delay={0.15} />
          </div>

          {/* Center calendar */}
          <EventCalendar />

          {/* Check-ins over time */}
          <div className={`${CARD} p-5`}>
            <h2 className="font-ninja font-bold text-ninja-navy text-lg mb-3">Check-ins</h2>
            {loading ? (
              <p className="text-ninja-muted font-ninja text-sm py-4">Loading…</p>
            ) : (
              <CheckInTrend dayRows={dayRows} onExpand={() => setTrendOpen(true)} />
            )}
          </div>

          {/* CD sticky notes */}
          <DirectorStickyNotes />
        </div>

        {/* ------------------------------------------------------ rail -- */}
        <div className="space-y-6">
          <QuickTiles onBirthdays={() => setBirthdaysOpen(true)} />

          {/* Enrollment */}
          <div className={`${CARD} p-5`}>
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
