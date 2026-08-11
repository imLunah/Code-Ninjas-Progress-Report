import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { ListTodoIcon } from 'lucide-react';
import TaskCardFace from './TaskCardFace';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { PANEL } from '../../lib/surfaces';
import { COLUMNS, groupByColumn, previewOrder, todayKey } from '../../lib/taskBoard';

const POPOVER_WIDTH = 320; // matches the w-80 the panel is sized to
const PREVIEW_ROWS = 3;

// Tasks as one of the quick links, with the board previewed on hover.
//
// The chip is a real link first and a preview second. That ordering is what
// makes it work where hover doesn't exist: on a phone the tap goes straight to
// the board, and the popover is simply never asked for. Nothing lives only
// inside the hover — the overdue count rides on the chip itself as a dot and in
// the accessible name, because the one thing a director must not have to go
// hunting for is the work that is already late.
//
// Nothing inside the popover is interactive, so there is no focus to trap and
// no link a pointer has to survive the gap to reach.
export default function TasksQuickLink({ className = '' }) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const anchorRef = useRef(null);
  const closeTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    api.get('/director-tasks')
      .catch(() => [])
      .then((rows) => { if (alive) setTasks(rows || []); });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  // Fixed and clamped inside the viewport, so the panel can't clip off the edge
  // of the window — the quick-links row sits hard against the left margin, and
  // the dashboard's framer transforms would trap an absolutely-positioned one.
  const place = () => {
    const r = anchorRef.current?.getBoundingClientRect();
    if (!r) return;
    const margin = 8;
    const maxLeft = window.innerWidth - POPOVER_WIDTH - margin;
    const left = Math.min(Math.max(r.left, margin), Math.max(margin, maxLeft));
    setCoords({ top: r.bottom + 8, left });
  };

  const show = () => { clearTimeout(closeTimer.current); place(); setOpen(true); };
  // The delay is the bridge across the gap between the chip and the panel.
  const hide = () => { closeTimer.current = setTimeout(() => setOpen(false), 80); };

  const grouped = tasks ? groupByColumn(tasks) : null;
  const openTasks = grouped ? [...grouped.doing, ...grouped.todo] : [];
  const overdue = openTasks.filter((t) => t.due_date && t.due_date < todayKey()).length;
  const rows = previewOrder(openTasks).slice(0, PREVIEW_ROWS);
  const hiddenCount = openTasks.length - rows.length;

  const label = !tasks
    ? 'Tasks'
    : `Tasks: ${grouped.todo.length} to do, ${grouped.doing.length} in progress` +
      (overdue ? `, ${overdue} overdue` : '');

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <Link ref={anchorRef} to="/manager/tasks" aria-label={label} className={className}>
        <span className="relative flex-shrink-0">
          <ListTodoIcon className="w-4 h-4 text-ninja-muted group-hover:text-ninja-blue transition-colors" />
          {overdue > 0 && (
            // Inline hex on a ring of the page colour, so the dot reads as a
            // dot in both themes rather than as a smudge on the icon.
            <span
              aria-hidden="true"
              className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ring-2 ring-ninja-bg"
              style={{ backgroundColor: '#ef4444' }}
            />
          )}
        </span>
        Tasks
      </Link>

      {open && tasks && createPortal(
        <div
          onMouseEnter={show}
          onMouseLeave={hide}
          // Supplementary to the chip, which already carries the counts in its
          // accessible name, so this isn't announced twice.
          aria-hidden="true"
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            width: POPOVER_WIDTH,
            maxWidth: 'calc(100vw - 16px)',
          }}
          className="z-50 rounded-xl bg-white border border-ninja-border shadow-lg dark:shadow-[0_12px_32px_rgb(0_0_0/0.45)] p-3 text-left cursor-default"
        >
          <div className="flex items-center gap-2.5 pb-2.5 mb-2.5 border-b border-ninja-border">
            {COLUMNS.map((c) => (
              <span key={c.key} className="font-ninja text-[11px] text-ninja-muted">
                <span className="font-black text-ninja-navy tabular-nums">{grouped[c.key].length}</span>{' '}
                {c.label.toLowerCase()}
              </span>
            ))}
          </div>

          {rows.length === 0 ? (
            <p className="font-ninja text-xs text-ninja-muted py-1">
              {tasks.length === 0 ? 'Nothing on the board yet.' : 'Nothing open. All caught up.'}
            </p>
          ) : (
            <>
              <div className="space-y-2">
                {/* Same face the board draws, so what you glance at here is
                    what you'll recognise when you open it. */}
                {rows.map((t) => (
                  <div key={t.id} className={`${PANEL} p-2.5`}>
                    <TaskCardFace task={t} />
                  </div>
                ))}
              </div>
              {hiddenCount > 0 && (
                <p className="font-ninja text-[11px] text-ninja-muted pt-2 tabular-nums">
                  +{hiddenCount} more open
                </p>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </span>
  );
}
