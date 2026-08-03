import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import LazyMarkdownEditor from '../shared/LazyMarkdownEditor';
import {
  PlusIcon,
  XIcon,
  CheckIcon,
  PencilIcon,
  Trash2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';

// Markdown for note bodies. Inherits the note's own text color (currentColor)
// so bold/lists/links match each sticky's palette. Images dropped (text-only).
const STICKY_MD = {
  p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="list-disc marker:opacity-50 pl-4 mb-1.5 last:mb-0 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal marker:opacity-50 pl-4 mb-1.5 last:mb-0 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li className="leading-snug">{children}</li>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">{children}</a>,
  img: () => null,
  h1: ({ children }) => <p className="font-bold mb-1.5">{children}</p>,
  h2: ({ children }) => <p className="font-bold mb-1.5">{children}</p>,
  h3: ({ children }) => <p className="font-bold mb-1.5">{children}</p>,
};

const mdUrl = (url) => (/^(https?:|mailto:)/i.test(url) ? url : '');

// Paper-sticky palette. Inline hex so notes read identically in light + dark
// (avoids the .dark bg-* override turning pastel notes dark).
const COLORS = {
  yellow: { bg: '#fef3c7', text: '#713f12', ring: '#fcd34d' },
  blue:   { bg: '#dbeafe', text: '#1e3a5f', ring: '#93c5fd' },
  green:  { bg: '#dcfce7', text: '#14532d', ring: '#86efac' },
  pink:   { bg: '#fce7f3', text: '#831843', ring: '#f9a8d4' },
  purple: { bg: '#ede9fe', text: '#4c1d95', ring: '#c4b5fd' },
};
const ORDER = ['yellow', 'blue', 'green', 'pink', 'purple'];

// Lanes. A note is a note whether it is a reminder or a cancellation to chase:
// what a task adds is a stage, so the board grew lanes rather than the app
// growing a second board with its own page, table and vocabulary. Colour stays
// free-form, which is how a real wall of paper gets categorised anyway.
const LANES = [
  { key: 'todo',  label: 'To do' },
  { key: 'doing', label: 'In progress' },
  { key: 'done',  label: 'Done' },
];
const LANE_INDEX = Object.fromEntries(LANES.map((l, i) => [l.key, i]));

// The notes used to live inside a white panel, so the page showed paper resting
// on a card resting on the page. The paper is the surface; the section is just a
// heading and a board.

// Every note is the same piece of paper. Long text scrolls inside it rather than
// stretching the note, so the board stays an even wall instead of a ragged one.
const MIN_NOTE_W = 248;
const NOTE_H = 200;
const GAP = 16;

// Three lanes of paper is the least this can be. Below it the lanes stack as
// plain lists and dragging is off: slot maths needs a stable canvas width, and
// a drag surface on a phone fights both page scroll and the app's own swipe
// navigation. Cards still move lane there, by the arrows on the card.
const BOARD_MIN_W = LANES.length * MIN_NOTE_W + (LANES.length - 1) * GAP;

const SPRING = { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 };

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const doneOn = (iso) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// Notes occupy slots, never free coordinates: a note is always in exactly one
// cell of one lane, so two can't end up stacked on each other and the board is
// never taller than the rows it holds.
const slotFor = (lane, row, laneW) => ({
  x: lane * (laneW + GAP),
  y: row * (NOTE_H + GAP),
});

// Which lane and row is the dragged note sitting over. Pure maths against the
// grid, not a hit-test against sibling rects, which would read positions
// mid-animation and make the order flicker while the others are still sliding.
const laneAt = (x, laneW) => clamp(Math.round(x / (laneW + GAP)), 0, LANES.length - 1);
const rowAt = (y, count) => clamp(Math.round(y / (NOTE_H + GAP)), 0, count);

// The board is held as one flat list; the lanes are a view of it. Rebuilding in
// lane order after every move keeps the list and the board describing the same
// thing, so what gets persisted is exactly what is on screen.
const split = (notes, skipId) => {
  const lanes = {};
  for (const l of LANES) lanes[l.key] = [];
  for (const n of notes) {
    if (n.id === skipId) continue;
    (lanes[n.status] || lanes.todo).push(n);
  }
  return lanes;
};
const flatten = (lanes) => LANES.flatMap((l) => lanes[l.key]);

function ColorDots({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      {ORDER.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={c}
          className="w-5 h-5 rounded-full transition-transform hover:scale-110"
          style={{ backgroundColor: COLORS[c].bg, boxShadow: value === c ? `0 0 0 2px ${COLORS[c].ring}` : 'none' }}
        />
      ))}
    </div>
  );
}

