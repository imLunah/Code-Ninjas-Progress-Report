import { useState, useEffect, useMemo, useCallback } from 'react';
import { SearchIcon, XIcon, PlusIcon } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import TaskTable from '../../components/manager/board/TaskTable';
import TaskDialog from '../../components/manager/board/TaskDialog';
import { CATEGORIES, sortByUrgency } from '../../components/manager/board/boardShared';
import { Skeleton } from '../../components/ui/Skeleton';
import { CARD } from '../../lib/surfaces';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// The Operations Tracker. One list, four ways of reading it: what is open,
// what kind of work it is, whose it is, and what got finished. The tabs are
// views of the same rows, not places a task can be moved between.
//
// Tabs, toolbar and table share one CARD window. Everything that answers "what
// am I looking at" sits inside the same frame, and the page around it stays
// quiet.

const TABS = [
  { key: 'open',  label: 'To-do' },
  { key: 'kind',  label: 'By kind' },
  { key: 'owner', label: 'By owner' },
  { key: 'done',  label: 'Done' },
];

// Toolbar controls are ghosts: resting they are labels, and only get a surface
// under the pointer or while they are actually narrowing the list.
const ghost = (active) => 'font-ninja text-[13px] font-medium rounded-md px-2 py-1.5 border-0 '
  + 'transition-colors cursor-pointer '
  + (active ? 'bg-ninja-bg text-ninja-navy' : 'bg-transparent text-ninja-muted hover:bg-ninja-bg hover:text-ninja-navy');

