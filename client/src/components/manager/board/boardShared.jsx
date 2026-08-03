import { useRef, useLayoutEffect } from 'react';
import { XIcon } from 'lucide-react';

// The parts of the task board that aren't about how a card looks: the columns
// it can sit in, how the flat list and the columns convert between each other,
// and the measuring the drag maths runs on.

export const GAP = 16;
export const EASE = [0.23, 1, 0.32, 1];
export const SPRING = { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 };

export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export const LANES = [
  { key: 'todo',  label: 'To do' },
  { key: 'doing', label: 'In progress' },
  { key: 'done',  label: 'Done' },
];
export const LANE_INDEX = Object.fromEntries(LANES.map((l, i) => [l.key, i]));

// The page itself is painted in ninja-bg, so a column filled with that token
// would be invisible in both themes. A tint of the opposite ink lifts off the
// page either way, and opacity utilities deliberately escape the .dark bg
// overrides, which is the one time that behaviour is wanted.
export const COLUMN_SURFACE = 'bg-black/[0.035] dark:bg-white/[0.04]';

// Description markdown. Everything inherits currentColor. Images dropped: CSP
// allows wildcard Supabase for img-src, so a remote image in shared text is an
// open-time beacon.
export const MD = {
  p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc marker:opacity-50 pl-4 mb-1.5 last:mb-0 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal marker:opacity-50 pl-4 mb-1.5 last:mb-0 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">{children}</a>,
  img: () => null,
  h1: ({ children }) => <p className="font-bold mb-1.5">{children}</p>,
  h2: ({ children }) => <p className="font-bold mb-1.5">{children}</p>,
  h3: ({ children }) => <p className="font-bold mb-1.5">{children}</p>,
};

export const mdUrl = (url) => (/^(https?:|mailto:)/i.test(url) ? url : '');

export const shortDate = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// A due date is a calendar day, not an instant. Parsing 'YYYY-MM-DD' through
// the Date constructor treats it as UTC midnight and prints the day before for
// anyone west of Greenwich, so the parts are handed over separately.
export const dayLabel = (ymd) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// First name only. A column is 240px wide and "Christopher Alvarado" is the
// whole card; whoever it is, the people reading this board know them.
export const firstName = (name) => (name || '').trim().split(' ')[0] || 'Unknown';

// Round icon buttons. Words in a card footer wrap onto a second line and push
// the card apart; these carry their label in title + aria-label instead, so
// nothing is hover-only for assistive tech.
export function IconButton({ onClick, label, danger, subtle, className = '', children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
        subtle ? 'opacity-50 hover:opacity-100' : ''
      } ${danger ? 'hover:bg-red-500 hover:text-white' : 'hover:bg-black/10'} ${className}`}
    >
      {children}
    </button>
  );
}

export function DiscardButton({ onClick, label = 'Discard' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-7 h-7 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/10 transition"
    >
      <XIcon className="w-4 h-4" strokeWidth={2.5} />
    </button>
  );
}

// The columns hold cards of whatever height their contents need, so the
// board can't work off a constant. Each card reports its own measured height
// and the lane stacks them from that. onHeight must be stable, or the observer
// is torn down and rebuilt on every render.
export function useReportedHeight(id, onHeight) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const report = () => onHeight(id, el.offsetHeight);
    report();
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [id, onHeight]);
  return ref;
}

// The board is held as one flat list; the columns are a view of it. Rebuilding
// in column order after every move keeps the list and the board describing the
// same thing, so what gets persisted is what is on screen.
export const splitLanes = (tasks, skipId) => {
  const lanes = {};
  for (const l of LANES) lanes[l.key] = [];
  for (const t of tasks) {
    if (t.id === skipId) continue;
    (lanes[t.status] || lanes.todo).push(t);
  }
  return lanes;
};

export const flattenLanes = (lanes) => LANES.flatMap((l) => lanes[l.key]);
