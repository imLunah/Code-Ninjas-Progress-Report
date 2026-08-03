import { useRef, useLayoutEffect } from 'react';
import { XIcon, CheckIcon } from 'lucide-react';

// Shared by both sides of the director board: the sticky wall and the task
// lanes. They look nothing alike on purpose, but they are the same records with
// the same author, center and lifetime, so the parts that aren't about
// appearance live here rather than being written twice and drifting.

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

// Body markdown. Everything inherits currentColor so the same map works on a
// pastel sticky and on a white task card. Images dropped: CSP allows wildcard
// Supabase for img-src, so a remote image in shared text is an open-time beacon.
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

export function ConfirmButton({ onClick, disabled, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="w-7 h-7 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 disabled:opacity-40 disabled:hover:bg-black/10 transition"
    >
      <CheckIcon className="w-4 h-4" strokeWidth={2.5} />
    </button>
  );
}

// The task lanes hold cards of whatever height their contents need, so the
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

// The board is held as one flat list; the lanes are a view of it. Rebuilding in
// lane order after every move keeps the list and the board describing the same
// thing, so what gets persisted is what is on screen.
export const splitLanes = (notes, skipId) => {
  const lanes = {};
  for (const l of LANES) lanes[l.key] = [];
  for (const n of notes) {
    if (n.id === skipId) continue;
    (lanes[n.status] || lanes.todo).push(n);
  }
  return lanes;
};

export const flattenLanes = (lanes) => LANES.flatMap((l) => lanes[l.key]);
