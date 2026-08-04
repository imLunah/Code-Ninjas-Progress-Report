import { XIcon } from 'lucide-react';
import { today } from '../../../utils/dateUtils';

// What every surface of the Operations Tracker shares: what a task can be, the
// stages it moves through, and the small pieces of a row — tag, owner badge,
// due date — drawn the same way on the tracker page and the dashboard preview.

export const LANES = [
  { key: 'todo',  label: 'To do' },
  { key: 'doing', label: 'In progress' },
  { key: 'done',  label: 'Done' },
];

// The kinds, in the Operations Tracker's own words. Every tint is one of the
// pairs index.css carries a dark override for.
export const CATEGORIES = [
  { key: 'follow_up',      label: 'Follow up',        chip: 'bg-blue-100 text-blue-700' },
  { key: 'resume_hold',    label: 'Resume from hold', chip: 'bg-green-100 text-green-700' },
  { key: 'cancel',         label: 'Cancel',           chip: 'bg-red-100 text-red-700' },
  { key: 'submit_invoice', label: 'Submit invoice',   chip: 'bg-purple-100 text-purple-700' },
  { key: 'print',          label: 'Print request',    chip: 'bg-indigo-100 text-indigo-700' },
  // No chip: most work is just work, and a tag that says "Other" says nothing.
  { key: 'other',          label: 'Other',            chip: null },
];
export const categoryOf = (key) =>
  CATEGORIES.find((c) => c.key === key) || CATEGORIES[CATEGORIES.length - 1];

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

export const money = (n) =>
  `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// The claim in one line, in the order somebody chasing it reads: how much, for
// when, from whom.
export const invoiceLine = (invoice) => [
  invoice.amount != null ? money(invoice.amount) : null,
  invoice.service_month
    ? `${MONTHS[invoice.service_month - 1].slice(0, 3)} ${invoice.service_year || ''}`.trim()
    : null,
  invoice.rc_name,
].filter(Boolean).join(' · ');

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

export const firstName = (name) => (name || '').trim().split(' ')[0] || 'Unknown';

// What surfaces first inside a group. Late outranks everything, then today,
// then dated work in date order, then the rest as the server sent them.
export const urgency = (task) => {
  const now = today();
  if (task.status === 'done') return 9;
  if (task.due_date && task.due_date < now) return 0;
  if (task.due_date === now) return 1;
  if (task.due_date) return 2;
  return 3;
};

export const sortByUrgency = (tasks) => [...tasks].sort(
  (a, b) => urgency(a) - urgency(b)
    || (a.due_date || '9999').localeCompare(b.due_date || '9999'),
);

/* ------------------------------------------------------------- row atoms -- */

export function KindTag({ category, className = '' }) {
  const cat = categoryOf(category);
  if (!cat.chip) return null;
  return (
    <span className={`inline-flex font-ninja text-[11px] font-bold px-1.5 py-0.5 rounded-md whitespace-nowrap ${cat.chip} ${className}`}>
      {cat.label}
    </span>
  );
}

// Not a photo. The people on this list are five directors who know each other;
// a letter in a tinted circle is identity enough, and the tint pairs are the
// ones the dark theme already knows how to flip.
const OWNER_TINTS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-indigo-100 text-indigo-700',
  'bg-yellow-100 text-yellow-700',
];

export function OwnerBadge({ id, name }) {
  if (!id) return null;
  const initial = (name || '').trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      aria-hidden="true"
      className={`w-5 h-5 rounded-full inline-flex items-center justify-center font-ninja text-[10px] font-bold flex-shrink-0 ${OWNER_TINTS[id % OWNER_TINTS.length]}`}
    >
      {initial}
    </span>
  );
}

// Plain text, not a pill: a date is data, and the only dates that deserve ink
// are the ones something is wrong or about to be wrong with.
export function DueDate({ due, status }) {
  if (!due) return null;
  const done = status === 'done';
  const now = today();
  const overdue = !done && due < now;
  const dueToday = !done && due === now;
  return (
    <span
      className={`font-ninja text-xs whitespace-nowrap ${
        overdue ? 'font-bold text-ninja-red' : dueToday ? 'font-bold text-yellow-700' : 'text-ninja-muted'
      }`}
    >
      {overdue ? `Late ${dayLabel(due)}` : dueToday ? 'Today' : dayLabel(due)}
    </span>
  );
}

// Round icon buttons carrying their label in title + aria-label, so nothing is
// hover-only for assistive tech.
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
