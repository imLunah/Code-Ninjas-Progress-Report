import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import TaskBoard from './board/TaskBoard';

// The center's task board on the director dashboard.
//
// This started as a wall of sticky notes and briefly ran as both: a wall and a
// board behind a switch. Two places to put the same thing meant whichever one
// was already on screen got the entry, so neither list was the whole picture
// and neither could be trusted. The wall is gone. Everything that was on it is
// still here as a card, which is why a card is allowed to have a body and no
// title.

const CARD_SKELETON_H = 92;

export default function TaskBoardSection() {
  // isReadOnly: a director viewing a center they aren't assigned to. The server
  // refuses every write here (all of /tasks is requireOwnLocation), so without
  // this the board would offer add/edit/delete/drag that only 403.
  const { user, isReadOnly } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);

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
    api.get('/tasks')
      .then((data) => { if (alive) { setTasks(data || []); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    // The directors a task can be handed to. Fetched alongside rather than when
    // a form opens, so the assign dropdown is never a spinner.
    api.get('/tasks/assignees')
      .then((data) => { if (alive) setAssignees(data || []); })
      .catch(() => { if (alive) setAssignees([]); });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  const canManage = useCallback(
    (task) => !isReadOnly && (task.created_by === user?.id || user?.role === 'admin'),
    [isReadOnly, user?.id, user?.role],
  );

  // One handler for saves and creates: the board passes isNew when it has just
  // made a card, everything else is an edit landing on one already on screen.
  const onSaved = useCallback((saved, isNew) => {
    setTasks((prev) => (isNew ? [saved, ...prev] : prev.map((t) => (t.id === saved.id ? { ...t, ...saved } : t))));
  }, []);

  const onDeleted = useCallback((id) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const onArrange = useCallback((updater) => setTasks((prev) => updater(prev)), []);

  return (
    <section aria-labelledby="board-heading">
      <div className="mb-4">
        <h2 id="board-heading" className="font-ninja font-bold text-ninja-navy text-lg">Tasks</h2>
        <p className="font-ninja text-xs text-ninja-muted mt-1 text-pretty">
          The work this center is carrying. Move a card along as it gets picked up and finished.
          Every director here sees the same board.
        </p>
      </div>

      {/* The ref stays on this wrapper through the loading state too, so the
          width is already known by the time the board first paints. */}
      <div ref={wrapRef}>
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading tasks">
            {[0, 1, 2].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-ninja-border/40" style={{ height: CARD_SKELETON_H * 2 }} />
            ))}
          </div>
        ) : (
          <TaskBoard
            tasks={tasks}
            assignees={assignees}
            width={width}
            isReadOnly={isReadOnly}
            canManage={canManage}
            onSaved={onSaved}
            onDeleted={onDeleted}
            onArrange={onArrange}
          />
        )}
      </div>
    </section>
  );
}
