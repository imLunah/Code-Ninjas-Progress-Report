import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import StickyWall from './board/StickyWall';
import TaskBoard from './board/TaskBoard';
import { EASE, useReportedHeight } from './board/boardShared';

// Two boards share this section. The wall is what it always was: paper in no
// particular order beyond the one you put it in. The task board is columns of
// cards with a stage each. A note belongs to one side or the other, which is
// what lets each own its ordering — sort_order cannot be a position in a column
// and a position on a wall for the same row at once.
const MODES = [
  { key: 'notes', label: 'Notes' },
  { key: 'tasks', label: 'Tasks' },
];
const MODE_INDEX = Object.fromEntries(MODES.map((m, i) => [m.key, i]));
const MODE_STORAGE = 'notes-board-mode';

const COPY = {
  notes: 'Reminders for yourself and the other directors here. Everyone at this center sees the same board.',
  tasks: 'The work this center is carrying. Move a card along as it gets picked up and finished.',
};

const NOTE_H = 200;

// The two boards are one control, not two links: a pill that travels between
// the labels, the same shape as the login toggle.
function BoardSwitch({ mode, onChange }) {
  return (
    <div className="inline-flex items-center rounded-full bg-ninja-bg p-1" role="tablist" aria-label="Board">
      {MODES.map((m) => (
        <button
          key={m.key}
          type="button"
          role="tab"
          aria-selected={mode === m.key}
          onClick={() => onChange(m.key)}
          className="relative px-3.5 py-1.5 rounded-full font-ninja text-sm font-bold"
        >
          {mode === m.key && (
            <motion.span
              layoutId="board-switch-pill"
              className="absolute inset-0 rounded-full bg-white shadow-sm"
              transition={{ type: 'spring', stiffness: 520, damping: 40 }}
            />
          )}
          <span className={`relative z-10 transition-colors ${mode === m.key ? 'text-ninja-navy' : 'text-ninja-muted'}`}>
            {m.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// One panel of the slider. Reports its height so the section can animate to it
// rather than snapping when the boards swap.
function Panel({ id, onHeight, children }) {
  const ref = useReportedHeight(id, onHeight);
  return (
    <div className="flex-shrink-0" style={{ width: `${100 / MODES.length}%` }}>
      <div ref={ref}>{children}</div>
    </div>
  );
}

export default function DirectorStickyNotes() {
  // isReadOnly: a director viewing a center they aren't assigned to. The server
  // refuses every write here (all of /director-notes is requireOwnLocation), so
  // without this the boards would offer add/edit/delete/drag that only 403.
  const { user, isReadOnly } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState(() => {
    const saved = localStorage.getItem(MODE_STORAGE);
    return MODE_INDEX[saved] !== undefined ? saved : 'notes';
  });

  // Measured ONCE, on a wrapper that outlives both boards. Each board used to
  // measure itself on mount, so the incoming one painted its narrow fallback
  // layout for a frame and then snapped to the real one halfway through the
  // slide. That snap was most of what made the transition look broken.
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

  const [heights, setHeights] = useState({});
  const reportHeight = useCallback((id, h) => {
    setHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
  }, []);

  useEffect(() => {
    let alive = true;
    api.get('/director-notes')
      .then((data) => { if (alive) { setNotes(data || []); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  const switchMode = (next) => {
    if (next === mode) return;
    localStorage.setItem(MODE_STORAGE, next);
    setMode(next);
  };

  // Both boards come down in one fetch and are split here, so switching is
  // instant. A request per board would put a loading state in the middle of the
  // slide, which is the one moment anybody would see it.
  const forBoard = useMemo(
    () => ({
      notes: notes.filter((n) => (n.board || 'notes') === 'notes'),
      tasks: notes.filter((n) => n.board === 'tasks'),
    }),
    [notes],
  );

  // Each board reorders its own cards. The two live in one list, so the other
  // board's are carried through untouched — the order between the groups means
  // nothing, only the order within one.
  const arrangeFor = useCallback((board) => (updater) => {
    setNotes((prev) => {
      const mine = prev.filter((n) => (n.board || 'notes') === board);
      const theirs = prev.filter((n) => (n.board || 'notes') !== board);
      return [...updater(mine), ...theirs];
    });
  }, []);

  const canManage = useCallback(
    (note) => !isReadOnly && (note.created_by === user?.id || user?.role === 'admin'),
    [isReadOnly, user?.id, user?.role],
  );

  // One handler for saves and creates: a board that just created a card passes
  // isNew, everything else is an edit landing on a card already on screen.
  const onSaved = useCallback((saved, isNew) => {
    setNotes((prev) => (isNew ? [saved, ...prev] : prev.map((n) => (n.id === saved.id ? { ...n, ...saved } : n))));
  }, []);

  const onDeleted = useCallback((id) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const shared = { width, isReadOnly, canManage, onSaved, onDeleted };
  const activeH = heights[mode];

  return (
    <section aria-labelledby="board-heading">
      <div className="mb-4">
        <div className="flex items-center gap-3">
          <h2 id="board-heading" className="font-ninja font-bold text-ninja-navy text-lg">Board</h2>
          <BoardSwitch mode={mode} onChange={switchMode} />
        </div>
        {/* The line under the heading is what tells the two boards apart, so it
            changes with them rather than describing both at once. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={mode}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="font-ninja text-xs text-ninja-muted mt-1.5 text-pretty"
          >
            {COPY[mode]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* The ref stays on this wrapper through everything below it, including
          the loading state, so the width is already known by the time either
          board first paints. */}
      <div ref={wrapRef} className="overflow-hidden">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-busy="true" aria-label="Loading board">
            {[0, 1].map((i) => (
              <div key={i} className="animate-pulse rounded-xl bg-ninja-bg" style={{ height: NOTE_H }} />
            ))}
          </div>
        ) : (
          // Both boards stay mounted and the track slides between them. Swapping
          // one for the other meant the section collapsed to nothing in the
          // middle of the animation, which is what made it look jagged: the
          // height was jumping while the content was still moving.
          <motion.div
            initial={false}
            animate={{ height: activeH || 'auto' }}
            transition={{ duration: 0.34, ease: EASE }}
            style={{ overflow: 'hidden' }}
          >
            <motion.div
              className="flex items-start"
              style={{ width: `${MODES.length * 100}%` }}
              initial={false}
              animate={{ x: `-${MODE_INDEX[mode] * (100 / MODES.length)}%` }}
              transition={{ duration: 0.34, ease: EASE }}
            >
              <Panel id="notes" onHeight={reportHeight}>
                <StickyWall
                  notes={forBoard.notes}
                  onArrange={arrangeFor('notes')}
                  {...shared}
                />
              </Panel>
              <Panel id="tasks" onHeight={reportHeight}>
                <TaskBoard
                  notes={forBoard.tasks}
                  onArrange={arrangeFor('tasks')}
                  {...shared}
                />
              </Panel>
            </motion.div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
