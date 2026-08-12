import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, LayoutGridIcon, ListIcon } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import TaskBoard from '../../components/manager/TaskBoard';
import TaskList from '../../components/manager/TaskList';
import TaskFilterBar from '../../components/manager/TaskFilterBar';
import TaskEditorModal from '../../components/manager/TaskEditorModal';
import Segmented from '../../components/ui/Segmented';
import { Skeleton, SkeletonList } from '../../components/ui/Skeleton';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { COLUMNS, cardFields, reorderPayload } from '../../lib/taskBoard';
import { EMPTY_FILTERS, filterTasks, isFiltered } from '../../lib/taskFilters';

const EASE = [0.23, 1, 0.32, 1];

const VIEWS = [
  { value: 'board', label: 'Board', icon: <LayoutGridIcon size={14} strokeWidth={2.25} /> },
  { value: 'list', label: 'List', icon: <ListIcon size={14} strokeWidth={2.25} /> },
];

export default function TasksPage() {
  const { user, isReadOnly } = useAuth();
  const canManage = !isReadOnly;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null); // { task } | { column } | null
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showArchived, setShowArchived] = useState(false);
  const [directors, setDirectors] = useState([]);

  // Which view, remembered per device. A director who works from the list works
  // from the list; asking them again every morning is the app forgetting.
  // Filters are deliberately NOT remembered — a filter is a momentary question,
  // and a board that silently reopens narrowed reads as work having vanished.
  const [view, setView] = useState(() => {
    try { return localStorage.getItem('dj-tasks-view') === 'list' ? 'list' : 'board'; }
    catch { return 'board'; }
  });
  const chooseView = (next) => {
    setView(next);
    try { localStorage.setItem('dj-tasks-view', next); } catch { /* private mode */ }
  };

  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    api.get(`/director-tasks${showArchived ? '?archived=true' : ''}`)
      .then((rows) => { if (alive) { setTasks(rows); setError(''); } })
      .catch((err) => { if (alive) setError(err.message || 'Could not load tasks.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [showArchived]);

  useEffect(load, [load, user?.activeLocation?.id]);

  // Who the assignee filter can offer, fetched once here rather than by every
  // component that needs the list.
  useEffect(() => {
    let alive = true;
    api.get('/director-tasks/assignees')
      .catch(() => [])
      .then((rows) => { if (alive) setDirectors(rows || []); });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  const visible = useMemo(
    () => filterTasks(tasks, filters, { userId: user?.id }),
    [tasks, filters, user?.id]
  );
  // Memoised: a bare Set in the render body would be a new identity every
  // render and re-render every card on the board with it.
  const visibleIds = useMemo(() => new Set(visible.map((t) => t.id)), [visible]);
  const filtered = isFiltered(filters);

  // Reordering is optimistic: the card is already under the pointer where the
  // director dropped it, and snapping it back while a round trip finishes would
  // read as the drag having failed. A rejected write puts the old board back
  // and says so, rather than leaving the screen disagreeing with the database.
  const reorder = useCallback(async (next) => {
    const previous = tasks;
    setTasks(next);
    setError('');
    try {
      await api.patch('/director-tasks/reorder', { items: reorderPayload(next) });
    } catch (err) {
      setTasks(previous);
      setError(err.message || 'Could not save the new order.');
    }
  }, [tasks]);

  const save = useCallback(async (fields) => {
    const editing = editor?.task;
    if (editing) {
      const saved = await api.patch(`/director-tasks/${editing.id}`, fields);
      setTasks((ts) => ts.map((t) => (t.id === saved.id ? { ...t, ...saved } : t)));
    } else {
      const created = await api.post('/director-tasks', fields);
      setTasks((ts) => [...ts, created]);
    }
    setError('');
  }, [editor]);

  // Quick adds are chained rather than fired in parallel: position comes from
  // the server's MAX + 1, so three fast returns resolving out of order would
  // give the column an order nobody typed.
  const quickAddQueue = useRef(Promise.resolve());
  const quickAdd = useCallback((column_key, title) => {
    quickAddQueue.current = quickAddQueue.current
      .then(() => api.post('/director-tasks', {
        title,
        column_key,
        // The same default the dialog uses. A card typed into a column belongs
        // to the center until somebody there takes it.
        assignee_center: true,
      }))
      .then((created) => { setTasks((ts) => [...ts, created]); setError(''); })
      .catch((err) => setError(err.message || 'Could not add the task.'));
  }, []);

  const archive = useCallback(async (task) => {
    const previous = tasks;
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    try {
      await api.post(`/director-tasks/${task.id}/archive`);
    } catch (err) {
      setTasks(previous);
      setError(err.message || 'Could not archive the task.');
    }
  }, [tasks]);

  const restore = useCallback(async (task) => {
    const previous = tasks;
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    try {
      await api.post(`/director-tasks/${task.id}/restore`);
    } catch (err) {
      setTasks(previous);
      setError(err.message || 'Could not put the task back.');
    }
  }, [tasks]);

  const clearDone = useCallback(async () => {
    const previous = tasks;
    setTasks((ts) => ts.filter((t) => t.column_key !== 'done'));
    try {
      await api.post('/director-tasks/archive-done');
    } catch (err) {
      setTasks(previous);
      setError(err.message || 'Could not clear the finished tasks.');
    }
  }, [tasks]);

  // One cell of one card, changed from the list. PATCH is a whole-card write,
  // so the rest of the card goes back with it — cardFields is that "rest", in
  // one place, so a field added later cannot be quietly wiped by an edit that
  // never meant to touch it.
  const patchTask = useCallback(async (task, fields) => {
    const previous = tasks;
    setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, ...fields } : t)));
    try {
      const saved = await api.patch(`/director-tasks/${task.id}`, { ...cardFields(task), ...fields });
      setTasks((ts) => ts.map((t) => (t.id === saved.id ? { ...t, ...saved } : t)));
      setError('');
    } catch (err) {
      setTasks(previous);
      setError(err.message || 'Could not save that change.');
    }
  }, [tasks]);

  const remove = useCallback(async (task) => {
    const previous = tasks;
    setTasks((ts) => ts.filter((t) => t.id !== task.id));
    try {
      await api.delete(`/director-tasks/${task.id}`);
    } catch (err) {
      setTasks(previous);
      setError(err.message || 'Could not delete the task.');
    }
  }, [tasks]);

  return (
    <Layout>
      <div className="space-y-6">
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
        >
          <Link
            to="/manager/overview"
            className="inline-flex items-center gap-1.5 font-ninja text-sm font-bold text-ninja-muted hover:text-ninja-navy transition-colors rounded"
          >
            <ArrowLeftIcon size={15} strokeWidth={2.25} />
            Dashboard
          </Link>

          {/* No New task button up here. Every column carries its own + and a
              quick-add row at its foot, and those land the card where it
              belongs; a button in the header has to guess a column. */}
          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black font-ninja text-ninja-navy tracking-tight">Tasks</h1>
              <p className="mt-1 font-ninja text-sm text-ninja-muted text-pretty">
                {canManage
                  ? 'Assign tasks to this location'
                  : "You're viewing another center, so this board is read-only."}
              </p>
            </div>
            <Segmented
              options={VIEWS}
              value={view}
              onChange={chooseView}
              label="How to show the tasks"
              layoutId="tasksViewPill"
              size="sm"
            />
          </div>
        </motion.header>

        <TaskFilterBar
          filters={filters}
          onChange={setFilters}
          directors={directors}
          showArchived={showArchived}
          onShowArchived={setShowArchived}
          boardView={view === 'board'}
          centerName={user?.activeLocation?.name}
          meId={user?.id}
        />

        {error && (
          <p role="status" className="font-ninja text-sm text-ninja-red">{error}</p>
        )}

        {loading ? (
          view === 'list' ? (
            <SkeletonList rows={8} label="Loading tasks" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-5 items-start" aria-busy="true" aria-label="Loading tasks">
              {COLUMNS.map((col, i) => (
                <div key={col.key} className="rounded-2xl bg-ninja-bg p-3 space-y-2.5">
                  <Skeleton className="h-4 w-24 mb-1" />
                  {Array.from({ length: i === 0 ? 3 : 2 }, (_, j) => (
                    <Skeleton key={j} className="h-20 w-full rounded-2xl" />
                  ))}
                </div>
              ))}
            </div>
          )
        ) : view === 'list' ? (
          <TaskList
            tasks={visible}
            canManage={canManage}
            directors={directors}
            centerName={user?.activeLocation?.name}
            onEdit={(task) => setEditor({ task })}
            onDelete={remove}
            onArchive={archive}
            onRestore={restore}
            onPatch={patchTask}
          />
        ) : (
          <TaskBoard
            tasks={tasks}
            visibleIds={visibleIds}
            filtered={filtered || showArchived}
            canManage={canManage}
            onAdd={(column) => setEditor({ column })}
            onEdit={(task) => setEditor({ task })}
            onDelete={remove}
            onRestore={restore}
            onReorder={reorder}
            onQuickAdd={quickAdd}
            onClearDone={clearDone}
          />
        )}
      </div>

      <TaskEditorModal
        isOpen={!!editor}
        task={editor?.task ?? null}
        directors={directors}
        column={editor?.column ?? 'todo'}
        onClose={() => setEditor(null)}
        onSave={save}
        onDelete={canManage ? remove : undefined}
        onArchive={canManage ? archive : undefined}
      />
    </Layout>
  );
}
