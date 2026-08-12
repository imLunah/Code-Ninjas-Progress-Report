import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PlusIcon, ArrowLeftIcon } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import TaskBoard from '../../components/manager/TaskBoard';
import TaskEditorModal from '../../components/manager/TaskEditorModal';
import { Skeleton } from '../../components/ui/Skeleton';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { reorderPayload } from '../../lib/taskBoard';

const EASE = [0.23, 1, 0.32, 1];

export default function TasksPage() {
  const { user, isReadOnly } = useAuth();
  const canManage = !isReadOnly;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState(null); // { task } | { column } | null

  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    api.get('/director-tasks')
      .then((rows) => { if (alive) { setTasks(rows); setError(''); } })
      .catch((err) => { if (alive) setError(err.message || 'Could not load tasks.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(load, [load, user?.activeLocation?.id]);

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

          <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-black font-ninja text-ninja-navy tracking-tight">Tasks</h1>
              <p className="mt-1 font-ninja text-sm text-ninja-muted text-pretty">
                {canManage
                  ? 'Assign tasks to this location'
                  : "You're viewing another center, so this board is read-only."}
              </p>
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => setEditor({ column: 'todo' })}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-ninja-blue hover:bg-ninja-blue-hover text-white font-ninja text-sm font-bold transition duration-150 ease-[var(--ease-out)] active:scale-[0.97]"
              >
                <PlusIcon size={16} strokeWidth={2.5} />
                New task
              </button>
            )}
          </div>
        </motion.header>

        {error && (
          <p role="status" className="font-ninja text-sm text-ninja-red">{error}</p>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-start" aria-busy="true" aria-label="Loading tasks">
            {[3, 2, 2].map((n, i) => (
              <div key={i} className="rounded-2xl bg-ninja-bg p-3 space-y-2.5">
                <Skeleton className="h-4 w-24 mb-1" />
                {Array.from({ length: n }, (_, j) => (
                  <Skeleton key={j} className="h-20 w-full rounded-2xl" />
                ))}
              </div>
            ))}
          </div>
        ) : (
          <TaskBoard
            tasks={tasks}
            canManage={canManage}
            onAdd={(column) => setEditor({ column })}
            onEdit={(task) => setEditor({ task })}
            onDelete={remove}
            onReorder={reorder}
          />
        )}
      </div>

      <TaskEditorModal
        isOpen={!!editor}
        task={editor?.task ?? null}
        column={editor?.column ?? 'todo'}
        onClose={() => setEditor(null)}
        onSave={save}
      />
    </Layout>
  );
}
