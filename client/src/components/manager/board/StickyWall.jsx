import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { PlusIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { api } from '../../../api/client';
import LazyMarkdownEditor from '../../shared/LazyMarkdownEditor';
import {
  GAP, SPRING, clamp, MD, mdUrl,
  IconButton, DiscardButton, ConfirmButton,
} from './boardShared';

// The wall: paper in whatever order you put it in. No stages, no fields, no
// structure beyond where you pinned it. That is the whole point of it, and why
// it survived the task board rather than being replaced by it.

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

// Every note is the same piece of paper. Long text scrolls inside it rather
// than stretching the note, so the wall stays even instead of ragged.
const NOTE_W = 248;
const NOTE_H = 200;

// Two notes side by side is the least that can be rearranged. Below it the
// notes flow in a plain grid and dragging is off: slot maths needs a stable
// canvas width, and a drag surface on a phone fights both page scroll and the
// app's own swipe navigation.
export const WALL_MIN_W = NOTE_W * 2 + GAP;

const GRID = 'grid grid-cols-1 sm:grid-cols-2 gap-4 items-start';

// Notes occupy slots, never free coordinates: a note is always in exactly one
// cell, so two can't end up stacked and the wall is never taller than its rows.
const slotFor = (index, cols) => ({
  x: (index % cols) * (NOTE_W + GAP),
  y: Math.floor(index / cols) * (NOTE_H + GAP),
});

// Which slot is the dragged note over. Pure maths against the grid, not a
// hit-test against sibling rects, which would read positions mid-animation and
// make the order flicker while the others are still sliding.
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

function StickyEditor({ draft, setDraft, color, setColor, busy, onCancel, onSave, saveLabel }) {
  return (
    <>
      {/* The editor scrolls its own body, so no wrapper scroller: two nested
          scrollers in a 200px note left a stub of a text area with a scrollbar
          down the middle of it. */}
      <div className="flex-1 min-h-0">
        <LazyMarkdownEditor variant="bare" value={draft} onChange={setDraft} placeholder="Jot something down…" />
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t gap-2 flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
        <ColorDots value={color} onChange={setColor} />
        <div className="flex items-center gap-1 flex-shrink-0">
          <DiscardButton onClick={onCancel} />
          <ConfirmButton label={saveLabel} disabled={busy || !draft.trim()} onClick={onSave} />
        </div>
      </div>
    </>
  );
}

function StickyNote({ note, canManage, canReorder, onSaved, onDeleted, board, onDragToSlot, onDropped }) {
  const c = COLORS[note.color] || COLORS.yellow;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body || '');
  const [color, setColor] = useState(note.color);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  // Motion values, not state: a drag writes to them every frame and state would
  // re-render the whole wall on each one.
  const x = useMotionValue(board ? board.x : 0);
  const y = useMotionValue(board ? board.y : 0);
  const settled = useRef(false);

  useEffect(() => {
    if (!board || dragging) return;
    if (!settled.current) {
      // First paint should not animate in from the top-left corner.
      x.set(board.x); y.set(board.y);
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
        // well as background, or a light note keeps the old palette's ink.
        backgroundColor: editing ? COLORS[color].bg : c.bg,
        color: editing ? COLORS[color].text : c.text,
        width: board ? NOTE_W : undefined,
        height: NOTE_H,
        x: board ? x : undefined,
        y: board ? y : undefined,
        zIndex: dragging ? 30 : 1,
        boxShadow: dragging
          ? '0 18px 38px rgba(15, 20, 40, 0.28)'
          : '0 2px 6px rgba(15, 20, 40, 0.12)',
        touchAction: canDrag ? 'none' : undefined,
      }}
    >
      {editing ? (
        <StickyEditor
          draft={draft} setDraft={setDraft}
          color={color} setColor={setColor}
          busy={busy}
          saveLabel="Save note"
          onCancel={() => { setEditing(false); setDraft(note.body || ''); setColor(note.color); }}
          onSave={async () => {
            if (!draft.trim()) return;
            setBusy(true);
            try {
              const updated = await api.patch(`/director-notes/${note.id}`, { body: draft, color });
              onSaved(updated);
              setEditing(false);
            } catch { /* ignore */ } finally { setBusy(false); }
          }}
        />
      ) : (
        <>
          <div className="font-ninja text-sm break-words flex-1 min-h-0 overflow-y-auto pr-0.5">
            <ReactMarkdown components={MD} urlTransform={mdUrl}>{note.body || ''}</ReactMarkdown>
          </div>
          <div className="flex items-center justify-between mt-3 pt-2 border-t flex-shrink-0" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <span className="font-ninja text-[11px] font-semibold opacity-80 truncate">{note.created_by_name || 'Unknown'}</span>
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
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <IconButton subtle onClick={() => setEditing(true)} label="Edit note">
                    <PencilIcon className="w-3.5 h-3.5" strokeWidth={2.25} />
                  </IconButton>
                  <IconButton subtle danger onClick={() => setConfirmDel(true)} label="Delete note">
                    <Trash2Icon className="w-3.5 h-3.5" strokeWidth={2.25} />
                  </IconButton>
                </div>
              )
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

export default function StickyWall({ notes, width, isReadOnly, canManage, onSaved, onDeleted, onArrange }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const [color, setColor] = useState('yellow');
  const [busy, setBusy] = useState(false);

  const boardOn = width >= WALL_MIN_W;

  const layout = useMemo(() => {
    if (!boardOn || notes.length === 0) return null;
    const cols = Math.max(1, Math.floor((width + GAP) / (NOTE_W + GAP)));
    const rows = Math.ceil(notes.length / cols);
    return {
      cols,
      // Exactly the rows in use. No spare space at the bottom: there is nowhere
      // to drop a note that isn't already a slot.
      height: rows * (NOTE_H + GAP) - GAP,
      maxX: Math.max(0, width - NOTE_W),
      maxY: Math.max(0, (rows - 1) * (NOTE_H + GAP)),
    };
  }, [notes.length, width, boardOn]);

  // Live reorder while a note is held: the others slide out of the way so the
  // gap under the cursor is always the slot it will land in.
  const dragToSlot = useCallback((id, x, y) => {
    onArrange((prev) => {
      const cols = Math.max(1, Math.floor((width + GAP) / (NOTE_W + GAP)));
      const from = prev.findIndex((n) => n.id === id);
      const to = slotAt(x, y, cols, prev.length);
      if (from === -1 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, [width, onArrange]);

  // Persist on release, not on every slot change during the drag. One group and
  // no lane: the wall has no stages, and sending one would quietly give every
  // sticky on it a stage it doesn't have.
  const persistOrder = useCallback(() => {
    onArrange((current) => {
      api.patch('/director-notes/reorder', { lanes: [{ ids: current.map((n) => n.id) }] })
        .catch(() => { /* arrangement is corrected on next load */ });
      return current;
    });
  }, [onArrange]);

  const add = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const created = await api.post('/director-notes', { body: draft, color, board: 'notes' });
      onSaved(created, true);
      setDraft(''); setColor('yellow'); setAdding(false);
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  // Same paper as a pinned note, so what you type looks like what lands on the
  // wall.
  const composer = (
    <div
      className="rounded-xl p-3.5 shadow-sm flex flex-col"
      style={{ backgroundColor: COLORS[color].bg, color: COLORS[color].text, width: boardOn ? NOTE_W : undefined, height: NOTE_H }}
    >
      <StickyEditor
        draft={draft} setDraft={setDraft}
        color={color} setColor={setColor}
        busy={busy}
        saveLabel="Pin note"
        onCancel={() => { setAdding(false); setDraft(''); }}
        onSave={add}
      />
    </div>
  );

  if (notes.length === 0) {
    if (adding) return <div className="max-w-[248px]">{composer}</div>;
    return isReadOnly ? (
      // Nothing to pin here, and no invitation to try.
      <p className="font-ninja text-sm text-ninja-muted">No notes at this center.</p>
    ) : (
      // Shaped like the note it will become, so the empty wall already shows you
      // the size of the thing you are about to pin.
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
    );
  }

  return (
    <div className="space-y-4">
      {adding && <div className={boardOn ? '' : 'max-w-[248px]'}>{composer}</div>}

      <div
        className={layout ? 'relative' : GRID}
        style={layout ? { height: layout.height } : undefined}
      >
        <AnimatePresence>
          {notes.map((note, i) => (
            <StickyNote
              key={note.id}
              note={note}
              canManage={canManage(note)}
              // Reordering stays deliberately NOT author-gated (the arrangement
              // is shared), so it can't ride on canManage — but it is still a
              // write, so it goes away when the center isn't ours.
              canReorder={!isReadOnly}
              board={layout ? { ...slotFor(i, layout.cols), maxX: layout.maxX, maxY: layout.maxY } : null}
              onDragToSlot={dragToSlot}
              onDropped={persistOrder}
              onSaved={onSaved}
              onDeleted={onDeleted}
            />
          ))}
        </AnimatePresence>
      </div>

      {!adding && !isReadOnly && (
        // The wall's own entry point rather than a button in the section
        // heading: the heading names two boards now, and an add button up there
        // would have to guess which one you meant.
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="group inline-flex items-center gap-2 font-ninja text-sm font-bold text-ninja-muted hover:text-ninja-navy transition-colors"
        >
          <span className="w-7 h-7 rounded-full border border-dashed border-ninja-border group-hover:border-ninja-blue/60 flex items-center justify-center group-hover:text-ninja-blue transition-colors">
            <PlusIcon className="w-4 h-4" strokeWidth={2.5} />
          </span>
          Pin a note
        </button>
      )}
    </div>
  );
}
