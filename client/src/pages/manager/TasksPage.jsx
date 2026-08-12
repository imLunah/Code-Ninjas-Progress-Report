import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, LayoutGridIcon, ListIcon } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import TaskBoard from '../../components/manager/TaskBoard';
import TaskList from '../../components/manager/TaskList';
import TaskEditorModal from '../../components/manager/TaskEditorModal';
import Segmented from '../../components/ui/Segmented';
import { Skeleton, SkeletonList } from '../../components/ui/Skeleton';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { COLUMNS, cardFields, reorderPayload } from '../../lib/taskBoard';

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
  const [showArchived, setShowArchived] = useState(false);
  const [directors, setDirectors] = useState([]);
  // The card on its way out. A delete asked for from the dialog or the list's
  // menu has nothing moving on screen to connect the press to the row closing
  // up, so the card is left where it is for a beat and shrinks out of it. The
  // gestures skip this: they have already carried the card off themselves.
  const [leavingId, setLeavingId] = useState(null);
  const leaveTimer = useRef(null);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);
  const LEAVE_MS = 200;
  const dropAfterExit = useCallback((id) => {
    setLeavingId(id);
    clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => {
      setLeavingId(null);
      setTasks((ts) => ts.filter((t) => t.id !== id));
    }, LEAVE_MS);
  }, []);

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

  // Deleting a card puts it in Recently deleted, where it sits for a fortnight
  // and is then gone for good. Every route off the board goes through here —
  // the swipe, the drop on the nav, the dialog, the list's menu — so there is
  // one meaning of delete and it is the recoverable one. `purge` below is the
  // other one, and it is only reachable from inside Recently deleted.
  const softDelete = useCallback(async (task) => {
    const previous = tasks;
    dropAfterExit(task.id);
    try {
      await api.post(`/director-tasks/${task.id}/archive`);
    } catch (err) {
      setLeavingId(null);
      setTasks(previous);
      setError(err.message || 'Could not delete the task.');
    }
  }, [tasks, dropAfterExit]);

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

  // The one that does not come back, and the only one the fortnight's wait is
  // there to make unnecessary.
  const purge = useCallback(async (task) => {
    const previous = tasks;
    dropAfterExit(task.id);
    try {
      await api.delete(`/director-tasks/${task.id}`);
    } catch (err) {
      setLeavingId(null);
      setTasks(previous);
      setError(err.message || 'Could not delete the task for good.');
    }
  }, [tasks, dropAfterExit]);

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
            <div className="flex items-center gap-2">
              {/* Not a filter — a different fetch, and the only thing left from
                  the row of controls that used to sit under this header. It
                  lives beside the view switch because both are questions about
                  what the page is showing rather than about any one card. */}
              <button
                type="button"
                aria-pressed={showArchived}
                onClick={() => setShowArchived((v) => !v)}
                className={`px-3 py-1.5 rounded-full font-ninja text-xs font-semibold border transition-colors duration-150 ease-[var(--ease-out)] active:scale-95 ${
                  showArchived
                    ? 'bg-ninja-navy text-white border-ninja-navy dark:bg-white dark:text-ninja-bg'
                    : 'bg-transparent text-ninja-muted border-transparent hover:text-ninja-navy hover:border-ninja-border'
                }`}
              >
                Recently deleted
              </button>
              <Segmented
                options={VIEWS}
                value={view}
                onChange={chooseView}
                label="How to show the tasks"
                layoutId="tasksViewPill"
                size="sm"
              />
            </div>
          </div>

          {/* The rule, where the cards it applies to are. A bin that empties
              itself has to say so before it does, not after. */}
          {showArchived && (
            <p className="mt-3 font-ninja text-xs text-ninja-muted">
              Deleted tasks are kept here for 14 days, then removed for good.
            </p>
          )}
        </motion.header>

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
            tasks={tasks}
            canManage={canManage}
            directors={directors}
            centerName={user?.activeLocation?.name}
            onEdit={(task) => setEditor({ task })}
            onDelete={softDelete}
            onPurge={purge}
            onRestore={restore}
            onPatch={patchTask}
          />
        ) : (
          <TaskBoard
            tasks={tasks}
            filtered={showArchived}
            leavingId={leavingId}
            canManage={canManage}
            onAdd={(column) => setEditor({ column })}
            onEdit={(task) => setEditor({ task })}
            onDelete={softDelete}
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
        onDelete={canManage ? softDelete : undefined}
        onPurge={canManage ? purge : undefined}
        onRestore={canManage ? restore : undefined}
      />
    </Layout>
  );
}
