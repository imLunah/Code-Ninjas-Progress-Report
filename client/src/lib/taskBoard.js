// One definition of the director task board's vocabulary.
//
// The dashboard summary card and the full board page both need the column
// order, the palette and the due-date reading. Kept here so a card that says
// "2 in progress" can't come to mean something different from the column the
// board draws under the same name.

export const COLUMNS = [
  { key: 'todo', label: 'To do' },
  { key: 'doing', label: 'In progress' },
  { key: 'done', label: 'Done' },
];

export const COLUMN_KEYS = COLUMNS.map((c) => c.key);

export const COLUMN_LABEL = Object.fromEntries(COLUMNS.map((c) => [c.key, c.label]));

// Inline hex, not a `bg-*` utility. The swatches sit on a card surface that the
// `.dark` overrides rewrite, and an opacity variant like `bg-amber-500/40`
// escapes those overrides and renders light on a dark card. A literal colour
// composites the same either way.
//
// `rgb` is the same colour as bare channels, which is what lets a card tint
// itself: `rgb(var(--task-rgb) / 0.1)` is an alpha over whatever the card sits
// on, so one value reads correctly on white and on deep slate. A fixed tint hex
// per theme would need two of everything and still be wrong on a hovered card.
//
// `none` is the default and leaves the card plain: a board where every card is
// coloured is a board where the colour has stopped meaning anything.
export const COLORS = [
  { key: 'none', label: 'No colour', hex: null, rgb: null },
  { key: 'blue', label: 'Blue', hex: '#3b82f6', rgb: '59 130 246' },
  { key: 'amber', label: 'Amber', hex: '#f59e0b', rgb: '245 158 11' },
  { key: 'green', label: 'Green', hex: '#10b981', rgb: '16 185 129' },
  { key: 'purple', label: 'Purple', hex: '#a855f7', rgb: '168 85 247' },
  { key: 'red', label: 'Red', hex: '#ef4444', rgb: '239 68 68' },
];

export const COLOR_HEX = Object.fromEntries(COLORS.map((c) => [c.key, c.hex]));
export const COLOR_RGB = Object.fromEntries(COLORS.map((c) => [c.key, c.rgb]));

// What a card wears to carry its colour: the class that tints it and the
// channels that class reads. Returned together so no surface can take one and
// forget the other, and so an untagged card gets exactly nothing.
export function taskTint(color) {
  const rgb = COLOR_RGB[color];
  return {
    className: rgb ? 'task-card task-tinted' : 'task-card',
    style: rgb ? { '--task-rgb': rgb } : undefined,
  };
}

/* ------------------------------------------------------------ grouping -- */

// Tasks arrive already ordered by position. Grouping preserves that order, so
// the array index IS the rank and nothing has to re-sort on every render.
export function groupByColumn(tasks) {
  const out = Object.fromEntries(COLUMN_KEYS.map((k) => [k, []]));
  for (const t of tasks) (out[t.column_key] || out.todo).push(t);
  return out;
}

// Rebuild the flat list after a move, restamping position from the array index
// so the numbers stay dense. Returns the whole board because that is what the
// reorder endpoint takes: one transaction covering the dropped card and every
// card that shifted under it.
export function moveTask(tasks, id, toColumn, toIndex) {
  const moving = tasks.find((t) => t.id === id);
  if (!moving) return tasks;

  const grouped = groupByColumn(tasks.filter((t) => t.id !== id));
  const target = grouped[toColumn] || grouped.todo;
  const at = Math.max(0, Math.min(toIndex, target.length));
  target.splice(at, 0, { ...moving, column_key: toColumn });

  const out = [];
  for (const key of COLUMN_KEYS) {
    grouped[key].forEach((t, i) => out.push({ ...t, column_key: key, position: i }));
  }
  return out;
}

export const reorderPayload = (tasks) =>
  tasks.map(({ id, column_key, position }) => ({ id, column_key, position }));

/* ----------------------------------------------------------- due dates -- */

const dayKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Compared as calendar strings, never as timestamps. A pg DATE arrives as
// YYYY-MM-DD and `new Date('2026-08-14')` parses as UTC midnight, which in
// California is the evening of the 13th — that is exactly how club sessions
// ended up labelled "Yesterday" on the day they happened.
export function dueMeta(due, todayStr = dayKey(new Date())) {
  if (!due) return null;

  const [y, m, d] = due.split('-').map(Number);
  const label = new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  if (due < todayStr) return { label, text: `Overdue · ${label}`, tone: 'overdue' };
  if (due === todayStr) return { label, text: 'Due today', tone: 'today' };

  const [ty, tm, td] = todayStr.split('-').map(Number);
  const days = Math.round((new Date(y, m - 1, d) - new Date(ty, tm - 1, td)) / 86400000);
  if (days === 1) return { label, text: 'Due tomorrow', tone: 'soon' };
  if (days <= 7) return { label, text: `Due ${label}`, tone: 'soon' };
  return { label, text: `Due ${label}`, tone: 'later' };
}

// Plain red text, no pill. Matches the overdue club badge — a red box beside a
// task title makes the box the loudest thing in the card.
export const DUE_TONE = {
  overdue: 'text-ninja-red font-semibold',
  today: 'text-ninja-red font-semibold',
  soon: 'text-ninja-navy',
  later: 'text-ninja-muted',
};

/* ------------------------------------------------------------- preview -- */

// Bodies are stored as markdown. On a card we want a couple of lines of prose,
// not rendered headings and bullets fighting the title for weight, so the
// syntax is stripped rather than rendered. The full note renders properly the
// moment the card is opened.
export function plainPreview(md) {
  if (!md) return '';
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s{0,3}[-*+]\s+/gm, '')
    .replace(/^\s{0,3}\d+\.\s+/gm, '')
    .replace(/[*_~>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ------------------------------------------------------------- preview -- */

// How many cards a preview column shows before it just reports the rest.
export const PREVIEW_PER_COLUMN = 2;

export const todayKey = () => dayKey(new Date());

// What surfaces first in a preview column: late, then due today, then dated
// work in date order, then undated in board order.
//
// The dashboard has room for two cards a column, so which two it picks is the
// whole value of the preview. An undated card that is nobody's deadline is
// exactly what should lose that space. Array.sort is stable, so the undated
// tail keeps the order the directors themselves arranged.
export function previewOrder(items, todayStr = todayKey()) {
  const rank = (t) =>
    !t.due_date ? 3 : t.due_date < todayStr ? 0 : t.due_date === todayStr ? 1 : 2;

  return [...items].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    if (ra === 3) return 0;
    return a.due_date < b.due_date ? -1 : a.due_date > b.due_date ? 1 : 0;
  });
}
