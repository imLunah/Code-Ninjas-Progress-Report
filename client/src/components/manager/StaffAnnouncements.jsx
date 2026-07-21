import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/dateUtils';

// CD-authored announcements to staff. Center-scoped; shown to all staff at the
// location via the app-wide banner (Layout). This panel is the authoring surface.
export default function StaffAnnouncements() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [until, setUntil] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get('/announcements')
      .then((data) => { if (alive) { setItems(data || []); setLoading(false); } })
      .catch(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [user?.activeLocation?.id]);

  const add = async () => {
    if (!title.trim() || !message.trim()) return;
    setBusy(true);
    try {
      const created = await api.post('/announcements', {
        title, message, visible_until: until || null,
      });
      setItems((prev) => [{ ...created, created_by_name: user?.displayName }, ...prev]);
      setTitle(''); setMessage(''); setUntil(''); setAdding(false);
    } catch { /* ignore */ } finally { setBusy(false); }
  };

  const del = async (id) => {
    setBusy(true);
    try {
      await api.delete(`/announcements/${id}`);
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ } finally { setBusy(false); setConfirmId(null); }
  };

  return (
    <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-ninja font-bold text-ninja-navy text-lg">Announcements</h2>
          <p className="font-ninja text-xs text-ninja-muted">Posted to all staff at this center</p>
        </div>
        {!adding && (
          <button onClick={() => setAdding(true)} className="font-ninja text-sm font-bold text-ninja-blue hover:underline">+ New</button>
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
            <div className="bg-ninja-bg border border-ninja-border rounded-xl p-3.5 space-y-2.5">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                autoFocus
                placeholder="Title"
                className="w-full bg-white border border-ninja-border rounded-lg px-3 py-2 font-ninja text-sm text-ninja-navy focus:outline-none focus:border-ninja-blue"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="What do staff need to know?"
                className="w-full bg-white border border-ninja-border rounded-lg px-3 py-2 font-ninja text-sm text-ninja-navy resize-none focus:outline-none focus:border-ninja-blue"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="font-ninja text-xs text-ninja-muted flex items-center gap-2">
                  Hide after
                  <input
                    type="date"
                    value={until}
                    onChange={(e) => setUntil(e.target.value)}
                    className="bg-white border border-ninja-border rounded-lg px-2 py-1 font-ninja text-xs text-ninja-navy focus:outline-none focus:border-ninja-blue"
                  />
                </label>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { setAdding(false); setTitle(''); setMessage(''); setUntil(''); }} className="font-ninja text-xs font-bold text-ninja-muted hover:text-ninja-navy px-2 py-1">Cancel</button>
                  <button onClick={add} disabled={busy || !title.trim() || !message.trim()} className="font-ninja text-xs font-bold px-3 py-1.5 rounded-lg bg-ninja-blue text-white hover:bg-ninja-blue/90 disabled:opacity-50">Post</button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <p className="text-ninja-muted font-ninja text-sm py-4">Loading…</p>
      ) : items.length === 0 && !adding ? (
        <p className="text-ninja-muted font-ninja text-sm py-6 text-center">No announcements right now.</p>
      ) : (
        <div className="divide-y divide-ninja-border">
          <AnimatePresence>
            {items.map((a) => (
              <motion.div
                key={a.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-3 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-ninja font-bold text-ninja-navy text-sm">{a.title}</p>
                  <p className="font-ninja text-sm text-ninja-navy/80 mt-0.5 whitespace-pre-wrap break-words">{a.message}</p>
                  <p className="font-ninja text-[11px] text-ninja-muted mt-1">
                    {a.created_by_name || 'Unknown'}
                    {a.visible_until ? ` · until ${formatDate(a.visible_until)}` : ''}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {confirmId === a.id ? (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => del(a.id)} disabled={busy} className="font-ninja text-[11px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white">Delete</button>
                      <button onClick={() => setConfirmId(null)} className="font-ninja text-[11px] font-bold text-ninja-muted">Keep</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(a.id)} className="font-ninja text-[11px] font-bold text-ninja-muted hover:text-ninja-red">Delete</button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
