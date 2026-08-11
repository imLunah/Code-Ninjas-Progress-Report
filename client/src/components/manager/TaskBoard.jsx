import { useState, useRef, useCallback, useEffect, useMemo, Fragment } from 'react';
import { createPortal } from 'react-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { PlusIcon, PencilIcon, Trash2Icon, ArrowRightIcon, ArrowLeftIcon } from 'lucide-react';
import ActionMenu, { MenuItem } from '../ui/ActionMenu';
import TaskCardFace from './TaskCardFace';
import { CARD } from '../../lib/surfaces';
import {
  COLUMNS,
  COLUMN_KEYS,
  COLUMN_LABEL,
  groupByColumn,
  moveTask,
  taskTint,
} from '../../lib/taskBoard';

const EASE = [0.23, 1, 0.32, 1];

// Vertical rhythm between cards. The drop maths has to know it, because the
// space a lifted card frees up is its own height plus one gap.
const GAP = 12; // matches space-y-3

// How far the pointer travels before a press becomes a drag. Below this it is
// a click, and the card opens instead of moving.
const DRAG_THRESHOLD = 5;

// Drag is a pointer affordance with no keyboard or touch equivalent, so it is
// only ever the *fast* way to move a card — never the only way. Every move is
// also in the card's own menu, which is what makes the board usable on a phone
// and with a keyboard. Below this width the columns stack, and stacked columns
// overlap on the x axis that the drop target is read from, so dragging is
// switched off rather than left to guess.
const DRAG_MIN_WIDTH = 768;

