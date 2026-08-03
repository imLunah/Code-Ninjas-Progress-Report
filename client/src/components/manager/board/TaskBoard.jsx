import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  PlusIcon, PencilIcon, Trash2Icon, ChevronLeftIcon, ChevronRightIcon,
  CalendarDaysIcon, UserIcon,
} from 'lucide-react';
import { api } from '../../../api/client';
import LazyMarkdownEditor from '../../shared/LazyMarkdownEditor';
import { PANEL } from '../../../lib/surfaces';
import { today } from '../../../utils/dateUtils';
import {
  GAP, SPRING, clamp, MD, mdUrl, shortDate, dayLabel, firstName,
  LANES, LANE_INDEX, IconButton, DiscardButton,
  useReportedHeight, splitLanes, flattenLanes,
} from './boardShared';

// Columns of cards. Work you are tracking wants a name you can scan a column
// for, a kind you can tell at a glance, and a stage, which is more than a blob
// of text can carry.

const CATEGORIES = [
  { key: 'cancellation', label: 'Cancellation',  chip: 'bg-red-100 text-red-700' },
  { key: 'reenrollment', label: 'Re-enrollment', chip: 'bg-green-100 text-green-700' },
  { key: 'print',        label: 'Print request', chip: 'bg-indigo-100 text-indigo-700' },
  // No chip: most work is just work, and a card that says "Other" says nothing.
  { key: 'other',        label: 'Other',         chip: null },
];
const categoryOf = (key) => CATEGORIES.find((c) => c.key === key) || CATEGORIES[3];

// The page itself is painted in ninja-bg, so a column filled with that token
// would be invisible in both themes. A tint of the opposite ink lifts off the
// page either way, and opacity utilities deliberately escape the .dark bg
// overrides, which is the one time that behaviour is wanted.
const COLUMN_SURFACE = 'bg-black/[0.035] dark:bg-white/[0.04]';

const COL_MIN_W = 264;
const PAD = 12;        // column padding
const CARD_GAP = 10;   // between cards in a column
const MIN_CANVAS_H = 220;

// Heights are measured, but the first paint happens before the observer has
// reported anything. These keep the first frame close enough that nothing
// visibly jumps into place.
const EST_CARD_H = 92;
const EST_ADD_H = 36;

// Three columns of cards is the least this can be. Narrower and they stack as
// plain lists with dragging off: the drag maths needs a stable canvas width,
// and a drag surface on a phone fights both page scroll and the app's own
// swipe navigation.
export const LANES_MIN_W = LANES.length * COL_MIN_W + (LANES.length - 1) * GAP;

// Where a card sits in a column, given what is above it. Cards are whatever
// height their contents need, so the column stacks measured heights rather than
// multiplying a constant.
function stackOffsets(items, heights) {
  const offsets = [];
  let y = PAD;
  for (const item of items) {
    offsets.push(y);
    y += (heights[item.id] ?? EST_CARD_H) + CARD_GAP;
  }
  return { offsets, end: y };
}

// Which gap in the column is the cursor nearest. Compared against each card's
// midpoint, so a card dropped on the top half of another goes above it.
function insertIndex(items, heights, y) {
  let acc = PAD;
  for (let i = 0; i < items.length; i += 1) {
    const h = heights[items[i].id] ?? EST_CARD_H;
    if (y < acc + h / 2) return i;
    acc += h + CARD_GAP;
  }
  return items.length;
}

function CategoryChip({ category }) {
  const cat = categoryOf(category);
  if (!cat.chip) return null;
  return (
    <span className={`font-ninja text-[10px] font-bold px-2 py-0.5 rounded-full ${cat.chip}`}>
      {cat.label}
    </span>
  );
}

// Both dates are plain YYYY-MM-DD, so a string compare is a calendar compare
// and no timezone gets a say in whether something is late.
function DueChip({ due, status }) {
  const now = today();
  const done = status === 'done';
  const overdue = !done && due < now;
  const dueToday = !done && due === now;
  return (
    <span
      className={`inline-flex items-center gap-1 font-ninja text-[10px] font-bold px-2 py-0.5 rounded-full ${
        overdue ? 'bg-red-100 text-red-700'
          : dueToday ? 'bg-yellow-100 text-yellow-700'
            : 'bg-ninja-bg text-ninja-muted'
      }`}
    >
      <CalendarDaysIcon className="w-3 h-3 flex-shrink-0" strokeWidth={2.25} />
      {overdue ? `Late ${dayLabel(due)}` : dueToday ? 'Due today' : dayLabel(due)}
    </span>
  );
}

