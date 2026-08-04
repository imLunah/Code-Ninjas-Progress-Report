import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Skeleton } from '../ui/Skeleton';
import { KindTag, OwnerBadge, DueDate, sortByUrgency, urgency } from './board/boardShared';

// The dashboard's slice of the Operations Tracker: the few open rows that
// matter most right now, drawn the same way the tracker draws them, so what
// you open is what you were just looking at.
//
// It reads and never writes. A second place to ADD work is the mistake the
// sticky wall already taught.

const PER_PREVIEW = 5;

function PreviewRow({ task }) {
  return (
    <li className="flex items-center gap-2.5 py-2 border-b border-ninja-border last:border-b-0">
      <p className="font-ninja text-sm font-semibold text-ninja-navy truncate flex-1 min-w-0">
        {task.title || task.body}
      </p>
      <span className="hidden sm:block"><KindTag category={task.category} /></span>
      <DueDate due={task.due_date} status={task.status} />
      <OwnerBadge id={task.assignee_id} name={task.assignee_name} />
    </li>
  );
}

export default function TasksPreview() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get('/tasks')
      .then((data) => { if (alive) { setTasks(data?.tasks || []); setLoading(false); } })
      .catch(() => { if (alive) { setTasks([]); setLoading(false); } });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  const open = useMemo(
    () => sortByUrgency(tasks.filter((t) => t.status !== 'done')),
    [tasks],
  );
  const late = useMemo(() => open.filter((t) => urgency(t) === 0).length, [open]);
  const top = open.slice(0, PER_PREVIEW);
  const rest = open.length - top.length;

  return (
    <section aria-labelledby="tasks-preview-heading">
      <div className="flex items-end justify-between gap-4 mb-1">
        <div>
          <h2 id="tasks-preview-heading" className="font-ninja font-bold text-ninja-navy text-lg">Tasks</h2>
          <p className="font-ninja text-xs text-ninja-muted mt-0.5 text-pretty">
            {late > 0
              ? <><span className="font-bold text-ninja-red">{late} late</span>. The work this center is carrying.</>
              : 'The work this center is carrying. Every director here sees the same list.'}
          </p>
        </div>
        <Link
          to="/manager/tasks"
          className="flex-shrink-0 font-ninja text-sm font-bold text-ninja-muted hover:text-ninja-blue transition-colors"
        >
          Open the tracker →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-2 pt-2" aria-busy="true" aria-label="Loading tasks">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
        </div>
      ) : open.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ninja-border px-4 py-8 text-center mt-2">
          <p className="font-ninja text-sm font-bold text-ninja-navy">Nothing open right now</p>
          <p className="font-ninja text-xs text-ninja-muted mt-1 text-pretty max-w-md mx-auto">
            Cancellations, invoices, re-enrollments and print requests live here, and every
            director at this center sees the same list.
          </p>
          <Link
            to="/manager/tasks"
            className="inline-block font-ninja text-sm font-bold text-ninja-blue hover:underline underline-offset-4 mt-3"
          >
            Add the first task
          </Link>
        </div>
      ) : (
        <>
          <ul className="border-t border-ninja-border mt-2">
            {top.map((task) => <PreviewRow key={task.id} task={task} />)}
          </ul>
          {rest > 0 && (
            <p className="font-ninja text-xs text-ninja-muted pt-2">{rest} more open</p>
          )}
        </>
      )}
    </section>
  );
}