// A note is 248px wide and the footer already carries five colour dots, so the
// two word buttons wrapped onto a second line and pushed the paper apart. Round
// icon buttons: discard is a ×, keeping it is a ✓, both labelled for screen
// readers and on hover.
function DiscardButton({ onClick, label = 'Discard' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="w-7 h-7 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/10 transition"
    >
      <XIcon className="w-4 h-4" strokeWidth={2.5} />
    </button>
  );
}

// Note actions sit quietly under the author line and only come forward on
// hover. Delete warms to red on hover so the destructive one is distinguishable
// before it is pressed, not only after.
function NoteAction({ onClick, label, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`w-6 h-6 rounded-full flex items-center justify-center opacity-50 transition hover:opacity-100 ${
        danger ? 'hover:bg-red-500 hover:text-white' : 'hover:bg-black/10'
      }`}
    >
      {children}
    </button>
  );
}

function ConfirmButton({ onClick, disabled, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="w-7 h-7 rounded-full flex items-center justify-center bg-black/10 hover:bg-black/20 disabled:opacity-40 disabled:hover:bg-black/10 transition"
    >
      <CheckIcon className="w-4 h-4" strokeWidth={2.5} />
    </button>
  );
}

function NoteCard({
  note,
  canManage,
  canReorder = true,
  onSaved,
  onDeleted,
  board,
  onDragToSlot,
  onDropped,
  onMoveLane,
}) {
  const c = COLORS[note.color] || COLORS.yellow;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [color, setColor] = useState(note.color);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const lane = LANE_INDEX[note.status] ?? 0;

  // Motion values, not state: a drag writes to them every frame and state would
  // re-render the whole board on each one.
  const x = useMotionValue(board ? board.x : 0);
  const y = useMotionValue(board ? board.y : 0);
  const settled = useRef(false);

  // Slide to the slot this note now owns: when the order changes around it,
  // when the board reflows to a new lane width, and when a drag is released.
  useEffect(() => {
    if (!board || dragging) return;
    if (!settled.current) {
      // First paint should not animate in from the top-left corner.
      x.set(board.x);
      y.set(board.y);
      settled.current = true;
      return;
    }
    const a = animate(x, board.x, SPRING);
    const b = animate(y, board.y, SPRING);
    return () => { a.stop(); b.stop(); };
  }, [board?.x, board?.y, dragging]);

  // Dragging is off while editing so selecting text inside a note doesn't drag
  // the paper out from under the cursor.
  const canDrag = !!board && !editing && canReorder;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      drag={canDrag}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={board ? { left: 0, top: 0, right: board.maxX, bottom: board.maxY } : undefined}
      onDragStart={() => setDragging(true)}
      onDrag={() => board && onDragToSlot(note.id, x.get(), y.get())}
      onDragEnd={() => { setDragging(false); onDropped(); }}
      whileDrag={{ scale: 1.04 }}
      className={`rounded-xl p-3.5 flex flex-col overflow-hidden ${
        board ? 'absolute left-0 top-0' : 'relative w-full'
      } ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
      style={{
        // While editing, the paper previews the colour being picked — text as
        // well as background, or a light note keeps the old dark palette's ink.
        backgroundColor: editing ? COLORS[color].bg : c.bg,
        color: editing ? COLORS[color].text : c.text,
        width: board ? board.w : undefined,
        height: NOTE_H,
        x: board ? x : undefined,
        y: board ? y : undefined,
        zIndex: dragging ? 30 : 1,
        // Finished work stays legible but stops competing with the work that
        // isn't. The paper fades, not the text on it.
        opacity: note.status === 'done' && !editing ? 0.72 : 1,
        // Tinted rather than black so the shadow belongs to the paper. It lifts
        // while the note is in hand.
        boxShadow: dragging
          ? '0 18px 38px rgba(15, 20, 40, 0.28)'
          : '0 2px 6px rgba(15, 20, 40, 0.12)',
        touchAction: canDrag ? 'none' : undefined,
      }}
    >
      {editing ? (
        <>
          {/* The editor scrolls its own body, so no wrapper scroller: two nested
              scrollers in a 200px note left a stub of a text area with a
              scrollbar down the middle of it. */}
          <div className="flex-1 min-h-0">
            <LazyMarkdownEditor
              variant="bare"
              value={draft}
              onChange={setDraft}
              placeholder="Jot something down…"
            />
          </div>
          <div className="flex items-center justify-between mt-2 pt-2 border-t gap-2 flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <ColorDots value={color} onChange={setColor} />
            <div className="flex items-center gap-1 flex-shrink-0">
              <DiscardButton onClick={() => { setEditing(false); setDraft(note.body); setColor(note.color); }} />
              <ConfirmButton
                label="Save note"
                disabled={busy || !draft.trim()}
                onClick={async () => {
                  if (!draft.trim()) return;
                  setBusy(true);
                  try {
                    const updated = await api.patch(`/director-notes/${note.id}`, { body: draft, color });
                    onSaved(updated);
                    setEditing(false);
                  } catch { /* ignore */ } finally { setBusy(false); }
                }}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="font-ninja text-sm break-words flex-1 min-h-0 overflow-y-auto pr-0.5">
            <ReactMarkdown components={STICKY_MD} urlTransform={mdUrl}>{note.body}</ReactMarkdown>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <span className="font-ninja text-[11px] font-semibold opacity-80 truncate">
              {note.status === 'done' && note.completed_at
                ? `Done ${doneOn(note.completed_at)}`
                : note.created_by_name || 'Unknown'}
            </span>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {/* Without a board there is no dragging, so the lane arrows are
                  how a note moves along. They are on the card in both modes:
                  on a phone they are the only way, and on a desk they beat
                  dragging for a single step. */}
              {canReorder && !confirmDel && (
                <>
                  {lane > 0 && (
                    <NoteAction onClick={() => onMoveLane(note, -1)} label={`Move to ${LANES[lane - 1].label}`}>
                      <ChevronLeftIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
                    </NoteAction>
                  )}
                  {lane < LANES.length - 1 && (
                    <NoteAction onClick={() => onMoveLane(note, 1)} label={`Move to ${LANES[lane + 1].label}`}>
                      <ChevronRightIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
                    </NoteAction>
                  )}
                </>
              )}
              {canManage && (
                // The confirm keeps its word. Icons are fine for reversible
                // actions; a destructive one should never rest on the reader
                // recognising a glyph.
                confirmDel ? (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={async () => {
                        setBusy(true);
                        try {
                          await api.delete(`/director-notes/${note.id}`);
                          onDeleted(note.id);
                        } catch { setBusy(false); setConfirmDel(false); }
                      }}
                      disabled={busy}
                      className="font-ninja text-[11px] font-bold px-2 py-1 rounded-full bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition"
                    >
                      Delete
                    </button>
                    <DiscardButton onClick={() => setConfirmDel(false)} label="Keep note" />
                  </div>
                ) : (
                  <>
                    <NoteAction onClick={() => setEditing(true)} label="Edit note">
                      <PencilIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
                    </NoteAction>
                    <NoteAction onClick={() => setConfirmDel(true)} label="Delete note" danger>
                      <Trash2Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
                    </NoteAction>
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

function LaneHeading({ lane, count, id }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <h3 id={id} className="font-ninja text-sm font-bold text-ninja-navy">{lane.label}</h3>
      <span className="font-ninja text-xs text-ninja-muted tabular-nums">{count}</span>
    </div>
  );
}

export default function DirectorStickyNotes() {
  // isReadOnly: a director viewing a center they aren't assigned to. The server
  // refuses every write here (all of /director-notes is requireOwnLocation), so
  // without this the board would offer add/edit/delete/drag that only 403.
  const { user, isReadOnly } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [color, setColor] = useState('yellow');
  const [busy, setBusy] = useState(false);
  const [boardW, setBoardW] = useState(0);
  const boardRef = useRef(null);

  // Slot maths needs a measured canvas: the lane width, the drag limits and the
  // board height all come off the real pixel width.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    setBoardW(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setBoardW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
    // The container only exists once there is something to show, so re-run when
    // the board appears — otherwise pinning the first note leaves it unmeasured.
  }, [loading, notes.length === 0]);

  useEffect(() => {
    let alive = true;
    api.get('/director-notes')
      .then((data) => { if (alive) { setNotes(data || []); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  const canManage = (note) => !isReadOnly && (note.created_by === user?.id || user?.role === 'admin');

  const lanes = useMemo(() => split(notes), [notes]);

  const boardOn = boardW >= BOARD_MIN_W;

  const layout = useMemo(() => {
    if (!boardOn) return null;
    // Lanes share the width rather than sitting at a fixed 248 with dead space
    // to the right of them, so the board fills the wall it is given.
    const laneW = Math.floor((boardW - (LANES.length - 1) * GAP) / LANES.length);
    const rows = Math.max(1, ...LANES.map((l) => lanes[l.key].length));
    return {
      laneW,
      // Exactly the rows in use. No spare space at the bottom: there is nowhere
      // to drop a note that isn't already a slot.
      height: rows * (NOTE_H + GAP) - GAP,
      maxX: (LANES.length - 1) * (laneW + GAP),
      maxY: Math.max(0, (rows - 1) * (NOTE_H + GAP)),
    };
  }, [lanes, boardW, boardOn]);

  // Live reorder while a note is held: the others slide out of the way so the
  // gap under the cursor is always the slot it will land in, whichever lane
  // that turns out to be.
  const dragToSlot = useCallback((id, x, y) => {
    setNotes((prev) => {
      const laneW = Math.floor((boardW - (LANES.length - 1) * GAP) / LANES.length);
      const moving = prev.find((n) => n.id === id);
      if (!moving) return prev;

      const status = LANES[laneAt(x, laneW)].key;
      const rest = split(prev, id);
      const row = rowAt(y, rest[status].length);

      // Already where it would land: bail before rebuilding, or every frame of
      // a stationary drag would hand React a brand new array.
      if (moving.status === status) {
        const current = prev.filter((n) => n.status === status).findIndex((n) => n.id === id);
        if (current === row) return prev;
      }

      rest[status].splice(row, 0, moving.status === status ? moving : { ...moving, status });
      return flatten(rest);
    });
  }, [boardW]);

  // Persist on release, not on every slot change during the drag. Lane and
  // position go up together: a note changing lane and a note changing place in
  // its lane are the same move as far as the board is concerned.
  const persistOrder = useCallback(() => {
    setNotes((current) => {
      const grouped = split(current);
      api.patch('/director-notes/reorder', {
        lanes: LANES.map((l) => ({ status: l.key, ids: grouped[l.key].map((n) => n.id) })),
      }).catch(() => { /* arrangement is corrected on next load */ });
      return current;
    });
  }, []);

  // One step along, from the card. Optimistic: the note lands in the next lane
  // and the arrangement is corrected on the next load if the write fails.
  const moveLane = useCallback((note, delta) => {
    const target = LANES[clamp((LANE_INDEX[note.status] ?? 0) + delta, 0, LANES.length - 1)].key;
    if (target === note.status) return;
    setNotes((prev) => {
      const rest = split(prev, note.id);
      rest[target].unshift({
        ...note,
        status: target,
        // The server stamps the real value; this is so the card doesn't sit in
        // Done with no date on it until the next fetch.
        completed_at: target === 'done' ? (note.completed_at ?? new Date().toISOString()) : null,
      });
      const next = flatten(rest);
      api.patch('/director-notes/reorder', {
        lanes: LANES.map((l) => ({
          status: l.key,
          ids: next.filter((n) => n.status === l.key).map((n) => n.id),
        })),
      }).catch(() => { /* arrangement is corrected on next load */ });
      return next;
    });
  }, []);

  const add = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const created = await api.post('/director-notes', { body: draft, color });
      setNotes((prev) => [created, ...prev]);
      setDraft(''); setColor('yellow'); setAdding(false);
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  return (
    <section aria-labelledby="sticky-heading">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 id="sticky-heading" className="font-ninja font-bold text-ninja-navy text-lg">Notes</h2>
          <p className="font-ninja text-xs text-ninja-muted text-pretty">
            Reminders, and the work this center is carrying. Move a note along as it gets picked up and finished.
            Every director here sees the same board.
          </p>
        </div>
        {!adding && !isReadOnly && (
          // One glyph beside the heading rather than a blue word: the heading is
          // what names the section, and the plus is the same shape as the one on
          // the empty board, so both entry points read as the same action.
          <button
            type="button"
            onClick={() => setAdding(true)}
            title="Add note"
            aria-label="Add note"
            className="flex-shrink-0 w-9 h-9 rounded-full border border-ninja-border text-ninja-muted flex items-center justify-center transition-colors hover:border-ninja-blue/60 hover:text-ninja-blue"
          >
            <PlusIcon className="w-4 h-4" strokeWidth={2.5} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3"
          >
            {/* Same paper as a pinned note, so what you type looks like what
                lands on the board. New notes start in To do. */}
            <div className="rounded-xl p-3.5 shadow-sm sm:w-[248px] flex flex-col" style={{ backgroundColor: COLORS[color].bg, color: COLORS[color].text, height: NOTE_H }}>
              <div className="flex-1 min-h-0">
                <LazyMarkdownEditor
                  variant="bare"
                  value={draft}
                  onChange={setDraft}
                  placeholder="Jot something down…"
                />
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t gap-2 flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
                <ColorDots value={color} onChange={setColor} />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <DiscardButton onClick={() => { setAdding(false); setDraft(''); }} />
                  <ConfirmButton label="Pin note" disabled={busy || !draft.trim()} onClick={add} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading notes">
          {LANES.map((l) => (
            <div key={l.key} className="animate-pulse rounded-xl bg-ninja-bg" style={{ height: NOTE_H }} />
          ))}
        </div>
      ) : notes.length === 0 && isReadOnly ? (
        // Nothing to pin here, and no invitation to try.
        <p className="font-ninja text-sm text-ninja-muted">No notes at this center.</p>
      ) : notes.length === 0 && !adding ? (
        // Shaped like the note it will become, so the empty board already shows
        // you the size of the thing you are about to pin.
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{ height: NOTE_H }}
          className="group w-full sm:w-[248px] rounded-xl border border-dashed border-ninja-border p-3.5 flex flex-col items-start justify-center text-left transition-colors hover:border-ninja-blue/60"
        >
          <span className="w-9 h-9 rounded-full border border-dashed border-ninja-border group-hover:border-ninja-blue/60 flex items-center justify-center text-ninja-muted group-hover:text-ninja-blue transition-colors">
            <PlusIcon className="w-4 h-4" />
          </span>
          <span className="block font-ninja text-sm font-bold text-ninja-navy mt-3">Pin the first note</span>
          <span className="block font-ninja text-xs text-ninja-muted mt-1 text-pretty">
            A reminder, or something this center needs to get done. Everyone here sees the same board.
          </span>
        </button>
      ) : (
        <div ref={boardRef}>
          {layout ? (
            <>
              {/* Headings sit above the drag canvas rather than inside it: a
                  heading in the canvas is one more thing the slot maths would
                  have to reason about. */}
              <div className="flex gap-4 mb-2" aria-hidden="true">
                {LANES.map((l) => (
                  <div key={l.key} style={{ width: layout.laneW }}>
                    <LaneHeading lane={l} count={lanes[l.key].length} />
                  </div>
                ))}
              </div>
              <div className="relative" style={{ height: layout.height }}>
                {/* Empty lanes still need to look like somewhere a note can be
                    dropped, so each keeps an outline in its first slot. */}
                {LANES.map((l, i) => (
                  lanes[l.key].length === 0 ? (
                    <div
                      key={`empty-${l.key}`}
                      className="absolute rounded-xl border border-dashed border-ninja-border pointer-events-none"
                      style={{ ...slotFor(i, 0, layout.laneW), width: layout.laneW, height: NOTE_H }}
                    />
                  ) : null
                ))}
                <AnimatePresence>
                  {/* flatMap, not nested maps: AnimatePresence wants its
                      children in one flat keyed list to track exits. */}
                  {LANES.flatMap((l, laneIdx) =>
                    lanes[l.key].map((note, row) => (
                      <NoteCard
                        key={note.id}
                        note={note}
                        canManage={canManage(note)}
                        // Moving stays deliberately NOT author-gated (the
                        // arrangement is shared), so it can't ride on
                        // canManage — but it is still a write, so it goes away
                        // when the center isn't ours.
                        canReorder={!isReadOnly}
                        board={{
                          ...slotFor(laneIdx, row, layout.laneW),
                          w: layout.laneW,
                          maxX: layout.maxX,
                          maxY: layout.maxY,
                        }}
                        onDragToSlot={dragToSlot}
                        onDropped={persistOrder}
                        onMoveLane={moveLane}
                        onSaved={(u) => setNotes((prev) => prev.map((n) => (n.id === u.id ? { ...n, ...u } : n)))}
                        onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
                      />
                    )),
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            // Narrow: the lanes become three stacked lists. Same data, same
            // cards, no drag.
            <div className="space-y-6">
              {LANES.map((l) => (
                <section key={l.key} aria-labelledby={`lane-${l.key}`}>
                  <div className="mb-2">
                    <LaneHeading lane={l} count={lanes[l.key].length} id={`lane-${l.key}`} />
                  </div>
                  {lanes[l.key].length === 0 ? (
                    <p className="font-ninja text-sm text-ninja-muted border border-dashed border-ninja-border rounded-xl px-3.5 py-5 text-center">
                      Nothing here.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                      <AnimatePresence>
                        {lanes[l.key].map((note) => (
                          <NoteCard
                            key={note.id}
                            note={note}
                            canManage={canManage(note)}
                            canReorder={!isReadOnly}
                            board={null}
                            onDragToSlot={() => {}}
                            onDropped={() => {}}
                            onMoveLane={moveLane}
                            onSaved={(u) => setNotes((prev) => prev.map((n) => (n.id === u.id ? { ...n, ...u } : n)))}
                            onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
