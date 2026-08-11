import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { PlusIcon, PencilIcon, Trash2Icon, ArrowRightIcon } from 'lucide-react';
import ActionMenu, { MenuItem } from '../ui/ActionMenu';
import TaskCardFace from './TaskCardFace';
import { CARD } from '../../lib/surfaces';
import {
  COLUMNS,
  COLUMN_KEYS,
  COLUMN_LABEL,
  groupByColumn,
  moveTask,
} from '../../lib/taskBoard';

const EASE = [0.23, 1, 0.32, 1];

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

function TaskCard({ task, canManage, dragEnabled, onEdit, onDelete, onMoveTo, cardRef, onDragStart, onDrag, onDragEnd, dragging }) {
  const [confirming, setConfirming] = useState(false);
  const reduce = useReducedMotion();

  return (
    <motion.div
      ref={cardRef}
      layout={reduce ? false : 'position'}
      transition={{ duration: 0.22, ease: EASE }}
      drag={canManage && dragEnabled}
      dragSnapToOrigin
      dragMomentum={false}
      dragElastic={0.12}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.03, rotate: -1.2, zIndex: 40 }}
      className={`${CARD} p-3.5 relative ${
        canManage && dragEnabled ? 'cursor-grab active:cursor-grabbing' : ''
      } ${dragging ? 'shadow-lg' : ''}`}
      // Framer owns the CSS transform on this element, so the lift comes from
      // whileDrag rather than a Tailwind transform utility.
      //
      // touch-action must track whether the card is ACTUALLY draggable, not
      // just whether the viewport is wide enough. On a touchscreen laptop a
      // read-only board would otherwise swallow vertical scroll over every
      // card while offering no drag in exchange.
      style={{ touchAction: canManage && dragEnabled ? 'none' : 'auto' }}
    >
      <TaskCardFace
        task={task}
        title={
          // Typography comes from the shared face; this only adds the press.
          <button type="button" onClick={() => onEdit(task)} className="w-full text-left rounded">
            {task.title}
          </button>
        }
        actions={
          canManage && (
          <ActionMenu
            label="Task actions"
            className="-mr-1 -mt-1 flex-shrink-0"
            onClosed={() => setConfirming(false)}
          >
            {({ close }) =>
              confirming ? (
                // A destructive confirm keeps its word. Everything else on this
                // board is a glyph; nothing irreversible rests on recognising
                // one.
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
                  <MenuItem icon={PencilIcon} onSelect={() => { close(); onEdit(task); }}>
                    Edit
                  </MenuItem>
                  {/* The keyboard and touch route between columns. */}
                  {COLUMN_KEYS.filter((k) => k !== task.column_key).map((k) => (
                    <MenuItem
                      key={k}
                      icon={ArrowRightIcon}
                      onSelect={() => { close(); onMoveTo(task, k); }}
                    >
                      Move to {COLUMN_LABEL[k]}
                    </MenuItem>
                  ))}
                  <MenuItem icon={Trash2Icon} danger onSelect={() => setConfirming(true)}>
                    Delete
                  </MenuItem>
                </>
              )
            }
          </ActionMenu>
          )
        }
      />
    </motion.div>
  );
}

/* -------------------------------------------------------------- board -- */

