import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { SearchIcon, XIcon } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import TaskBoard, { CATEGORIES } from '../../components/manager/board/TaskBoard';
import { Skeleton } from '../../components/ui/Skeleton';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

// The board's own page. It lived on the dashboard until it got big enough to
// be the dashboard: a column is as tall as the cards in it, so thirty tasks in
// To do is three thousand pixels of a page whose job is a glance. The
// dashboard keeps a preview; everything you can DO to the board happens here.

// Built from the board's own list, so a new kind of work shows up as a filter
// without anyone remembering to add it in two places.
const CATEGORY_FILTERS = [{ key: 'all', label: 'Everything' }, ...CATEGORIES];

const Chip = ({ active, children, ...rest }) => (
  <button
    type="button"
    aria-pressed={active}
    className={`font-ninja text-sm font-semibold px-3 py-1.5 rounded-full transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-95 ${
      active ? 'bg-ninja-blue text-white' : 'bg-ninja-bg text-ninja-muted hover:text-ninja-navy'
    }`}
    {...rest}
  >
    {children}
  </button>
);

export default function TasksPage() {
  const { user, isReadOnly } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [hiddenDone, setHiddenDone] = useState(0);
  const [windowDays, setWindowDays] = useState(14);
  const [showAllDone, setShowAllDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [owner, setOwner] = useState('all'); // 'all' | 'mine' | 'none' | user id

  // Measured on a wrapper that outlives the board rather than inside it. A
  // board that measures itself on mount paints one frame of its narrow fallback
  // layout before the real width lands, and the snap is visible.
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  // A set of ids rather than a filtered list: the board still needs every card
  // to write an arrangement, and only needs to know which ones to draw.
  const visibleIds = useMemo(() => {
    if (!filterOn) return null;
    const q = search.trim().toLowerCase();
    return new Set(
      tasks.filter((t) => {
        if (category !== 'all' && (t.category || 'other') !== category) return false;
        if (owner === 'mine' && t.assignee_id !== user?.id) return false;
        if (owner === 'none' && t.assignee_id) return false;
        if (owner !== 'all' && owner !== 'mine' && owner !== 'none'
          && String(t.assignee_id) !== owner) return false;
        if (q && !`${t.title || ''} ${t.body || ''}`.toLowerCase().includes(q)) return false;
        return true;
      }).map((t) => t.id),
    );
  }, [tasks, filterOn, search, category, owner, user?.id]);

  const canManage = useCallback(
    (task) => !isReadOnly && (task.created_by === user?.id || user?.role === 'admin'),
    [isReadOnly, user?.id, user?.role],
  );

  const onSaved = useCallback((saved, isNew) => {
    setTasks((prev) => (isNew ? [saved, ...prev] : prev.map((t) => (t.id === saved.id ? { ...t, ...saved } : t))));
  }, []);

  const onDeleted = useCallback((id) => setTasks((prev) => prev.filter((t) => t.id !== id)), []);
  const onArrange = useCallback((updater) => setTasks((prev) => updater(prev)), []);

  const clearFilters = () => { setSearch(''); setCategory('all'); setOwner('all'); };
  const shownCount = visibleIds ? visibleIds.size : tasks.length;

  return (
    <Layout>
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl sm:text-3xl font-black font-ninja text-ninja-navy tracking-tight">Tasks</h1>
          <p className="font-ninja text-sm text-ninja-muted mt-1 text-pretty">
            The work this center is carrying. Move a card along as it gets picked up and finished.
            Every director here sees the same board.
          </p>
        </header>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative flex-1 min-w-[200px] max-w-sm">
              <span className="sr-only">Search tasks</span>
              <SearchIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ninja-muted pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search tasks"
                className="w-full font-ninja text-sm rounded-full border border-ninja-border bg-white pl-9 pr-3 py-1.5 text-ninja-navy placeholder:text-ninja-muted"
              />
            </label>

            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              aria-label="Filter by owner"
              className="font-ninja text-sm rounded-full border border-ninja-border bg-white px-3 py-1.5 text-ninja-navy"
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
                className="inline-flex items-center gap-1 font-ninja text-sm font-semibold text-ninja-muted hover:text-ninja-navy transition-colors"
              >
                <XIcon className="w-4 h-4" strokeWidth={2.5} />
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {CATEGORY_FILTERS.map((c) => (
              <Chip key={c.key} active={category === c.key} onClick={() => setCategory(c.key)}>
                {c.label}
              </Chip>
            ))}
          </div>

          {/* Says what is being hidden and by what, rather than leaving a board
              that quietly isn't all of it. */}
          {filterOn && (
            <p className="font-ninja text-xs text-ninja-muted">
              Showing {shownCount} of {tasks.length}. Cards can still be moved along, but the board
              can't be rearranged while it is filtered.
            </p>
          )}
        </div>

        <div ref={wrapRef}>
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading tasks">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}
            </div>
          ) : (
            <TaskBoard
              tasks={tasks}
              assignees={assignees}
              visibleIds={visibleIds}
              width={width}
              isReadOnly={isReadOnly}
              canManage={canManage}
              onSaved={onSaved}
              onDeleted={onDeleted}
              onArrange={onArrange}
            />
          )}
        </div>

        {/* Done never empties itself, so the board carries the recent past and
            offers the rest rather than pretending it doesn't exist. */}
        {!loading && (hiddenDone > 0 || showAllDone) && (
          <button
            type="button"
            onClick={() => setShowAllDone((v) => !v)}
            className="font-ninja text-sm font-semibold text-ninja-muted hover:text-ninja-navy transition-colors"
          >
            {showAllDone
              ? `Show only the last ${windowDays} days of Done`
              : `Show ${hiddenDone} older finished task${hiddenDone === 1 ? '' : 's'}`}
          </button>
        )}
      </div>
    </Layout>
  );
}