export default function TasksPage() {
  const { user, isReadOnly } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [hiddenDone, setHiddenDone] = useState(0);
  const [windowDays, setWindowDays] = useState(14);
  const [showAllDone, setShowAllDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState('open');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [owner, setOwner] = useState('all'); // 'all' | 'mine' | 'none' | user id
  const [dialog, setDialog] = useState(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get(`/tasks${showAllDone ? '?done=all' : ''}`)
      .then((data) => {
        if (!alive) return;
        setTasks(data?.tasks || []);
        setHiddenDone(data?.hiddenDone ?? 0);
        setWindowDays(data?.windowDays ?? 14);
        setLoading(false);
      })
      .catch(() => { if (alive) { setTasks([]); setLoading(false); } });
    return () => { alive = false; };
  }, [user?.activeLocation?.id, showAllDone]);

  useEffect(() => {
    let alive = true;
    api.get('/tasks/assignees')
      .then((data) => { if (alive) setAssignees(data || []); })
      .catch(() => { if (alive) setAssignees([]); });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  const filterOn = search.trim() !== '' || category !== 'all' || owner !== 'all';

  const filtered = useMemo(() => {
    if (!filterOn) return tasks;
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (category !== 'all' && (t.category || 'other') !== category) return false;
      if (owner === 'mine' && t.assignee_id !== user?.id) return false;
      if (owner === 'none' && t.assignee_id) return false;
      if (owner !== 'all' && owner !== 'mine' && owner !== 'none'
        && String(t.assignee_id) !== owner) return false;
      if (q && !`${t.title || ''} ${t.body || ''}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [tasks, filterOn, search, category, owner, user?.id]);

  // Every tab reads the same filtered list; only the grouping changes. Open
  // groups sort by urgency (late, today, dated, the rest); Done reads newest
  // finish first.
  const groups = useMemo(() => {
    const open = filtered.filter((t) => t.status !== 'done');
    switch (tab) {
      case 'kind':
        return CATEGORIES
          .map((c) => ({
            key: c.key,
            label: c.label,
            tasks: sortByUrgency(open.filter((t) => (t.category || 'other') === c.key)),
            preset: { category: c.key },
          }))
          .filter((g) => g.tasks.length > 0);
      case 'owner':
        return [
          ...assignees
            .map((a) => ({
              key: `u${a.id}`,
              label: a.display_name,
              tasks: sortByUrgency(open.filter((t) => t.assignee_id === a.id)),
              preset: { assignee_id: a.id },
            }))
            .filter((g) => g.tasks.length > 0),
          {
            key: 'nobody',
            label: 'Unassigned',
            tasks: sortByUrgency(open.filter((t) => !t.assignee_id)),
            preset: {},
          },
        ];
      case 'done':
        return [{
          key: 'done',
          label: null,
          tasks: [...filtered.filter((t) => t.status === 'done')]
            .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || '')),
        }];
      default:
        return [
          { key: 'todo',  label: 'To do',       tasks: sortByUrgency(open.filter((t) => t.status === 'todo')),  preset: { status: 'todo' } },
          { key: 'doing', label: 'In progress', tasks: sortByUrgency(open.filter((t) => t.status === 'doing')), preset: { status: 'doing' } },
        ];
    }
  }, [tab, filtered, assignees]);

  const openCount = useMemo(() => tasks.filter((t) => t.status !== 'done').length, [tasks]);
  const doneCount = tasks.length - openCount;
  const shownCount = groups.reduce((n, g) => n + g.tasks.length, 0);

  const canManage = useCallback(
    (task) => !isReadOnly && (task.created_by === user?.id || user?.role === 'admin'),
    [isReadOnly, user?.id, user?.role],
  );

  const onSaved = useCallback((saved, isNew) => {
    setTasks((prev) => (isNew ? [saved, ...prev] : prev.map((t) => (t.id === saved.id ? { ...t, ...saved } : t))));
  }, []);

  const onDeleted = useCallback((id) => setTasks((prev) => prev.filter((t) => t.id !== id)), []);

  // Optimistic: the row moves the moment the box is ticked, and moves back if
  // the write fails. The server's answer replaces the guess either way.
  const onToggle = useCallback((task) => {
    const next = task.status === 'done' ? 'todo' : 'done';
    setTasks((prev) => prev.map((t) => (t.id === task.id
      ? { ...t, status: next, completed_at: next === 'done' ? (t.completed_at ?? new Date().toISOString()) : null }
      : t)));
    api.patch(`/tasks/${task.id}`, { status: next })
      .then((saved) => setTasks((prev) => prev.map((t) => (t.id === saved.id ? { ...t, ...saved } : t))))
      .catch(() => setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t))));
  }, []);

  const clearFilters = () => { setSearch(''); setCategory('all'); setOwner('all'); };

  // Tabs that drop their empty groups can come up with nothing to draw; say
  // why instead of showing a header over nothing.
  const empty = !loading && (
    groups.length === 0 || (shownCount === 0 && (filterOn || tab === 'done'))
  );

  return (
    <Layout>
      <div className="space-y-4">
        <header className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-ninja text-ninja-navy tracking-tight">Tasks</h1>
            <p className="font-ninja text-[13px] text-ninja-muted mt-0.5 text-pretty">
              The work this center is carrying. Every director here sees the same list.
            </p>
          </div>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => setDialog({ mode: 'new' })}
              className="flex-shrink-0 inline-flex items-center gap-1 font-ninja text-[13px] font-semibold px-3 py-1.5 rounded-lg bg-ninja-blue text-white hover:brightness-95 transition"
            >
              <PlusIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
              New task
            </button>
          )}
        </header>

        <div className={`${CARD} overflow-hidden`}>
          {/* Views, not places: buttons with a pressed state rather than ARIA
              tabs, which promise arrow-key panel wiring these don't have. */}
          <div className="flex items-center gap-5 px-4 pt-1.5 border-b border-ninja-border overflow-x-auto no-scrollbar" aria-label="Views of the tracker">
            {TABS.map((t) => {
              const active = tab === t.key;
              const count = t.key === 'open' ? openCount : t.key === 'done' ? doneCount : null;
              return (
                <button
                  key={t.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setTab(t.key)}
                  className={`flex-shrink-0 flex items-baseline gap-1.5 font-ninja text-[13px] font-medium pt-2 pb-2 border-b-2 -mb-px transition-colors ${
                    active
                      ? 'border-current text-ninja-navy'
                      : 'border-transparent text-ninja-muted hover:text-ninja-navy'
                  }`}
                >
                  {t.label}
                  {count !== null && <span className="font-ninja text-[11px] text-ninja-muted tabular-nums">{count}</span>}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 px-2.5 py-2 border-b border-ninja-border">
            <label className="relative flex-1 min-w-[160px] max-w-[240px]">
              <span className="sr-only">Search tasks</span>
              <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ninja-muted pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                className="w-full font-ninja text-[13px] rounded-md border-0 bg-ninja-bg pl-8 pr-2.5 py-1.5 text-ninja-navy placeholder:text-ninja-muted"
              />
            </label>

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by kind"
              className={ghost(category !== 'all')}
            >
              <option value="all">Any kind</option>
              {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>

            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              aria-label="Filter by owner"
              className={ghost(owner !== 'all')}
            >
              <option value="all">Anyone</option>
              <option value="mine">Mine</option>
              <option value="none">Unassigned</option>
              {assignees.filter((a) => a.id !== user?.id).map((a) => (
                <option key={a.id} value={String(a.id)}>{a.display_name}</option>
              ))}
            </select>

            {filterOn && (
              <button
                type="button"
                onClick={clearFilters}
                title="Clear filters"
                aria-label="Clear filters"
                className="w-6 h-6 rounded-md flex items-center justify-center text-ninja-muted hover:text-ninja-navy hover:bg-ninja-bg transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" strokeWidth={2.5} />
              </button>
            )}

            {filterOn && !loading && (
              <span className="ml-auto font-ninja text-[11px] text-ninja-muted tabular-nums pr-1.5">
                {shownCount} of {tasks.length}
              </span>
            )}
          </div>

          {loading ? (
            <div className="px-4 py-4 space-y-2.5" aria-busy="true" aria-label="Loading tasks">
              {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-7 w-full rounded-md" />)}
            </div>
          ) : tasks.length === 0 && !filterOn ? (
            <div className="px-4 py-14 text-center">
              <p className="font-ninja text-sm font-semibold text-ninja-navy">Nothing on the tracker yet</p>
              <p className="font-ninja text-xs text-ninja-muted mt-1 text-pretty max-w-md mx-auto">
                Cancellations, invoices, re-enrollments and print requests live here, and every
                director at this center sees the same list.
              </p>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setDialog({ mode: 'new' })}
                  className="font-ninja text-[13px] font-semibold text-ninja-blue hover:underline underline-offset-4 mt-3"
                >
                  Add the first task
                </button>
              )}
            </div>
          ) : empty ? (
            <div className="px-4 py-14 text-center">
              <p className="font-ninja text-[13px] text-ninja-muted">
                {filterOn ? 'Nothing matches these filters.'
                  : tab === 'done' ? 'Nothing finished yet.'
                    : 'Nothing open right now.'}
              </p>
              {filterOn && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="font-ninja text-[13px] font-semibold text-ninja-blue hover:underline underline-offset-4 mt-2"
                >
                  Clear the filters
                </button>
              )}
            </div>
          ) : (
            <>
              <TaskTable
                groups={groups}
                isReadOnly={isReadOnly}
                onOpen={(task) => setDialog({ mode: 'edit', task })}
                onToggle={onToggle}
                onAdd={(preset) => setDialog({ mode: 'new', preset })}
              />

              {/* Done never empties itself, so the list carries the recent past
                  and offers the rest rather than pretending it doesn't exist. */}
              {tab === 'done' && (hiddenDone > 0 || showAllDone) && (
                <button
                  type="button"
                  onClick={() => setShowAllDone((v) => !v)}
                  className="w-full text-left px-4 py-2.5 border-t border-ninja-border font-ninja text-[13px] font-medium text-ninja-muted hover:text-ninja-navy transition-colors"
                >
                  {showAllDone
                    ? `Show only the last ${windowDays} days`
                    : `Show ${hiddenDone} older finished task${hiddenDone === 1 ? '' : 's'}`}
                </button>
              )}
            </>
          )}
        </div>

        {dialog && (
          <TaskDialog
            key={dialog.mode === 'edit' ? dialog.task.id : 'new'}
            open
            mode={dialog.mode}
            task={dialog.task}
            preset={dialog.preset}
            assignees={assignees}
            canEditText={dialog.mode !== 'edit' || canManage(dialog.task)}
            canDelete={dialog.mode === 'edit' && canManage(dialog.task)}
            onClose={() => setDialog(null)}
            onSaved={onSaved}
            onDeleted={onDeleted}
          />
        )}
      </div>
    </Layout>
  );
}
