import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import TaskCardFace from './TaskCardFace';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { CARD, PANEL } from '../../lib/surfaces';
import { Skeleton } from '../ui/Skeleton';
import { COLUMNS, PREVIEW_PER_COLUMN, groupByColumn, previewOrder } from '../../lib/taskBoard';

const EASE = [0.23, 1, 0.32, 1];

// The board, cut short.
//
// Not a summary of the board and not a small kanban you could work in: the
// point of a preview is that you recognise what you are about to open, so it is
// the real three columns drawing real cards through the same component the
// board uses. What it deliberately does NOT have is controls. No add button, no
// menus, no dragging — a second place to add work is the mistake the sticky
// wall already taught, and one board that can be edited in two places is a
// board with two sets of rules.
export default function TasksPreview() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.get('/director-tasks')
      .catch(() => [])
      .then((rows) => {
        if (!alive) return;
        setTasks(rows || []);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  const grouped = tasks ? groupByColumn(tasks) : null;
  const isEmpty = tasks && tasks.length === 0;

  return (
    <motion.section
      className={`${CARD} p-5`}
      aria-labelledby="tasks-heading"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}
    >
      <div className="flex items-baseline justify-between mb-4">
        <h2 id="tasks-heading" className="font-ninja font-bold text-ninja-navy text-lg">Tasks</h2>
        <Link
          to="/manager/tasks"
          className="font-ninja text-xs text-ninja-muted hover:text-ninja-blue transition-colors rounded"
        >
          open board →
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading tasks">
          {COLUMNS.map((c) => (
            <div key={c.key} className="rounded-2xl bg-ninja-bg p-3 space-y-2.5">
              <Skeleton className="h-3.5 w-20 mb-1" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : isEmpty ? (
        <div>
          <p className="font-ninja text-sm text-ninja-muted text-pretty max-w-prose">
            Nothing on the board yet. Track the jobs that outlive a single shift —
            supply orders, parent follow-ups, the things that get forgotten between
            directors.
          </p>
          {/* The only call to action on this surface, and it goes to the board
              rather than opening a form here. */}
          <Link
            to="/manager/tasks"
            className="inline-block mt-3 font-ninja text-sm font-bold text-ninja-blue hover:underline underline-offset-4 rounded"
          >
            Add the first one
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {COLUMNS.map((col) => {
            const items = grouped[col.key] || [];
            const shown = previewOrder(items).slice(0, PREVIEW_PER_COLUMN);
            const hidden = items.length - shown.length;

            return (
              <div key={col.key} className="rounded-2xl bg-ninja-bg p-3">
                <div className="flex items-center justify-between px-1 pb-2.5">
                  <h3 className="font-ninja text-sm font-bold text-ninja-navy">
                    {col.label}
                    <span className="ml-2 font-normal text-ninja-muted tabular-nums">
                      {items.length}
                    </span>
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {shown.map((task) => (
                    // No title override and no actions: read-only by
                    // construction rather than by remembering to leave the
                    // controls off.
                    <div key={task.id} className={`${PANEL} p-3`}>
                      <TaskCardFace task={task} />
                    </div>
                  ))}

                  {shown.length === 0 && (
                    <p className="font-ninja text-xs text-ninja-muted px-1 py-2">
                      {col.key === 'done' ? 'Nothing finished yet.' : 'Nothing here.'}
                    </p>
                  )}

                  {hidden > 0 && (
                    <p className="font-ninja text-xs text-ninja-muted px-1 pt-0.5 tabular-nums">
                      +{hidden} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.section>
  );
}
