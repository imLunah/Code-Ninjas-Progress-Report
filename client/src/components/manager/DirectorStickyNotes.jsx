import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import LazyMarkdownEditor from '../shared/LazyMarkdownEditor';
import { PlusIcon } from 'lucide-react';

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

// The notes used to live inside a white panel, so the page showed paper resting
// on a card resting on the page. The paper is the surface; the section is just a
// heading and a board.

// Every note is the same piece of paper. Long text scrolls inside it rather than
// stretching the note, so the board stays an even wall instead of a ragged one.
const NOTE_W = 248;
const NOTE_H = 200;
const GAP = 16;

// Below lg the notes flow in a plain grid and dragging is off. Slot maths needs
// a stable canvas width, and a drag surface on a phone fights both page scroll
// and the app's own swipe navigation.
const GRID = 'grid grid-cols-1 sm:grid-cols-2 gap-4 items-start';

const SPRING = { type: 'spring', stiffness: 520, damping: 42, mass: 0.7 };

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

// Notes occupy slots, never free coordinates: a note is always in exactly one
// cell of the grid, so two can't end up stacked on each other and the board is
// never taller than the rows it holds.
const slotFor = (index, cols) => ({
  x: (index % cols) * (NOTE_W + GAP),
  y: Math.floor(index / cols) * (NOTE_H + GAP),
});

// Which slot is the dragged note sitting over. Pure maths against the grid, not
// a hit-test against sibling rects, which would read positions mid-animation
// and make the order flicker while the others are still sliding.
function slotAt(x, y, cols, count) {
  const col = clamp(Math.round(x / (NOTE_W + GAP)), 0, cols - 1);
  const row = Math.max(0, Math.round(y / (NOTE_H + GAP)));
  return clamp(row * cols + col, 0, count - 1);
}


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