function AssigneeChip({ name }) {
  return (
    <span className="inline-flex items-center gap-1 font-ninja text-[10px] font-bold px-2 py-0.5 rounded-full bg-ninja-bg text-ninja-muted">
      <UserIcon className="w-3 h-3 flex-shrink-0" strokeWidth={2.25} />
      {firstName(name)}
    </span>
  );
}

function CategoryPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORIES.map((c) => (
        <button
          key={c.key}
          type="button"
          onClick={() => onChange(c.key)}
          aria-pressed={value === c.key}
          className={`font-ninja text-[11px] font-bold px-2 py-1 rounded-full transition ${
            value === c.key ? 'bg-ninja-blue text-white' : 'bg-ninja-bg text-ninja-muted hover:text-ninja-navy'
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

// Title is a single line, description is optional. The editor needs a resolved
// height for its bare variant, so the wrapper gives it one rather than letting
// it collapse to a toolbar and one line.
function TaskEditor({
  title, setTitle, body, setBody, category, setCategory,
  due, setDue, assignee, setAssignee, assignees,
  busy, onCancel, onSave, saveLabel,
}) {
  const field = 'font-ninja text-xs rounded-lg border border-ninja-border bg-white px-2 py-1.5 text-ninja-navy';
  return (
    <div className="space-y-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onSave(); } }}
        maxLength={200}
        autoFocus
        placeholder="What needs doing?"
        aria-label="Task name"
        className="w-full font-ninja text-sm font-bold rounded-lg border border-ninja-border bg-white px-2.5 py-1.5 text-ninja-navy placeholder:text-ninja-muted placeholder:font-normal"
      />
      <CategoryPicker value={category} onChange={setCategory} />

      {/* Both optional. Most of what a center is carrying has no deadline and
          no single owner, and a form that insists on them gets filled with
          made-up ones. */}
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          value={due}
          onChange={(e) => setDue(e.target.value)}
          aria-label="Due date"
          className={`${field} w-full`}
        />
        <select
          value={assignee}
          onChange={(e) => setAssignee(e.target.value)}
          aria-label="Assign to"
          className={`${field} w-full`}
        >
          <option value="">Anyone</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>{a.display_name}</option>
          ))}
        </select>
      </div>
      <div className="h-28 flex flex-col min-h-0 rounded-lg border border-ninja-border px-2 py-1.5 text-ninja-navy">
        <LazyMarkdownEditor variant="bare" value={body} onChange={setBody} placeholder="Any detail worth keeping…" />
      </div>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="font-ninja text-xs font-bold px-2.5 py-1.5 rounded-full text-ninja-muted hover:text-ninja-navy transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={busy || !title.trim()}
          className="font-ninja text-xs font-bold px-3 py-1.5 rounded-full bg-ninja-blue text-white hover:brightness-95 disabled:opacity-50 transition"
        >
          {saveLabel}
        </button>
      </div>
    </div>
  );
}

function TaskCard({
  task, canManage, canReorder, board, reportHeight, assignees,
  onDragToSlot, onDropped, onMoveLane, onSaved, onDeleted,
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title || '');
  const [body, setBody] = useState(task.body || '');
  const [category, setCategory] = useState(task.category || 'other');
  const [due, setDue] = useState(task.due_date || '');
  const [assignee, setAssignee] = useState(task.assignee_id ? String(task.assignee_id) : '');
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const measureRef = useReportedHeight(task.id, reportHeight);
  const lane = LANE_INDEX[task.status] ?? 0;
  const isDone = task.status === 'done';

  // Motion values, not state: a drag writes to them every frame and state would
  // re-render the whole board on each one.
  const x = useMotionValue(board ? board.x : 0);
  const y = useMotionValue(board ? board.y : 0);
  const settled = useRef(false);

  useEffect(() => {
    if (!board || dragging) return;
    if (!settled.current) {
      x.set(board.x); y.set(board.y);
      settled.current = true;
      return;
    }
    const a = animate(x, board.x, SPRING);
    const b = animate(y, board.y, SPRING);
    return () => { a.stop(); b.stop(); };
  }, [board?.x, board?.y, dragging]);

  // Dragging is off while editing so selecting text in a field doesn't drag the
  // card out from under the cursor.
  const canDrag = !!board && !editing && canReorder;

  const save = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const updated = await api.patch(`/tasks/${task.id}`, {
        title, body, category,
        due_date: due || null,
        assignee_id: assignee || null,
      });
      onSaved(updated);
      setEditing(false);
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  return (
    <motion.div
      ref={measureRef}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      drag={canDrag}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={board ? { left: 0, top: 0, right: board.maxX, bottom: board.maxY } : undefined}
      onDragStart={() => setDragging(true)}
      onDrag={() => board && onDragToSlot(task.id, x.get(), y.get())}
      onDragEnd={() => { setDragging(false); onDropped(); }}
      whileDrag={{ scale: 1.03 }}
      className={`${PANEL} p-3 ${board ? 'absolute left-0 top-0' : 'relative w-full'} ${
        canDrag ? 'cursor-grab active:cursor-grabbing' : ''
      }`}
      style={{
        width: board ? board.w : undefined,
        x: board ? x : undefined,
        y: board ? y : undefined,
        zIndex: dragging ? 30 : 1,
        // Finished work stays legible but stops competing with the work that
        // isn't.
        opacity: isDone && !editing ? 0.75 : 1,
        boxShadow: dragging ? '0 18px 38px rgba(15, 20, 40, 0.28)' : undefined,
        touchAction: canDrag ? 'none' : undefined,
      }}
    >
      {editing ? (
        <TaskEditor
          title={title} setTitle={setTitle}
          body={body} setBody={setBody}
          category={category} setCategory={setCategory}
          due={due} setDue={setDue}
          assignee={assignee} setAssignee={setAssignee}
          assignees={assignees}
          busy={busy}
          saveLabel="Save"
          onCancel={() => {
            setEditing(false);
            setTitle(task.title || ''); setBody(task.body || ''); setCategory(task.category || 'other');
            setDue(task.due_date || ''); setAssignee(task.assignee_id ? String(task.assignee_id) : '');
          }}
          onSave={save}
        />
      ) : (
        <>
          <CategoryChip category={task.category} />
          <h4 className={`font-ninja font-bold text-ninja-navy text-sm leading-snug text-pretty ${task.category !== 'other' ? 'mt-1.5' : ''}`}>
            {task.title || task.body}
          </h4>
          {task.title && task.body && (
            // A preview, not the whole thing. Opening the card is what shows the
            // rest, and a column of full descriptions is a column you scroll
            // instead of scan.
            <div
              className="font-ninja text-xs text-ninja-muted mt-1.5 break-words overflow-hidden"
              style={{ maxHeight: '3.4rem' }}
            >
              <ReactMarkdown components={MD} urlTransform={mdUrl}>{task.body}</ReactMarkdown>
            </div>
          )}

          {(task.due_date || task.assignee_id) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {task.due_date && <DueChip due={task.due_date} status={task.status} />}
              {task.assignee_id && <AssigneeChip name={task.assignee_name} />}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-ninja-border">
            <span className="font-ninja text-[11px] text-ninja-muted truncate">
              {isDone && task.completed_at ? `Done ${shortDate(task.completed_at)}` : task.created_by_name || 'Unknown'}
            </span>
            <div className="flex items-center gap-0.5 flex-shrink-0 text-ninja-muted">
              {/* Arrows are on the card in both layouts: on a phone they are the
                  only way to move a card along, and on a desk they beat dragging
                  for a single step. */}
              {canReorder && !confirmDel && (
                <>
                  {lane > 0 && (
                    <IconButton subtle onClick={() => onMoveLane(task, -1)} label={`Move to ${LANES[lane - 1].label}`}>
                      <ChevronLeftIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
                    </IconButton>
                  )}
                  {lane < LANES.length - 1 && (
                    <IconButton subtle onClick={() => onMoveLane(task, 1)} label={`Move to ${LANES[lane + 1].label}`}>
                      <ChevronRightIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
                    </IconButton>
                  )}
                </>
              )}
              {canManage && (
                confirmDel ? (
                  // The confirm keeps its word. Icons are fine for reversible
                  // actions; a destructive one should never rest on the reader
                  // recognising a glyph.
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api.delete(`/tasks/${task.id}`);
                          onDeleted(task.id);
                        } catch { setBusy(false); setConfirmDel(false); }
                      }}
                      disabled={busy}
                      className="font-ninja text-[11px] font-bold px-2 py-1 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition"
                    >
                      Delete
                    </button>
                    <DiscardButton onClick={() => setConfirmDel(false)} label="Keep task" />
                  </div>
                ) : (
                  <>
                    <IconButton subtle onClick={() => setEditing(true)} label="Edit task">
                      <PencilIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
                    </IconButton>
                    <IconButton subtle danger onClick={() => setConfirmDel(true)} label="Delete task">
                      <Trash2Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
                    </IconButton>
                  </>
                )
              )}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

// Sits at the bottom of its column. Collapsed it is one quiet line; open it is
// a card the same shape as the ones above it, so adding work looks like the
// work it becomes.
function Composer({ lane, board, reportHeight, assignees, onCreated }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('other');
  const [due, setDue] = useState('');
  const [assignee, setAssignee] = useState('');
  const [busy, setBusy] = useState(false);
  const measureRef = useReportedHeight(`add-${lane}`, reportHeight);

  const reset = () => {
    setTitle(''); setBody(''); setCategory('other'); setDue(''); setAssignee(''); setOpen(false);
  };

  const create = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    try {
      const created = await api.post('/tasks', {
        title, body, category, status: lane,
        due_date: due || null,
        assignee_id: assignee || null,
      });
      onCreated(created);
      reset();
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  return (
    <div
      ref={measureRef}
      className={board ? 'absolute left-0 top-0' : 'relative w-full'}
      style={board ? { width: board.w, transform: `translate(${board.x}px, ${board.y}px)` } : undefined}
    >
      {open ? (
        <div className={`${PANEL} p-3`}>
          <TaskEditor
            title={title} setTitle={setTitle}
            body={body} setBody={setBody}
            category={category} setCategory={setCategory}
            due={due} setDue={setDue}
            assignee={assignee} setAssignee={setAssignee}
            assignees={assignees}
            busy={busy}
            saveLabel="Add"
            onCancel={reset}
            onSave={create}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 font-ninja text-sm font-semibold text-ninja-muted hover:text-ninja-navy rounded-lg px-1.5 py-1.5 transition-colors"
        >
          <PlusIcon className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
          Add a task
        </button>
      )}
    </div>
  );
}

function LaneHeading({ lane, count, id }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h3 id={id} className="font-ninja text-sm font-bold text-ninja-navy">{lane.label}</h3>
      <span className="font-ninja text-xs text-ninja-muted tabular-nums">{count}</span>
    </div>
  );
}

export default function TaskBoard({
  tasks, assignees = [], width, isReadOnly, canManage, onSaved, onDeleted, onArrange,
}) {
  const [heights, setHeights] = useState({});

  // Stable, or every render would tear down and rebuild each card's observer.
  const reportHeight = useCallback((id, h) => {
    setHeights((prev) => (prev[id] === h ? prev : { ...prev, [id]: h }));
  }, []);

  const lanes = useMemo(() => splitLanes(tasks), [tasks]);
  const boardOn = width >= LANES_MIN_W;

  const layout = useMemo(() => {
    if (!boardOn) return null;
    const colW = Math.floor((width - (LANES.length - 1) * GAP) / LANES.length);
    const geom = {};
    let tallest = MIN_CANVAS_H;
    for (const l of LANES) {
      const { offsets, end } = stackOffsets(lanes[l.key], heights);
      const addH = heights[`add-${l.key}`] ?? EST_ADD_H;
      geom[l.key] = { offsets, addY: end };
      tallest = Math.max(tallest, end + addH + PAD);
    }
    return {
      colW,
      cardW: colW - PAD * 2,
      height: tallest,
      geom,
      maxX: (LANES.length - 1) * (colW + GAP) + PAD,
      maxY: Math.max(0, tallest - 60),
    };
  }, [lanes, heights, width, boardOn]);

  // Lane comes from x, position from y. Crossing into another column and moving
  // up your own are the same gesture, so they are one calculation.
  const dragToSlot = useCallback((id, x, y) => {
    onArrange((prev) => {
      const colW = Math.floor((width - (LANES.length - 1) * GAP) / LANES.length);
      const moving = prev.find((n) => n.id === id);
      if (!moving) return prev;

      const laneIdx = clamp(Math.round((x - PAD) / (colW + GAP)), 0, LANES.length - 1);
      const status = LANES[laneIdx].key;
      const rest = splitLanes(prev, id);
      const row = insertIndex(rest[status], heights, y);

      // Already where it would land: bail before rebuilding, or every frame of
      // a stationary drag would hand React a brand new array.
      if (moving.status === status) {
        const current = prev.filter((n) => n.status === status).findIndex((n) => n.id === id);
        if (current === row) return prev;
      }

      rest[status].splice(row, 0, moving.status === status ? moving : { ...moving, status });
      return flattenLanes(rest);
    });
  }, [width, heights, onArrange]);

  const persist = useCallback((current) => {
    const grouped = splitLanes(current);
    api.patch('/tasks/reorder', {
      lanes: LANES.map((l) => ({ status: l.key, ids: grouped[l.key].map((n) => n.id) })),
    }).catch(() => { /* arrangement is corrected on next load */ });
  }, []);

  // Persist on release, not on every slot change during the drag. Column and
  // position go up together: they are one move, so one request cannot
  // half-apply them.
  const persistOrder = useCallback(() => {
    onArrange((current) => { persist(current); return current; });
  }, [onArrange, persist]);

  // One step along, from the card. Optimistic: the card lands in the next
  // column and the arrangement is corrected on the next load if the write
  // fails.
  const moveLane = useCallback((task, delta) => {
    const target = LANES[clamp((LANE_INDEX[task.status] ?? 0) + delta, 0, LANES.length - 1)].key;
    if (target === task.status) return;
    onArrange((prev) => {
      const rest = splitLanes(prev, task.id);
      rest[target].unshift({
        ...task,
        status: target,
        // The server stamps the real value; this is so the card doesn't sit in
        // Done with no date on it until the next fetch.
        completed_at: target === 'done' ? (task.completed_at ?? new Date().toISOString()) : null,
      });
      const next = flattenLanes(rest);
      persist(next);
      return next;
    });
  }, [onArrange, persist]);

  const cardProps = (task) => ({
    assignees,
    canManage: canManage(task),
    // Moving stays deliberately NOT author-gated (the arrangement is shared),
    // so it can't ride on canManage — but it is still a write, so it goes away
    // when the center isn't ours.
    canReorder: !isReadOnly,
    reportHeight,
    onDragToSlot: dragToSlot,
    onDropped: persistOrder,
    onMoveLane: moveLane,
    onSaved,
    onDeleted,
  });

  if (!boardOn) {
    // Narrow: the columns become three stacked lists in normal flow. Same
    // cards, no dragging, no measuring.
    return (
      <div className="space-y-5">
        {LANES.map((l) => (
          <section key={l.key} className={`${COLUMN_SURFACE} rounded-2xl p-3`} aria-labelledby={`lane-${l.key}`}>
            <div className="mb-2 px-0.5">
              <LaneHeading lane={l} count={lanes[l.key].length} id={`lane-${l.key}`} />
            </div>
            <div className="space-y-2.5">
              <AnimatePresence>
                {lanes[l.key].map((task) => (
                  <TaskCard key={task.id} task={task} board={null} {...cardProps(task)} />
                ))}
              </AnimatePresence>
              {!isReadOnly && (
                <Composer
                  lane={l.key}
                  board={null}
                  reportHeight={reportHeight}
                  assignees={assignees}
                  onCreated={(created) => onSaved(created, true)}
                />
              )}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Headings sit above the canvas rather than inside it: a heading in the
          canvas is one more thing the drag maths would have to reason about. */}
      <div className="flex gap-4 mb-2">
        {LANES.map((l) => (
          <div key={l.key} style={{ width: layout.colW }} className="px-3">
            <LaneHeading lane={l} count={lanes[l.key].length} />
          </div>
        ))}
      </div>

      <div className="relative" style={{ height: layout.height }}>
        {/* Column chrome is drawn behind the cards rather than around them: the
            cards live in one shared canvas so a drag can cross between
            columns, which it cannot do out of a nested scroll container. */}
        {LANES.map((l, i) => (
          <div
            key={`col-${l.key}`}
            className={`absolute top-0 rounded-2xl pointer-events-none ${COLUMN_SURFACE}`}
            style={{ left: i * (layout.colW + GAP), width: layout.colW, height: layout.height }}
          />
        ))}

        <AnimatePresence>
          {/* flatMap, not nested maps: AnimatePresence wants its children in one
              flat keyed list to track exits. */}
          {LANES.flatMap((l, laneIdx) =>
            lanes[l.key].map((task, row) => (
              <TaskCard
                key={task.id}
                task={task}
                board={{
                  x: laneIdx * (layout.colW + GAP) + PAD,
                  y: layout.geom[l.key].offsets[row],
                  w: layout.cardW,
                  maxX: layout.maxX,
                  maxY: layout.maxY,
                }}
                {...cardProps(task)}
              />
            )),
          )}
        </AnimatePresence>

        {!isReadOnly && LANES.map((l, i) => (
          <Composer
            key={`add-${l.key}`}
            lane={l.key}
            board={{
              x: i * (layout.colW + GAP) + PAD,
              y: layout.geom[l.key].addY,
              w: layout.cardW,
            }}
            reportHeight={reportHeight}
            assignees={assignees}
            onCreated={(created) => onSaved(created, true)}
          />
        ))}
      </div>
    </div>
  );
}
