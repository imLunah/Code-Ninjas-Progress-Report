import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PANEL } from '../../lib/surfaces';
import { Skeleton } from '../ui/Skeleton';
import { today } from '../../utils/dateUtils';
import { TaskFace } from './board/TaskBoard';
import { LANES, COLUMN_SURFACE, splitLanes } from './board/boardShared';

// The dashboard's slice of the task board.
//
// It is the real board, drawn by the same card component, just cut short: two
// cards a column and no controls on any of them. A list of plain text rows read
// as a different feature that happened to share a name, and the point of a
// preview is that you recognise what you are about to open.
//
// It reads and never writes. A second place to ADD work is the mistake the
// sticky wall already taught.

const PER_COLUMN = 2;

// What surfaces first inside a column. Late outranks everything, then today,
// then dated work in date order, then the rest as arranged.
function urgency(task) {
  const now = today();
  if (task.status === 'done') return 9;
  if (task.due_date && task.due_date < now) return 0;
  if (task.due_date === now) return 1;
  if (task.due_date) return 2;
  return 3;
}

function Column({ lane, tasks, index }) {
  const top = useMemo(
    () => [...tasks]
      .sort((a, b) => urgency(a) - urgency(b)
        || (a.due_date || '9999').localeCompare(b.due_date || '9999'))
      .slice(0, PER_COLUMN),
    [tasks],
  );
  const rest = tasks.length - top.length;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.04 * index, ease: [0.23, 1, 0.32, 1] }}
      className={`${COLUMN_SURFACE} rounded-2xl p-3`}
      aria-labelledby={`preview-${lane.key}`}
    >
      <div className="flex items-baseline justify-between gap-2 mb-2 px-0.5">
        <h3 id={`preview-${lane.key}`} className="font-ninja text-sm font-bold text-ninja-navy">{lane.label}</h3>
        <span className="font-ninja text-xs text-ninja-muted tabular-nums">{tasks.length}</span>
      </div>

      {tasks.length === 0 ? (
        <p className="font-ninja text-xs text-ninja-muted px-0.5 py-3">Nothing here.</p>
      ) : (
        <div className="space-y-2.5">
          {top.map((task) => (
            <div key={task.id} className={`${PANEL} p-3`}>
              <TaskFace task={task} />
            </div>
          ))}
          {rest > 0 && (
            <p className="font-ninja text-xs text-ninja-muted px-0.5 pt-0.5">
              {rest} more
            </p>
          )}
        </div>
      )}
    </motion.section>
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

  const lanes = useMemo(() => splitLanes(tasks), [tasks]);
  const late = useMemo(() => {
    const now = today();
    return tasks.filter((t) => t.status !== 'done' && t.due_date && t.due_date < now).length;
  }, [tasks]);

  return (
    <section aria-labelledby="tasks-preview-heading">
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <h2 id="tasks-preview-heading" className="font-ninja font-bold text-ninja-navy text-lg">Tasks</h2>
          <p className="font-ninja text-xs text-ninja-muted mt-0.5 text-pretty">
            {late > 0
              ? <><span className="font-bold text-ninja-red">{late} late</span>. The work this center is carrying.</>
              : 'The work this center is carrying. Every director here sees the same board.'}
          </p>
        </div>
        <Link
          to="/manager/tasks"
          className="flex-shrink-0 font-ninja text-sm font-bold text-ninja-muted hover:text-ninja-blue transition-colors"
        >
          Open board →
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading tasks">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-40 w-full rounded-2xl" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ninja-border px-4 py-8 text-center">
          <p className="font-ninja text-sm font-bold text-ninja-navy">Nothing on the board yet</p>
          <p className="font-ninja text-xs text-ninja-muted mt-1 text-pretty max-w-md mx-auto">
            Cancellations, re-enrollments and print requests live here, and every director at this
            center sees the same one.
          </p>
          <Link
            to="/manager/tasks"
            className="inline-block font-ninja text-sm font-bold text-ninja-blue hover:underline underline-offset-4 mt-3"
          >
            Add the first task
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {LANES.map((lane, i) => (
            <Column key={lane.key} lane={lane} tasks={lanes[lane.key]} index={i} />
          ))}
        </div>
      )}
    </section>
  );
}