function useDragEnabled() {
  const [ok, setOk] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(`(min-width: ${DRAG_MIN_WIDTH}px)`).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${DRAG_MIN_WIDTH}px)`);
    const on = (e) => setOk(e.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return ok;
}

/* --------------------------------------------------------------- card -- */

function TaskCard({ task, canManage, grabbable, onOpen, onDelete, onMoveTo, cardRef, onPointerDown }) {
  const [confirming, setConfirming] = useState(false);
  const reduce = useReducedMotion();
  const tint = taskTint(task.color);

  return (
    <motion.div
      ref={cardRef}
      style={tint.style}
      // The cards that aren't being held animate to their new places as the
      // gap opens and closes under the held one. That reflow IS the feedback —
      // it's what tells you where the card will land before you let go.
      layout={reduce ? false : 'position'}
      transition={{ duration: 0.2, ease: EASE }}
      onPointerDown={onPointerDown}
      className={`${CARD} ${tint.className} p-3.5 relative ${grabbable ? 'cursor-grab' : ''}`}
    >
      <TaskCardFace
        task={task}
        onOpen={onOpen}
        actions={
          canManage && (
            // The menu is the one part of the card a press must not drag from,
            // or its trigger would never survive long enough to open.
            <span data-no-drag className="flex-shrink-0">
              <ActionMenu
                label="Task actions"
                className="-mr-1 -mt-1"
                onClosed={() => setConfirming(false)}
              >
                {({ close }) =>
                  confirming ? (
                    // A destructive confirm keeps its word. Everything else on
                    // this board is a glyph; nothing irreversible rests on
                    // recognising one.
                    <div className="p-1.5 w-44">
                      <p className="font-ninja text-xs text-ninja-muted px-1 pb-2 leading-snug">
                        Delete this task? This can't be undone.
                      </p>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => { onDelete(task); close({ restoreFocus: false }); }}
                          className="flex-1 py-1.5 rounded-lg bg-ninja-red text-white font-ninja text-xs font-bold transition-transform duration-150 ease-[var(--ease-out)] active:scale-95"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirming(false)}
                          className="flex-1 py-1.5 rounded-lg bg-ninja-bg text-ninja-navy font-ninja text-xs font-bold transition-transform duration-150 ease-[var(--ease-out)] active:scale-95"
                        >
                          Keep
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <MenuItem icon={PencilIcon} onSelect={() => { close(); onOpen(); }}>
                        Edit
                      </MenuItem>
                      {/* The keyboard and touch route between columns. The
                          arrow points the way the card will actually travel:
                          from the middle column one of these goes back to To
                          do, and two arrows pointing right would say otherwise. */}
                      {COLUMN_KEYS.filter((k) => k !== task.column_key).map((k) => {
                        const back = COLUMN_KEYS.indexOf(k) < COLUMN_KEYS.indexOf(task.column_key);
                        return (
                          <MenuItem
                            key={k}
                            icon={back ? ArrowLeftIcon : ArrowRightIcon}
                            onSelect={() => { close(); onMoveTo(task, k); }}
                          >
                            Move to {COLUMN_LABEL[k]}
                          </MenuItem>
                        );
                      })}
                      <MenuItem icon={Trash2Icon} danger onSelect={() => setConfirming(true)}>
                        Delete
                      </MenuItem>
                    </>
                  )
                }
              </ActionMenu>
            </span>
          )
        }
      />
    </motion.div>
  );
}

/* -------------------------------------------------------------- board -- */

export default function TaskBoard({ tasks, canManage, onEdit, onDelete, onReorder, onAdd }) {
  const dragEnabled = useDragEnabled();
  const reduce = useReducedMotion();
  const grouped = useMemo(() => groupByColumn(tasks), [tasks]);

  const colRefs = useRef({});
  const listRefs = useRef({});
  const cardRefs = useRef(new Map());
  const overlayRef = useRef(null);

  // Geometry captured once, at the moment the press becomes a drag.
  //
  // Re-measuring as the pointer moves would read rects while the cards under it
  // are still animating into the gap, and the target would flicker between two
  // slots. The snapshot already accounts for the hole the lifted card leaves
  // behind, so the maths describes the board as it looks mid-drag without ever
  // having to measure it mid-animation.
  const snap = useRef(null);
  const info = useRef(null);      // { id, dx, dy, w, h }
  const targetRef = useRef(null);
  // pointerup is followed by a click on whatever was under it. After a drag
  // that click would open the editor for the card just dropped.
  const suppressClick = useRef(false);

  const [held, setHeld] = useState(null);   // the card drawn in the overlay
  const [target, setTarget] = useState(null);

  const clearDrag = useCallback(() => {
    snap.current = null;
    info.current = null;
    targetRef.current = null;
    document.body.style.userSelect = '';
    setHeld(null);
    setTarget(null);
  }, []);

  useEffect(() => () => { document.body.style.userSelect = ''; }, []);

  const setTargetIfChanged = (next) => {
    const prev = targetRef.current;
    if (prev && prev.key === next.key && prev.index === next.index) return;
    targetRef.current = next;
    setTarget(next);
  };

  const readTarget = (x, y) => {
    const s = snap.current;
    if (!s) return;

    // Inside a column outright, else the nearest one horizontally — dragging
    // above or below the columns should still have an answer rather than
    // dropping the target and snapping the card home.
    let key = COLUMN_KEYS.find((k) => {
      const r = s[k]?.col;
      return r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    });
    if (!key) {
      let best = Infinity;
      for (const k of COLUMN_KEYS) {
        const r = s[k]?.col;
        if (!r) continue;
        const d = x < r.left ? r.left - x : x > r.right ? x - r.right : 0;
        if (d < best) { best = d; key = k; }
      }
    }
    if (!key) return;
    setTargetIfChanged({ key, index: s[key].mids.filter((m) => m < y).length });
  };

  const beginDrag = (task, rect, startX, startY) => {
    const slot = rect.height + GAP;
    const s = {};

    for (const { key } of COLUMNS) {
      const colEl = colRefs.current[key];
      const listEl = listRefs.current[key];
      if (!colEl || !listEl) continue;

      const list = grouped[key] || [];
      const from = list.findIndex((t) => t.id === task.id);
      const mids = [];
      list.forEach((t, i) => {
        if (t.id === task.id) return;
        const r = cardRefs.current.get(t.id)?.getBoundingClientRect();
        if (!r) return;
        // Cards below the one being lifted close up behind it, so their
        // midpoints are recorded where they will BE, not where they were.
        mids.push((r.top + r.bottom) / 2 - (from !== -1 && i > from ? slot : 0));
      });

      s[key] = { col: colEl.getBoundingClientRect(), mids };
    }

    snap.current = s;
    info.current = { id: task.id, dx: startX - rect.left, dy: startY - rect.top, w: rect.width, h: rect.height };
    document.body.style.userSelect = 'none';
    setHeld({ task, w: rect.width, h: rect.height, x: rect.left, y: rect.top });
    readTarget(startX, startY);
  };

  const onCardPointerDown = (e, task) => {
    suppressClick.current = false;
    if (!canManage || !dragEnabled) return;
    if (e.button !== 0) return;
    if (e.target.closest('[data-no-drag]')) return;

    const el = cardRefs.current.get(task.id);
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    let started = false;

    // Listeners go on the document, not the card: the card unmounts the moment
    // the drag starts (it becomes the overlay), which would drop a pointer
    // capture held on it and strand the drag.
    const move = (ev) => {
      if (!started) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return;
        started = true;
        suppressClick.current = true;
        beginDrag(task, rect, startX, startY);
      }
      // The overlay is moved by writing to the node, not through state. A
      // setState per pointermove would re-render every card on the board for
      // the length of the drag.
      const o = overlayRef.current;
      if (o && info.current) {
        o.style.transform = `translate3d(${ev.clientX - info.current.dx}px, ${ev.clientY - info.current.dy}px, 0)`;
      }
      readTarget(ev.clientX, ev.clientY);
    };

    const up = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', up);
      if (!started) return;

      const t = targetRef.current;
      const from = (grouped[task.column_key] || []).findIndex((x) => x.id === task.id);
      clearDrag();
      if (!t) return;
      // Indices are in dragged-card-removed space, so landing back on `from` in
      // the same column is the no-op.
      if (t.key === task.column_key && t.index === from) return;
      onReorder(moveTask(tasks, task.id, t.key, t.index));
    };

    document.addEventListener('pointermove', move);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', up);
  };

  const openTask = (task) => {
    // The click that follows the pointerup that ended a drag.
    if (suppressClick.current) { suppressClick.current = false; return; }
    onEdit(task);
  };

  const handleMoveTo = useCallback((task, key) => {
    onReorder(moveTask(tasks, task.id, key, (grouped[key] || []).length));
  }, [tasks, grouped, onReorder]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-start">
      {COLUMNS.map((col) => {
        // The held card leaves the list entirely — it is being drawn over the
        // page — and a placeholder stands in the slot it would drop into.
        const items = (grouped[col.key] || []).filter((t) => t.id !== held?.task.id);
        const isTarget = held && target?.key === col.key;
        const at = isTarget ? Math.min(target.index, items.length) : -1;

        // One placeholder for the whole board, shared across slots and columns
        // by layoutId, so moving between two slots slides the gap rather than
        // closing one and blinking another open somewhere else.
        const placeholder = (
          <motion.div
            layoutId="task-drop-placeholder"
            layout={reduce ? false : true}
            transition={{ duration: 0.2, ease: EASE }}
            className="rounded-2xl border-2 border-dashed border-ninja-blue/40 bg-ninja-blue/[0.05]"
            style={{ height: held?.h }}
          />
        );

        return (
          <section
            key={col.key}
            ref={(el) => { colRefs.current[col.key] = el; }}
            aria-labelledby={`col-${col.key}`}
            className={`rounded-2xl p-4 transition-colors duration-150 ${
              isTarget ? 'bg-ninja-blue/[0.07]' : 'bg-ninja-bg'
            }`}
          >
            {/* Title, then the count in a lighter weight, then the add glyph —
                the reference's column header. */}
            <div className="flex items-center justify-between gap-2 px-0.5 pb-3">
              <h3 id={`col-${col.key}`} className="font-ninja text-[15px] font-bold text-ninja-navy">
                {col.label}
                <span className="ml-2 text-sm font-normal text-ninja-muted tabular-nums">
                  {(grouped[col.key] || []).length}
                </span>
              </h3>
              {canManage && (
                <button
                  type="button"
                  onClick={() => onAdd(col.key)}
                  aria-label={`Add task to ${col.label}`}
                  title={`Add task to ${col.label}`}
                  className="w-7 h-7 rounded-full flex items-center justify-center text-ninja-muted hover:text-ninja-blue hover:bg-white dark:hover:bg-white/5 transition-colors flex-shrink-0"
                >
                  <PlusIcon size={17} strokeWidth={2.25} />
                </button>
              )}
            </div>

            <div
              ref={(el) => { listRefs.current[col.key] = el; }}
              className="relative space-y-3 min-h-[2rem]"
            >
              {items.map((task, i) => (
                <Fragment key={task.id}>
                  {at === i && placeholder}
                  <TaskCard
                    task={task}
                    canManage={canManage}
                    grabbable={canManage && dragEnabled}
                    cardRef={(el) => {
                      if (el) cardRefs.current.set(task.id, el);
                      else cardRefs.current.delete(task.id);
                    }}
                    onPointerDown={(e) => onCardPointerDown(e, task)}
                    onOpen={() => openTask(task)}
                    onDelete={onDelete}
                    onMoveTo={handleMoveTo}
                  />
                </Fragment>
              ))}
              {at >= items.length && placeholder}

              {/* No empty-state sentence under an empty column: the Add task
                  row below already says the column is empty and offers the one
                  thing to do about it. A read-only board keeps the sentence,
                  because there it has nothing else to say. */}
              {items.length === 0 && !canManage && (
                <p className="font-ninja text-xs text-ninja-muted px-1 py-3">
                  {col.key === 'done' ? 'Nothing finished yet.' : 'Nothing here.'}
                </p>
              )}
            </div>

            {canManage && (
              <button
                type="button"
                onClick={() => onAdd(col.key)}
                className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-ninja text-sm font-bold text-ninja-muted hover:text-ninja-blue hover:bg-white dark:hover:bg-white/5 transition-colors duration-150 ease-[var(--ease-out)] active:scale-[0.98]"
              >
                <PlusIcon size={16} strokeWidth={2.5} />
                Add task
              </button>
            )}
          </section>
        );
      })}

      {/* The held card, drawn over the page. It has to escape the column: a
          column is a scroll-and-overflow context, and a card dragged out of one
          would be clipped at its edge. */}
      {held && createPortal(
        <div
          ref={overlayRef}
          aria-hidden="true"
          className="fixed top-0 left-0 z-[60] pointer-events-none"
          style={{ width: held.w, transform: `translate3d(${held.x}px, ${held.y}px, 0)` }}
        >
          {/* The card under the pointer keeps its colour while it travels. */}
          <div
            className={`${CARD} ${taskTint(held.task.color).className} task-lensed p-3.5 shadow-xl -rotate-1`}
            style={taskTint(held.task.color).style}
          >
            <TaskCardFace task={held.task} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
