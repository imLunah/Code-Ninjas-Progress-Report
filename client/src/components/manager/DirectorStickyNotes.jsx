import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

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

function NoteCard({ note, canManage, onSaved, onDeleted }) {
  const c = COLORS[note.color] || COLORS.yellow;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.body);
  const [color, setColor] = useState(note.color);
  const [confirmDel, setConfirmDel] = useState(false);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      const updated = await api.patch(`/director-notes/${note.id}`, { body: draft, color });
      onSaved(updated);
      setEditing(false);
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  const del = async () => {
    setBusy(true);
    try {
      await api.delete(`/director-notes/${note.id}`);
      onDeleted(note.id);
    } catch { setBusy(false); setConfirmDel(false); }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="rounded-xl p-3.5 shadow-sm flex flex-col"
      style={{ backgroundColor: editing ? COLORS[color].bg : c.bg, color: c.text }}
    >
      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full bg-white/60 rounded-lg p-2 font-ninja text-sm resize-none focus:outline-none"
            style={{ color: COLORS[color].text }}
          />
          <div className="flex items-center justify-between mt-2 gap-2">
            <ColorDots value={color} onChange={setColor} />
            <div className="flex items-center gap-1.5">
              <button onClick={() => { setEditing(false); setDraft(note.body); setColor(note.color); }} className="font-ninja text-xs font-bold opacity-70 hover:opacity-100 px-2 py-1">Cancel</button>
              <button onClick={save} disabled={busy || !draft.trim()} className="font-ninja text-xs font-bold px-2.5 py-1 rounded-md bg-black/10 hover:bg-black/20 disabled:opacity-50">Save</button>
            </div>
          </div>
        </>
      ) : (
        <>
          <p className="font-ninja text-sm whitespace-pre-wrap break-words flex-1">{note.body}</p>
          <div className="flex items-center justify-between mt-3 pt-2 border-t" style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
            <span className="font-ninja text-[11px] font-semibold opacity-70 truncate">{note.created_by_name || 'Unknown'}</span>
            {canManage && (
              confirmDel ? (
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={del} disabled={busy} className="font-ninja text-[11px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">Delete</button>
                  <button onClick={() => setConfirmDel(false)} className="font-ninja text-[11px] font-bold opacity-70">Keep</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => setEditing(true)} className="font-ninja text-[11px] font-bold opacity-70 hover:opacity-100">Edit</button>
                  <button onClick={() => setConfirmDel(true)} className="font-ninja text-[11px] font-bold opacity-70 hover:opacity-100">Delete</button>
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

  useEffect(() => {
    let alive = true;
    api.get('/director-notes')
      .then((data) => { if (alive) { setNotes(data || []); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  const canManage = (note) => note.created_by === user?.id || user?.role === 'admin';

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
    <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-ninja font-bold text-ninja-navy text-lg">Sticky notes</h2>
          <p className="font-ninja text-xs text-ninja-muted">Shared with Center Directors at this center</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="font-ninja text-sm font-bold text-ninja-blue hover:underline">+ Add note</button>
        )}
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-4"
          >
            <div className="rounded-xl p-3.5 shadow-sm" style={{ backgroundColor: COLORS[color].bg, color: COLORS[color].text }}>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                maxLength={2000}
                autoFocus
                placeholder="Jot something down…"
                className="w-full bg-white/60 rounded-lg p-2 font-ninja text-sm resize-none focus:outline-none placeholder:opacity-50"
                style={{ color: COLORS[color].text }}
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
        <p className="text-ninja-muted font-ninja text-sm py-4">Loading…</p>
      ) : notes.length === 0 && !adding ? (
        <p className="text-ninja-muted font-ninja text-sm py-6 text-center">No notes yet. Add one for you and your fellow directors.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <AnimatePresence>
            {notes.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                canManage={canManage(note)}
                onSaved={(u) => setNotes((prev) => prev.map((n) => (n.id === u.id ? u : n)))}
                onDeleted={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
