import { useMemo, useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from 'lucide-react';
import TaskActionsMenu from './TaskActionsMenu';
import { CARD } from '../../lib/surfaces';
import { COLUMNS, COLUMN_KEYS, DUE_TONE, dueMeta, plainPreview, taskHolder } from '../../lib/taskBoard';

// The same cards, as one table. The board answers "what is happening in each
// stage"; this answers "what is coming up", which a column layout cannot show
// because the thing you want to compare is spread across four of them.
//
// Every cell that holds a fact is the control that changes it. A table you can
// only read means triaging twenty cards is twenty dialogs, which is the work
// the list was supposed to save.

const COLS = 'grid-cols-[minmax(0,2.6fr)_9rem_11rem_9rem_2rem]';

// Ghost controls: no chrome until the pointer or focus arrives, so the table
// reads as text and behaves as a form. The row is a row, not a toolbar.
const GHOST =
  'w-full bg-transparent border border-transparent rounded-lg px-2 py-1 -mx-2 font-ninja text-xs text-ninja-muted ' +
  'hover:border-ninja-border hover:text-ninja-navy focus:border-ninja-blue focus:text-ninja-navy focus:outline-none ' +
  'cursor-pointer transition-colors appearance-none';

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

export default function TaskList({ tasks, canManage, directors = [], centerName, onEdit, onDelete, onArchive, onRestore, onPatch }) {
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

  // No overflow-hidden on the shell. It rounded the corners for free and
  // clipped every menu that opened near the bottom of the list with it; the
  // corners are rounded by the first and last rows instead.
  return (
    <div className={CARD}>
      <div className={`hidden lg:grid ${COLS} gap-3 px-5 py-2.5 rounded-t-2xl border-b border-ninja-border bg-ninja-bg font-ninja font-bold text-[11px] text-ninja-muted`}>
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
        const lead = task.title?.trim() || plainPreview(task.body) || 'Untitled';
        const note = task.title?.trim() ? plainPreview(task.body) : '';
        const list = task.checklist || [];
        const ticked = list.filter((i) => i.done).length;
        const editable = canManage && !task.archived_at;
        const who = task.assignee_center ? 'center' : task.assignee_id ? String(task.assignee_id) : 'center';

        const title = (
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onEdit(task)}
              className="max-w-full text-left rounded font-ninja text-sm font-semibold text-ninja-navy hover:text-ninja-blue transition-colors truncate block"
            >
              {lead}
            </button>
            {(note || list.length > 0) && (
              <p className="font-ninja text-xs text-ninja-muted truncate">
                {list.length > 0 && <span className="tabular-nums mr-2">{ticked}/{list.length}</span>}
                {note}
              </p>
            )}
          </div>
        );

        const status = editable ? (
          <select
            value={task.column_key}
            onChange={(e) => onPatch(task, { column_key: e.target.value })}
            aria-label={`Status of ${lead}`}
            className={GHOST}
          >
            {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </select>
        ) : (
          <span className="font-ninja text-xs text-ninja-muted">
            {COLUMNS.find((c) => c.key === task.column_key)?.label}
          </span>
        );

        const owner = editable ? (
          <select
            value={who}
            onChange={(e) => {
              const v = e.target.value;
              onPatch(task, v === 'center'
                ? { assignee_center: true, assignee_id: null, assignee_name: null }
                : { assignee_center: false, assignee_id: Number(v), assignee_name: directors.find((d) => String(d.id) === v)?.display_name || null });
            }}
            aria-label={`Who has ${lead}`}
            className={GHOST}
          >
            <option value="center">{centerName || 'The whole center'}</option>
            <optgroup label="Center Directors">
              {directors.map((d) => <option key={d.id} value={String(d.id)}>{d.display_name}</option>)}
            </optgroup>
            {task.assignee_id && !directors.some((d) => d.id === task.assignee_id) && (
              <option value={String(task.assignee_id)}>{task.assignee_name || 'No longer here'}</option>
            )}
          </select>
        ) : (
          <span className="font-ninja text-xs text-ninja-muted truncate">{taskHolder(task) || 'Nobody yet'}</span>
        );

        // The date input carries the tone the card carries, so an overdue row
        // reads as overdue whether or not anyone is about to change it.
        const when = editable ? (
          <input
            type="date"
            value={task.due_date || ''}
            onChange={(e) => onPatch(task, { due_date: e.target.value || null })}
            aria-label={`Due date of ${lead}`}
            className={`${GHOST} ${due ? DUE_TONE[due.tone] : ''}`}
          />
        ) : (
          <span className={`font-ninja text-xs ${due ? DUE_TONE[due.tone] : 'text-ninja-muted'}`}>
            {due?.text || 'No date'}
          </span>
        );

        const menu = canManage && (
          <TaskActionsMenu
            task={task}
            onOpen={() => onEdit(task)}
            onDelete={onDelete}
            onArchive={onArchive}
            onRestore={onRestore}
            onMoveTo={(t, key) => onPatch(t, { column_key: key })}
          />
        );

        return (
          <div
            key={task.id}
            className={`border-b border-ninja-border/50 last:border-b-0 last:rounded-b-2xl hover:bg-ninja-bg/60 transition-colors ${task.archived_at ? 'opacity-60' : ''}`}
          >
            <div className={`hidden lg:grid ${COLS} gap-3 px-5 py-2.5 items-center`}>
              {title}
              {status}
              {owner}
              {when}
              <div className="justify-self-end">{menu}</div>
            </div>

            <div className="lg:hidden px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                {title}
                {menu}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {status}
                {when}
                <div className="col-span-2">{owner}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
