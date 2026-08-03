import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CalendarDaysIcon, UserIcon } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { CARD } from '../../lib/surfaces';
import { Skeleton } from '../../components/ui/Skeleton';
import { today } from '../../utils/dateUtils';
import { dayLabel, firstName } from './board/boardShared';

// The dashboard's slice of the task board.
//
// Deliberately not a small kanban. Three columns squeezed to 200px is something
// you can neither read nor use, and it would be a second place to add work,
// which is the mistake the sticky wall already taught. This reads and does not
// write: counts, the few cards that want attention today, and a way in.

const ROWS = 4;

// What surfaces first. Late outranks everything, then today, then dated work in
// date order, then yours, then whatever is left. A card with no date that is
// nobody's problem is exactly what should NOT be on the dashboard.
function rank(task, userId) {
  const now = today();
  if (task.status === 'done') return 90;
  if (task.due_date && task.due_date < now) return 0;
  if (task.due_date === now) return 1;
  if (task.due_date) return 2;
  if (task.assignee_id === userId) return 3;
  return 4;
}

function TaskRow({ task, userId }) {
  const now = today();
  const late = task.due_date && task.due_date < now;
  const dueToday = task.due_date === now;

  return (
    <li className="flex items-center gap-2.5 py-1.5">
      {/* One dot carries the urgency, so the row stays a row rather than a
          strip of competing pills. */}
      <span
        aria-hidden="true"
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
          late ? 'bg-ninja-red' : dueToday ? 'bg-yellow-500' : 'bg-ninja-border'
        }`}
      />
      <span className="font-ninja text-sm text-ninja-navy truncate flex-1 min-w-0">
        {task.title || task.body}
      </span>
      {task.due_date && (
        <span className={`font-ninja text-[11px] font-bold flex-shrink-0 inline-flex items-center gap-1 ${
          late ? 'text-ninja-red' : 'text-ninja-muted'
        }`}
        >
          <CalendarDaysIcon className="w-3 h-3" strokeWidth={2.25} />
          {late ? `Late ${dayLabel(task.due_date)}` : dueToday ? 'Today' : dayLabel(task.due_date)}
        </span>
      )}
      {task.assignee_id && (
        <span className="font-ninja text-[11px] text-ninja-muted flex-shrink-0 inline-flex items-center gap-1">
          <UserIcon className="w-3 h-3" strokeWidth={2.25} />
          {task.assignee_id === userId ? 'You' : firstName(task.assignee_name)}
        </span>
      )}
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

  const { counts, rows, late } = useMemo(() => {
    const now = today();
    const open = tasks.filter((t) => t.status !== 'done');
    return {
      counts: {
        todo: tasks.filter((t) => t.status === 'todo').length,
        doing: tasks.filter((t) => t.status === 'doing').length,
      },
      late: open.filter((t) => t.due_date && t.due_date < now).length,
      rows: [...open]
        .sort((a, b) => rank(a, user?.id) - rank(b, user?.id)
          || (a.due_date || '9999').localeCompare(b.due_date || '9999'))
        .slice(0, ROWS),
    };
  }, [tasks, user?.id]);

  return (
    <section className={`${CARD} p-5`} aria-labelledby="tasks-preview-heading">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="tasks-preview-heading" className="font-ninja font-bold text-ninja-navy text-lg">Tasks</h2>
        <Link
          to="/manager/tasks"
          className="font-ninja text-xs font-semibold text-ninja-muted hover:text-ninja-blue transition-colors"
        >
          open board →
        </Link>
      </div>

      {loading ? (
        <div className="mt-3 space-y-2" aria-busy="true" aria-label="Loading tasks">
          <Skeleton className="h-3.5 w-40" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
        </div>
      ) : tasks.length === 0 ? (
        <p className="font-ninja text-sm text-ninja-muted mt-2 text-pretty">
          Nothing on the board. Cancellations, re-enrollments and print requests live here, and
          every director at this center sees the same one.{' '}
          <Link to="/manager/tasks" className="font-semibold text-ninja-blue hover:underline underline-offset-2">
            Add the first task
          </Link>.
        </p>
      ) : (
        <>
          <p className="font-ninja text-sm text-ninja-muted mt-1.5">
            <span className="font-bold text-ninja-navy tabular-nums">{counts.todo}</span> to do
            {' · '}
            <span className="font-bold text-ninja-navy tabular-nums">{counts.doing}</span> in progress
            {late > 0 && (
              <>
                {' · '}
                <span className="font-bold text-ninja-red tabular-nums">{late}</span> late
              </>
            )}
          </p>

          <motion.ul
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mt-2 divide-y divide-ninja-border"
          >
            {rows.map((t) => <TaskRow key={t.id} task={t} userId={user?.id} />)}
          </motion.ul>

          {counts.todo + counts.doing > rows.length && (
            <Link
              to="/manager/tasks"
              className="inline-block font-ninja text-xs font-semibold text-ninja-muted hover:text-ninja-blue mt-2.5 transition-colors"
            >
              {counts.todo + counts.doing - rows.length} more
            </Link>
          )}
        </>
      )}
    </section>
  );
}
