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
  // Tabular figures: proportional digits change width as the count ticks up, so
  // the text beside it visibly shuffles for the whole animation.
  return <span className={`tabular-nums ${className}`}>{n}</span>;
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
const GiftIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M21 11.25v8.25a1.5 1.5 0 0 1-1.5 1.5H5.25a1.5 1.5 0 0 1-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 1 0 9.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1 1 14.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
  </svg>
);
const CurriculumIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
  </svg>
);

// Shared card surface. The subtle ring + shadow give cards enough lift off the
// deep-slate page that they stop reading as flat panels — the depth that was
// missing before. Explicit dark shadow because the light one is invisible on
// the dark bg.
const CARD =
  'rounded-2xl bg-white border border-ninja-border shadow-sm ' +
  'dark:shadow-[0_10px_34px_rgb(0_0_0/0.32)] ring-1 ring-transparent dark:ring-white/[0.05]';


// Loading placeholders shaped like the thing that's coming, instead of the word
// "Loading…" — the card keeps its height so nothing jumps when data lands.
function Skeleton({ className = '', style }) {
  return <div className={`animate-pulse rounded-md bg-ninja-bg ${className}`} style={style} />;
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

// Peak day, weekly pace, and the change against the equally-long window before.
// Shared by the card and the expanded view so the two can't drift apart.
// `days` null means every day on record.
function summarize(dayRows, days) {
  const inRange = days ? dayRows.slice(-days) : dayRows;
  const total = inRange.reduce((s, d) => s + d.count, 0);
  const peak = inRange.reduce((best, d) => (d.count > (best?.count ?? -1) ? d : best), null);
  const perWeek = inRange.length ? (total / inRange.length) * 7 : 0;
  const prior = days ? dayRows.slice(-(days * 2), -days) : [];
  const priorTotal = prior.reduce((s, d) => s + d.count, 0);
  // Needs a FULL prior window, else a half-empty one reads as a fake collapse.
  const hasPrior = prior.length === inRange.length && priorTotal > 0;
  return {
    total,
    peak,
    perWeek,
    delta: hasPrior ? Math.round(((total - priorTotal) / priorTotal) * 100) : null,
  };
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

// The chart drew itself in a hardcoded blue, so it was the one surface that
// ignored the accent a user picked in Appearance. Reading the token keeps it in
// step with every other blue on the page.
const ACCENT = 'rgb(var(--ninja-blue))';

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
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.32" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
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
          stroke={ACCENT}
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
            {/* Halo takes the card surface, not flat white — a white ring on the
                dark card read as a bright speck rather than a cut-out. */}
            <circle cx={hover.x} cy={hover.y} r="5" fill={ACCENT} strokeWidth="2.5" className="stroke-white dark:stroke-[#252c3e]" />
          </>
        )}
        {!hover && (
          <motion.circle
            cx={last.x} cy={last.y} r="5"
            fill={ACCENT} strokeWidth="2.5" className="stroke-white dark:stroke-[#252c3e]"
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
          <span className="block font-ninja text-sm font-bold text-ninja-navy leading-tight tabular-nums">
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

const CARD_CHART_H = 208;

// Label-left, number-right. The rail is only ~320px wide, so the expanded
// view's three-across tiles don't fit here.
function StatRow({ label, sub, value, tone = 'text-ninja-navy' }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="font-ninja text-sm text-ninja-muted truncate">
        {label}
        {sub && <span className="block text-xs text-ninja-muted/70">{sub}</span>}
      </span>
      <span className={`font-ninja text-lg font-black tabular-nums flex-shrink-0 ${tone}`}>{value}</span>
    </div>
  );
}

function CheckInTrend({ dayRows, onExpand }) {
  const weeks = useMemo(() => toWeeks(dayRows, CARD_WEEKS), [dayRows]);
  // Same span the chart draws, so the numbers describe the curve above them.
  const stats = useMemo(() => summarize(dayRows, CARD_WEEKS * 7), [dayRows]);

  if (weeks.length === 0) {
    // Composed empty state rather than a bare line of grey text: a flat baseline
    // where the curve will be, so the card reads as "nothing yet", not "broken".
    return (
      <div className="py-2">
        <div className="flex items-end" style={{ height: CARD_CHART_H }}>
          <div className="w-full border-b-2 border-dashed border-ninja-border" />
        </div>
        <p className="text-ninja-muted font-ninja text-sm mt-3 text-pretty">
          No check-ins on record yet. Once ninjas start checking in, their weekly
          count shows up here.
        </p>
      </div>
    );
  }
  const thisWeek = weeks[weeks.length - 1].count;
  const { peak, perWeek, delta, total } = stats;

  return (
    <>
      {/* Only the chart opens the expanded view. Wrapping the stats in the
          button too would make the whole card one "Expand check-ins" target. */}
      <button
        onClick={onExpand}
        aria-label="Expand check-ins"
        className="block w-full text-left group origin-center rounded-lg transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.99]"
      >
        <div className="flex items-baseline justify-between mb-2">
          <span className="font-ninja text-sm text-ninja-navy font-semibold">
            <CountUp value={thisWeek} className="font-black" /> ninja{thisWeek === 1 ? '' : 's'} this week
          </span>
          <span className="font-ninja text-xs text-ninja-muted group-hover:text-ninja-blue transition-colors">
            expand →
          </span>
        </div>
        <AreaChart points={weeks} height={CARD_CHART_H} gradientId="checkInCardFill" formatLabel={weekOf} />
        <div className="flex justify-between font-ninja text-[10px] text-ninja-muted mt-1">
          <span>{shortDate(weeks[0].date)}</span>
          <span>{shortDate(weeks[Math.floor(weeks.length / 2)].date)}</span>
          <span>This week</span>
        </div>
      </button>

      {/* The three numbers that used to need a trip through the modal. */}
      <div className="mt-4 pt-4 border-t border-ninja-border space-y-3">
        <StatRow
          label="Busiest day"
          sub={peak?.count ? shortDate(peak.date) : null}
          value={peak?.count ?? 0}
        />
        <StatRow label="Ninjas a week" value={Math.round(perWeek)} />
        {/* A centre needs 16 weeks on record before the comparison means
            anything, and none of them do yet. Until then this row carries the
            period total instead of sitting blank. The comparison is never
            estimated from a partial window: a half-empty one reads as a
            collapse that didn't happen. */}
        {delta === null ? (
          <StatRow label="Check-ins, 8 weeks" value={total} />
        ) : (
          <StatRow
            label="vs previous 8 weeks"
            value={`${delta > 0 ? '+' : ''}${delta}%`}
            tone={delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-ninja-red' : 'text-ninja-navy'}
          />
        )}
      </div>
    </>
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
  // Same helper the card uses, so the two readouts can't disagree.
  const { peak, perWeek, delta } = useMemo(
    () => summarize(dayRows, range.days),
    [dayRows, range.days],
  );

  const axisLabel = (d) => (range.bucket === 'month' ? monthShort(d) : shortDate(d));

  return (
    <div className="space-y-5">
      {/* Range chips */}
      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRangeKey(r.key)}
            aria-pressed={rangeKey === r.key}
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
          <span className="block text-xl font-black font-ninja text-ninja-navy leading-none tabular-nums">
            {peak?.count ?? 0}
          </span>
          <span className="font-ninja text-xs text-ninja-muted">
            busiest day{peak?.count ? ` · ${shortDate(peak.date)}` : ''}
          </span>
        </div>
        <div className="rounded-xl bg-ninja-bg p-3">
          <span className="block text-xl font-black font-ninja text-ninja-navy leading-none tabular-nums">
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
                className={`block text-xl font-black font-ninja leading-none tabular-nums ${
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
              <span className="font-ninja text-xs font-bold text-ninja-navy w-10 text-right flex-shrink-0 tabular-nums">
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

/* ---------------------------------------------------------- quick tiles -- */

// Deliberately none of these duplicate a sidebar entry.
// Restrained quick-links: neutral card, a plain monochrome icon that picks up
// the accent on hover, chevron nudges. No tinted icon-chip squares — those
// colored rounded tiles are the template/AI-dashboard tell.
// Birthdays used to live here; they now show up on the calendar itself.
const QUICK_TILES = [
  { label: 'Reports',    to: '/manager/reports',    Icon: ReportsIcon },
  { label: 'Curriculum', to: '/curriculum-roadmap', Icon: CurriculumIcon },
  { label: "What's New", to: '/changelog',          Icon: GiftIcon },
];

// These were three equal icon-and-chevron cards in the rail, which is the most
// recognisable generated-dashboard shape there is. They are links, so they read
// as links now: one inline row under the masthead, no surface of their own.
function QuickLinks() {
  return (
    <nav aria-label="Quick links" className="flex flex-wrap items-center gap-x-6 gap-y-3">
      {QUICK_TILES.map((t, i) => (
        <motion.span
          key={t.label}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE, delay: 0.1 + 0.05 * i }}
        >
          <Link
            to={t.to}
            className="group inline-flex items-center gap-2 font-ninja text-sm font-bold text-ninja-muted hover:text-ninja-navy underline-offset-[6px] hover:underline decoration-ninja-blue/40 transition-colors rounded"
          >
            <t.Icon className="w-4 h-4 flex-shrink-0 text-ninja-muted group-hover:text-ninja-blue transition-colors" />
            {t.label}
          </Link>
        </motion.span>
      ))}
    </nav>
  );
}

/* ----------------------------------------------------------------- page -- */

export default function DirectorDashboard() {
  const { user } = useAuth();
  const todayStr = today();
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState(null);
  const [trendOpen, setTrendOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get('/reports/attendance?range=all')
      .catch(() => null)
      .then((att) => {
        if (!alive) return;
        setAttendance(att);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  const dayRows = useMemo(() => buildDays(attendance?.attendance), [attendance]);

  const firstName = user?.displayName?.split(' ')[0] ?? '';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <Layout>
      <div className="space-y-8">
        {/* Masthead. Deliberately NOT a card: it carries no data, and wrapping a
            page title in its own elevated surface was what turned this page into
            a stack of five identical boxes. A page title is allowed to sit on
            the page. */}
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <p className="font-ninja text-sm text-ninja-muted">{formatDate(todayStr)}</p>
          <h1 className="mt-1 text-3xl sm:text-4xl font-black font-ninja text-ninja-navy tracking-tight text-balance">
            {greeting}{firstName && ', '}<span className="text-ninja-blue">{firstName}</span>
          </h1>
          <div className="mt-5">
            <QuickLinks />
          </div>
          <div className="mt-6 border-t border-ninja-border" />
        </motion.header>

        {/* Notes run the full width. Squeezed into two thirds they were three
            cramped columns; this is a board, so give it the wall. */}
        <DirectorStickyNotes />

        {/* Calendar earns its surface (it IS an object), check-ins rides the
            rail beside it. Asymmetric on purpose. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          <div className="lg:col-span-2">
            <EventCalendar />
          </div>

          {/* Enrollment used to sit here; that breakdown lives on Reports, so
              it isn't duplicated on the dashboard. */}
          <section className={`${CARD} p-5`} aria-labelledby="checkins-heading">
            {/* No Reports link here: there is already one in the row under the
                greeting, and two on one screen is one too many. */}
            <h2 id="checkins-heading" className="font-ninja font-bold text-ninja-navy text-lg mb-3">Check-ins</h2>
            {loading ? (
              // Same shape and height as the loaded card, so nothing shifts
              // when the data lands.
              <div aria-busy="true" aria-label="Loading check-ins">
                <div className="flex items-baseline justify-between mb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="w-full rounded-lg" style={{ height: CARD_CHART_H }} />
                <div className="flex justify-between mt-2">
                  <Skeleton className="h-2.5 w-10" />
                  <Skeleton className="h-2.5 w-10" />
                  <Skeleton className="h-2.5 w-14" />
                </div>
                <div className="mt-4 pt-4 border-t border-ninja-border space-y-3">
                  {[28, 24, 32].map((w, i) => (
                    <div key={i} className="flex items-baseline justify-between">
                      <Skeleton className="h-4" style={{ width: `${w}%` }} />
                      <Skeleton className="h-5 w-10" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <CheckInTrend dayRows={dayRows} onExpand={() => setTrendOpen(true)} />
            )}
          </section>
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

    </Layout>
  );
}