function NoteCard({ note, canManage, onSaved, onDeleted, board, onDragToSlot, onDropped }) {
  const c = COLORS[note.color] || COLORS.yellow;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [color, setColor] = useState(note.color);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Motion values, not state: a drag writes to them every frame and state would
  // re-render the whole board on each one.
  const x = useMotionValue(board ? board.x : 0);
  const y = useMotionValue(board ? board.y : 0);
  const settled = useRef(false);

  // Slide to the slot this note now owns: when the order changes around it,
  // when the board reflows to a new column count, and when a drag is released.
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
  const canDrag = !!board && !editing;

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
        backgroundColor: editing ? COLORS[color].bg : c.bg,
        color: c.text,
        width: board ? NOTE_W : undefined,
        height: NOTE_H,
        x: board ? x : undefined,
        y: board ? y : undefined,
        zIndex: dragging ? 30 : 1,
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
          <div className="flex-1 min-h-0 overflow-y-auto">
            <LazyMarkdownEditor
              value={draft}
              onChange={setDraft}
              placeholder="Jot something down… **bold**, or '- ' for a list"
            />
          </div>
          <div className="flex items-center justify-between mt-2 gap-2 flex-shrink-0">
            <ColorDots value={color} onChange={setColor} />
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setEditing(false); setDraft(note.body); setColor(note.color); }} className="font-ninja text-xs font-bold opacity-70 hover:opacity-100 px-2 py-1">Cancel</button>
              <button
                onClick={async () => {
                  if (!draft.trim()) return;
                  setBusy(true);
                  try {
                    const updated = await api.patch(`/director-notes/${note.id}`, { body: draft, color });
                    onSaved(updated);
                    setEditing(false);
                  } catch { /* ignore */ } finally { setBusy(false); }
                }}
                disabled={busy || !draft.trim()}
                className="font-ninja text-xs font-bold px-2.5 py-1 rounded-md bg-black/10 hover:bg-black/20 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="font-ninja text-sm break-words flex-1 min-h-0 overflow-y-auto pr-0.5">
            <ReactMarkdown components={STICKY_MD} urlTransform={mdUrl}>{note.body}</ReactMarkdown>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <span className="font-ninja text-[11px] font-semibold opacity-70 truncate">{note.created_by_name || 'Unknown'}</span>
            {canManage && (
              confirmDel ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await api.delete(`/director-notes/${note.id}`);
                        onDeleted(note.id);
                      } catch { setBusy(false); setConfirmDel(false); }
                    }}
                    disabled={busy}
                    className="font-ninja text-[11px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white"
                  >
                    Delete
                  </button>
                  <button onClick={() => setConfirmDel(false)} className="font-ninja text-[11px] font-bold opacity-70">Keep</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setEditing(true)} className="font-ninja text-[11px] font-bold opacity-70 hover:opacity-100 rounded">Edit</button>
                  <button onClick={() => setConfirmDel(true)} className="font-ninja text-[11px] font-bold opacity-70 hover:opacity-100 rounded">Delete</button>
                </div>
              )
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function DirectorStickyNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [color, setColor] = useState('yellow');
  const [busy, setBusy] = useState(false);
  const [boardW, setBoardW] = useState(0);
  const boardRef = useRef(null);

  // Slot maths needs a measured canvas: the column count, the drag limits and
  // the board height all come off the real pixel width.
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    setBoardW(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setBoardW(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
    // The container only exists once there is at least one note, so re-run when
    // the board appears — otherwise pinning the first note leaves it unmeasured.
  }, [loading, notes.length === 0]);

  useEffect(() => {
    let alive = true;
    api.get('/director-notes')
      .then((data) => { if (alive) { setNotes(data || []); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  const canManage = (note) => note.created_by === user?.id || user?.role === 'admin';

  // Two notes side by side is the least that can be rearranged.
  const boardOn = boardW >= NOTE_W * 2 + GAP;

  const layout = useMemo(() => {
    if (!boardOn || notes.length === 0) return null;
    const cols = Math.max(1, Math.floor((boardW + GAP) / (NOTE_W + GAP)));
    const rows = Math.ceil(notes.length / cols);
    return {
      cols,
      // Exactly the rows in use. No spare space at the bottom: there is nowhere
      // to drop a note that isn't already a slot.
      height: rows * (NOTE_H + GAP) - GAP,
      maxX: Math.max(0, boardW - NOTE_W),
      maxY: Math.max(0, (rows - 1) * (NOTE_H + GAP)),
    };
  }, [notes.length, boardW, boardOn]);

  // Live reorder while a note is held: the others slide out of the way so the
  // gap under the cursor is always the slot it will land in.
  const dragToSlot = useCallback((id, x, y) => {
    setNotes((prev) => {
      const cols = Math.max(1, Math.floor((boardW + GAP) / (NOTE_W + GAP)));
      const from = prev.findIndex((n) => n.id === id);
      const to = slotAt(x, y, cols, prev.length);
      if (from === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, [boardW]);

  // Persist on release, not on every slot change during the drag.
  const persistOrder = useCallback(() => {
    setNotes((current) => {
      api.patch('/director-notes/reorder', { ids: current.map((n) => n.id) })
        .catch(() => { /* arrangement is corrected on next load */ });
      return current;
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
          <p className="font-ninja text-xs text-ninja-muted">Shared with the directors at this center</p>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="flex-shrink-0 font-ninja text-sm font-bold text-ninja-blue hover:underline underline-offset-4 rounded">Add note</button>
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
            <div className="rounded-xl p-3.5 shadow-sm sm:max-w-md" style={{ backgroundColor: COLORS[color].bg, color: COLORS[color].text }}>
              <LazyMarkdownEditor
                value={draft}
                onChange={setDraft}
                placeholder="Jot something down… **bold**, or '- ' for a list"
              />
              <div className="flex items-center justify-between mt-2 gap-2">
                <ColorDots value={color} onChange={setColor} />
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { setAdding(false); setDraft(''); }} className="font-ninja text-xs font-bold opacity-70 hover:opacity-100 px-2 py-1">Cancel</button>
                  <button onClick={add} disabled={busy || !draft.trim()} className="font-ninja text-xs font-bold px-2.5 py-1 rounded-md bg-black/10 hover:bg-black/20 disabled:opacity-50">Pin note</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className={GRID} aria-busy="true" aria-label="Loading notes">
          {[0, 1].map((i) => (
            <div key={i} className="animate-pulse rounded-xl bg-ninja-bg" style={{ height: NOTE_H }} />
          ))}
        </div>
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
            For yourself, or for the other directors here. Everyone at this center sees the same board.
          </span>
        </button>
      ) : (
        <div
          ref={boardRef}
          className={layout ? 'relative' : GRID}
          style={layout ? { height: layout.height } : undefined}
        >
          <AnimatePresence>
            {notes.map((note, i) => (
              <NoteCard
                key={note.id}
                note={note}
                canManage={canManage(note)}
                board={layout ? { ...slotFor(i, layout.cols), maxX: layout.maxX, maxY: layout.maxY } : null}
                onDragToSlot={dragToSlot}
                onDropped={persistOrder}
                onSaved={(u) => setNotes((prev) => prev.map((n) => (n.id === u.id ? { ...n, ...u } : n)))}
                onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}