export default function TaskBoard({ tasks, canManage, onEdit, onDelete, onReorder, onAdd }) {
  const dragEnabled = useDragEnabled();
  const grouped = useMemo(() => groupByColumn(tasks), [tasks]);

  const colRefs = useRef({});
  const listRefs = useRef({});
  const cardRefs = useRef(new Map());

  // Geometry captured once, at the moment the drag starts.
  //
  // Re-measuring mid-drag reads rects while the cards under the pointer are
  // still animating, which makes the drop target flicker between two slots.
  // Everything the drag needs is frozen up front, and the drop indicator is
  // positioned absolutely so drawing it can't move the very cards the target
  // was computed from.
  const snap = useRef(null);
  const [drop, setDrop] = useState(null);
  const [draggingId, setDraggingId] = useState(null);

  const handleDragStart = useCallback((task) => {
    const s = {};
    for (const { key } of COLUMNS) {
      const colEl = colRefs.current[key];
      const listEl = listRefs.current[key];
      if (!colEl || !listEl) continue;
      s[key] = {
        col: colEl.getBoundingClientRect(),
        list: listEl.getBoundingClientRect(),
        // The dragged card is excluded, so an index is always a slot in the
        // board as it will look once the card has left its old place — the
        // same space moveTask() splices into.
        cards: (grouped[key] || [])
          .filter((t) => t.id !== task.id)
          .map((t) => cardRefs.current.get(t.id)?.getBoundingClientRect())
          .filter(Boolean),
      };
    }
    snap.current = s;
    setDraggingId(task.id);
  }, [grouped]);

  const handleDrag = useCallback((event) => {
    const s = snap.current;
    if (!s) return;
    // Viewport coordinates, to match the getBoundingClientRect snapshot. Framer
    // normalises to a PointerEvent, but a touch-emulating browser can still
    // hand over a TouchEvent whose coordinates live on the touch list.
    const p = event.touches?.[0] ?? event.changedTouches?.[0] ?? event;
    const x = p.clientX;
    const y = p.clientY;
    if (typeof x !== 'number' || typeof y !== 'number') return;

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

    const index = s[key].cards.filter((r) => (r.top + r.bottom) / 2 < y).length;
    // Only commits state when the slot actually changes. Setting it every frame
    // would re-render the whole board for the length of the drag.
    setDrop((prev) => (prev && prev.key === key && prev.index === index ? prev : { key, index }));
  }, []);

  const handleDragEnd = useCallback((task) => {
    const target = drop;
    setDrop(null);
    setDraggingId(null);
    snap.current = null;
    if (!target) return;

    const from = (grouped[task.column_key] || []).findIndex((t) => t.id === task.id);
    // Indices are already in dragged-card-removed space, so landing back on
    // `from` in the same column is the no-op.
    if (target.key === task.column_key && target.index === from) return;

    onReorder(moveTask(tasks, task.id, target.key, target.index));
  }, [drop, grouped, tasks, onReorder]);

  const handleMoveTo = useCallback((task, key) => {
    // Menu moves append to the end of the destination column.
    onReorder(moveTask(tasks, task.id, key, (grouped[key] || []).length));
  }, [tasks, grouped, onReorder]);

  // Where the indicator line sits, in the coordinate space of its column's
  // list, derived entirely from the frozen snapshot.
  const indicatorTop = (key) => {
    const s = snap.current?.[key];
    if (!s) return null;
    const { cards, list } = s;
    if (cards.length === 0) return 0;
    const abs = drop.index === 0 ? cards[0].top : cards[Math.min(drop.index, cards.length) - 1].bottom;
    return abs - list.top;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-start">
      {COLUMNS.map((col) => {
        const items = grouped[col.key] || [];
        const isTarget = drop?.key === col.key;
        const top = isTarget ? indicatorTop(col.key) : null;

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
                <span className="ml-2 text-sm font-normal text-ninja-muted tabular-nums">{items.length}</span>
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
              {isTarget && top !== null && (
                <div
                  aria-hidden="true"
                  className="absolute left-0 right-0 h-0.5 rounded-full bg-ninja-blue z-10 pointer-events-none"
                  style={{ top }}
                />
              )}

              {items.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  canManage={canManage}
                  dragEnabled={dragEnabled}
                  dragging={draggingId === task.id}
                  cardRef={(el) => {
                    if (el) cardRefs.current.set(task.id, el);
                    else cardRefs.current.delete(task.id);
                  }}
                  onDragStart={() => handleDragStart(task)}
                  onDrag={handleDrag}
                  onDragEnd={() => handleDragEnd(task)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMoveTo={handleMoveTo}
                />
              ))}

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
    </div>
  );
}
