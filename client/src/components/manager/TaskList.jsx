import { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import TaskActionsMenu from './TaskActionsMenu';
import { Assignee } from './TaskCardFace';
import { CARD } from '../../lib/surfaces';
import { COLUMN_KEYS, COLUMN_LABEL, DUE_TONE, dueMeta, plainPreview, taskHolder } from '../../lib/taskBoard';

// The same cards, as one table. The board answers "what is happening in each
// stage"; this answers "what is coming up", which a column layout cannot show
// because the thing you want to compare is spread across four of them.

const COLS = 'grid-cols-[minmax(0,3fr)_1.1fr_1.3fr_1fr_auto]';

// Nulls sort last in BOTH directions. A card with no date is not the earliest
// or the latest, it is not on the timeline at all, and flipping it to the top
// would put the least informative rows where the most urgent ones were.
const nullsLast = (a, b, cmp) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return cmp(a, b);
};

const text = (a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });

const SORTS = {
  // Dates compare as strings: YYYY-MM-DD sorts correctly and never goes through
  // Date(), which reads a pg DATE as the evening before in this timezone.
  due: (t) => t.due_date || null,
  title: (t) => (t.title?.trim() || plainPreview(t.body) || null),
  status: (t) => COLUMN_KEYS.indexOf(t.column_key),
  assignee: (t) => taskHolder(t) || null,
};

function SortHeader({ label, sortKey, sort, onSort, className = '' }) {
  const on = sort.key === sortKey;
  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      aria-label={`Sort by ${label}`}
      className={`flex items-center gap-1 text-left uppercase tracking-widest transition-colors hover:text-ninja-navy ${on ? 'text-ninja-navy' : ''} ${className}`}
    >
      {label}
      {on && (sort.dir === 'asc'
        ? <ChevronUpIcon size={12} strokeWidth={3} aria-hidden="true" />
        : <ChevronDownIcon size={12} strokeWidth={3} aria-hidden="true" />)}
    </button>
  );
}

export default function TaskList({ tasks, canManage, onEdit, onDelete, onArchive, onRestore, onMoveTo }) {
  const [sort, setSort] = useState({ key: 'due', dir: 'asc' });

  const toggleSort = (key) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const rows = useMemo(() => {
    const read = SORTS[sort.key];
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...tasks].sort((a, b) => {
      const av = read(a);
      const bv = read(b);
      const cmp = nullsLast(av, bv, typeof av === 'number' ? (x, y) => x - y : text);
      if (cmp !== 0) return cmp * dir;
      // Stable and reproducible across a refetch: archiving leaves holes in
      // position, so two cards can share one.
      return COLUMN_KEYS.indexOf(a.column_key) - COLUMN_KEYS.indexOf(b.column_key)
        || a.position - b.position
        || a.id - b.id;
    });
  }, [tasks, sort]);

  if (!rows.length) {
    return (
      <div className={`${CARD} py-12 text-center font-ninja text-sm text-ninja-muted`}>
        Nothing matches.
      </div>
    );
  }

  return (
    <div className={`${CARD} overflow-hidden`}>
      <div className={`hidden lg:grid ${COLS} gap-4 px-5 py-3 border-b border-ninja-border bg-ninja-bg font-ninja font-bold text-xs text-ninja-muted`}>
        <SortHeader label="Task" sortKey="title" sort={sort} onSort={toggleSort} />
        <SortHeader label="Status" sortKey="status" sort={sort} onSort={toggleSort} />
        <SortHeader label="Who has it" sortKey="assignee" sort={sort} onSort={toggleSort} />
        <SortHeader label="Due" sortKey="due" sort={sort} onSort={toggleSort} />
        <span className="sr-only">Actions</span>
      </div>

      {rows.map((task) => {
        // Computed once and used by both layouts, so the phone and the desktop
        // cannot come to say different things about the same card.
        const due = dueMeta(task.due_date);
        const holder = taskHolder(task);
        const lead = task.title?.trim() || plainPreview(task.body) || 'Untitled';
        const note = task.title?.trim() ? plainPreview(task.body) : '';
        const done = (task.checklist || []).filter((i) => i.done).length;
        const total = (task.checklist || []).length;

        const title = (
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="w-full text-left rounded font-ninja text-sm font-bold text-ninja-navy hover:text-ninja-blue transition-colors truncate"
          >
            {lead}
          </button>
        );
        const status = (
          <span className="font-ninja text-xs text-ninja-muted">{COLUMN_LABEL[task.column_key]}</span>
        );
        const who = holder
          ? <Assignee name={holder} center={task.assignee_center} />
          : <span className="font-ninja text-xs text-ninja-muted">Nobody yet</span>;
        const when = due
          ? <span className={`font-ninja text-xs ${DUE_TONE[due.tone]}`}>{due.text}</span>
          : <span className="font-ninja text-xs text-ninja-muted">No date</span>;
        const menu = canManage && (
          <TaskActionsMenu
            task={task}
            onOpen={() => onEdit(task)}
            onDelete={onDelete}
            onArchive={onArchive}
            onRestore={onRestore}
            onMoveTo={onMoveTo}
          />
        );

        return (
          <div key={task.id} className={task.archived_at ? 'opacity-60' : ''}>
            <div className={`hidden lg:grid ${COLS} gap-4 px-5 py-3 items-center border-b border-ninja-border/60 last:border-b-0 hover:bg-ninja-bg transition-colors`}>
              <div className="min-w-0">
                {title}
                {note && <p className="font-ninja text-xs text-ninja-muted truncate">{note}</p>}
                {total > 0 && (
                  <p className="font-ninja text-xs text-ninja-muted tabular-nums">{done}/{total} done</p>
                )}
              </div>
              {status}
              {who}
              {when}
              <div className="justify-self-end">{menu}</div>
            </div>

            <div className="lg:hidden px-4 py-3 border-b border-ninja-border/60 last:border-b-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">{title}</div>
                {menu}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                {status}
                {who}
                {when}
                {total > 0 && (
                  <span className="font-ninja text-xs text-ninja-muted tabular-nums">{done}/{total}</span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
