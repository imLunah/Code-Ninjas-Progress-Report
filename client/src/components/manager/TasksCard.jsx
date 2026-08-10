import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { CARD } from '../../lib/surfaces';
import { Skeleton } from '../ui/Skeleton';
import { COLOR_HEX, DUE_TONE, dueMeta, summarizeBoard } from '../../lib/taskBoard';

// The board's presence on the dashboard. It reports rather than edits: the
// counts, what's next, and a way through to the board itself. Putting the
// columns here in miniature would mean two places to fix every time the board
// changes, and neither would have the room to be draggable.
export default function TasksCard() {
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

  const summary = tasks ? summarizeBoard(tasks) : null;

  return (
    <section className={`${CARD} p-5`} aria-labelledby="tasks-heading">
      <div className="flex items-baseline justify-between mb-3">
        <h2 id="tasks-heading" className="font-ninja font-bold text-ninja-navy text-lg">Tasks</h2>
        <Link
          to="/manager/tasks"
          className="font-ninja text-xs text-ninja-muted hover:text-ninja-blue transition-colors rounded"
        >
          open board →
        </Link>
      </div>

      {loading ? (
        <div aria-busy="true" aria-label="Loading tasks" className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <div className="space-y-2 pt-1">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-9 w-full rounded-lg" />)}
          </div>
        </div>
      ) : summary.todo + summary.doing + summary.done === 0 ? (
        <div>
          <p className="font-ninja text-sm text-ninja-muted text-pretty">
            Nothing on the board yet. Track the jobs that outlive a single shift —
            supply orders, parent follow-ups, the things that get forgotten between
            directors.
          </p>
          <Link
            to="/manager/tasks"
            className="inline-block mt-3 font-ninja text-sm font-bold text-ninja-blue hover:underline underline-offset-4 rounded"
          >
            Add the first one
          </Link>
        </div>
      ) : (
        <>
          <p className="font-ninja text-sm text-ninja-navy">
            <span className="font-black tabular-nums">{summary.todo}</span> to do
            <span className="text-ninja-muted"> · </span>
            <span className="font-black tabular-nums">{summary.doing}</span> in progress
          </p>
          {summary.overdue > 0 && (
            <p className="mt-1 font-ninja text-sm text-ninja-red font-semibold tabular-nums">
              {summary.overdue} overdue
            </p>
          )}

          {summary.upNext.length > 0 && (
            <ul className="mt-4 pt-4 border-t border-ninja-border space-y-2.5">
              {summary.upNext.map((t) => {
                const due = dueMeta(t.due_date);
                const dot = COLOR_HEX[t.color];
                return (
                  <li key={t.id} className="flex items-start gap-2">
                    {dot ? (
                      <span
                        aria-hidden="true"
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[7px]"
                        style={{ backgroundColor: dot }}
                      />
                    ) : (
                      <span aria-hidden="true" className="w-1.5 flex-shrink-0" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-ninja text-sm text-ninja-navy leading-snug truncate">
                        {t.title}
                      </span>
                      {due && (
                        <span className={`block font-ninja text-xs ${DUE_TONE[due.tone]}`}>
                          {due.text}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* The whole board is behind the header link; this only appears when
              there is more than the three shown, so it says something the
              header link doesn't. */}
          {summary.todo + summary.doing > summary.upNext.length && (
            <Link
              to="/manager/tasks"
              className="inline-block mt-3 font-ninja text-xs text-ninja-muted hover:text-ninja-blue transition-colors rounded"
            >
              {summary.todo + summary.doing - summary.upNext.length} more open
            </Link>
          )}
        </>
      )}
    </section>
  );
}
