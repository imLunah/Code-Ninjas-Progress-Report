import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import Button from '../ui/Button';

function formatDateRange(from, until) {
  const fmt = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  if (!until) return `From ${fmt(from)}`;
  return `${fmt(from)} – ${fmt(until)}`;
}

function isExpired(until) {
  if (!until) return false;
  return new Date(until + 'T00:00:00') < new Date(new Date().toDateString());
}

function AnnouncementForm({ initial, onSave, onCancel }) {
  const today = new Date().toISOString().split('T')[0];
  const [title, setTitle] = useState(initial?.title || '');
  const [message, setMessage] = useState(initial?.message || '');
  const [visibleFrom, setVisibleFrom] = useState(initial?.visible_from?.split('T')[0] || today);
  const [visibleUntil, setVisibleUntil] = useState(initial?.visible_until?.split('T')[0] || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await onSave({ title, message, visible_from: visibleFrom, visible_until: visibleUntil || null });
    } catch (err) {
      setError(err?.message || 'Failed to save');
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-ninja-border rounded-xl p-4 bg-ninja-bg">
      {error && <p className="text-ninja-red font-ninja text-sm">{error}</p>}
      <div>
        <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          required
          autoFocus
          placeholder="e.g. Game Build Day this Saturday!"
          className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
        />
      </div>
      <div>
        <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1">Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          rows={3}
          placeholder="Details for the team..."
          className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue resize-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1">Show from</label>
          <input
            type="date"
            value={visibleFrom}
            onChange={(e) => setVisibleFrom(e.target.value)}
            required
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
          />
        </div>
        <div>
          <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1">Hide after <span className="normal-case font-normal">(optional)</span></label>
          <input
            type="date"
            value={visibleUntil}
            onChange={(e) => setVisibleUntil(e.target.value)}
            min={visibleFrom}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving…' : initial ? 'Save Changes' : 'Post'}</Button>
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

export default function AnnouncementsPanel({ isManager = false }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/announcements')
      .then(setItems)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user?.activeLocation?.id]);

  const handleCreate = async (payload) => {
    const created = await api.post('/announcements', payload);
    setItems((prev) => [created, ...prev]);
    setShowForm(false);
  };

  const handleEdit = async (payload) => {
    const updated = await api.patch(`/announcements/${editingId}`, payload);
    setItems((prev) => prev.map((a) => a.id === editingId ? updated : a));
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    await api.delete(`/announcements/${id}`);
    setItems((prev) => prev.filter((a) => a.id !== id));
    setConfirmDeleteId(null);
  };

  const activeItems = items.filter((a) => !isExpired(a.visible_until?.split('T')[0] || a.visible_until));
  const expiredItems = items.filter((a) => isExpired(a.visible_until?.split('T')[0] || a.visible_until));

  return (
    <div className="bg-white border border-ninja-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold font-ninja text-ninja-navy tracking-wide">
          Announcements
        </h2>
        {isManager && !showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>+ New</Button>
        )}
      </div>

      {showForm && (
        <div className="mb-4">
          <AnnouncementForm onSave={handleCreate} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading && <p className="text-ninja-muted font-ninja text-sm text-center py-4">Loading…</p>}

      {!loading && activeItems.length === 0 && !showForm && (
        <p className="text-ninja-muted font-ninja text-sm italic text-center py-4">No current announcements.</p>
      )}

      {!loading && activeItems.length > 0 && (
        <div className="space-y-3">
          {activeItems.map((a) => (
            <div key={a.id} className="border border-ninja-border rounded-xl p-4">
              {editingId === a.id ? (
                <AnnouncementForm initial={a} onSave={handleEdit} onCancel={() => setEditingId(null)} />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="font-ninja font-bold text-ninja-navy text-sm leading-snug">{a.title}</p>
                    <span className="text-[10px] font-ninja font-semibold px-2 py-0.5 rounded-full bg-ninja-blue/10 text-ninja-blue flex-shrink-0">
                      {formatDateRange(a.visible_from?.split('T')[0] || a.visible_from, a.visible_until?.split('T')[0] || a.visible_until)}
                    </span>
                  </div>
                  <p className="text-ninja-muted font-ninja text-sm leading-relaxed whitespace-pre-wrap">{a.message}</p>
                  {a.created_by_name && (
                    <p className="text-ninja-muted font-ninja text-xs mt-2">— {a.created_by_name}</p>
                  )}
                  {isManager && (
                    <div className="flex items-center gap-3 mt-3 pt-2 border-t border-ninja-border/60">
                      {confirmDeleteId === a.id ? (
                        <>
                          <span className="text-ninja-red font-ninja text-xs font-semibold">Delete?</span>
                          <button onClick={() => handleDelete(a.id)} className="text-xs font-ninja font-semibold text-white bg-ninja-red rounded-lg px-2 py-1 hover:opacity-90">Yes</button>
                          <button onClick={() => setConfirmDeleteId(null)} className="text-xs font-ninja text-ninja-muted hover:text-ninja-navy">No</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingId(a.id); setShowForm(false); }} className="text-xs font-ninja font-semibold text-ninja-blue hover:underline">Edit</button>
                          <button onClick={() => setConfirmDeleteId(a.id)} className="text-xs font-ninja text-ninja-muted hover:text-ninja-red transition-colors">Delete</button>
                        </>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && expiredItems.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-ninja-muted font-ninja text-xs font-semibold uppercase tracking-wide">Recent (ended)</p>
          {expiredItems.map((a) => (
            <div key={a.id} className="border border-ninja-border/50 rounded-xl p-3 opacity-60">
              <div className="flex items-start justify-between gap-2">
                <p className="font-ninja font-semibold text-ninja-navy text-sm">{a.title}</p>
                <span className="text-[10px] font-ninja font-semibold px-2 py-0.5 rounded-full bg-ninja-border text-ninja-muted flex-shrink-0">Ended</span>
              </div>
              <p className="text-ninja-muted font-ninja text-xs leading-relaxed mt-1 whitespace-pre-wrap">{a.message}</p>
              {isManager && (
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-ninja-border/40">
                  {confirmDeleteId === a.id ? (
                    <>
                      <span className="text-ninja-red font-ninja text-xs font-semibold">Delete?</span>
                      <button onClick={() => handleDelete(a.id)} className="text-xs font-ninja font-semibold text-white bg-ninja-red rounded-lg px-2 py-1 hover:opacity-90">Yes</button>
                      <button onClick={() => setConfirmDeleteId(null)} className="text-xs font-ninja text-ninja-muted hover:text-ninja-navy">No</button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(a.id)} className="text-xs font-ninja text-ninja-muted hover:text-ninja-red transition-colors">Delete</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
