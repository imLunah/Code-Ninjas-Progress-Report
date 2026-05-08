import { useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function PinnedNote({ studentId, initialNote, onUpdated }) {
  const { isReadOnly } = useAuth();
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(initialNote || '');
  const [draft, setDraft] = useState(initialNote || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const updated = await api.patch(`/students/${studentId}/note`, { pinned_note: draft });
      setNote(draft);
      onUpdated && onUpdated(updated.pinned_note);
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(note);
    setError('');
    setEditing(false);
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-amber-500">📌</span>
          <h3 className="text-sm font-ninja font-semibold text-amber-800 uppercase tracking-wide">Pinned Note</h3>
        </div>
        {!isReadOnly && !editing && (
          <button
            onClick={() => { setDraft(note); setEditing(true); }}
            className="text-xs font-ninja font-semibold text-amber-600 hover:text-amber-800 transition-colors"
          >
            {note ? 'Edit' : '+ Add Note'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="e.g. Gets frustrated easily — celebrate small wins. Stays focused with a visible timer. Benefits from a short break halfway through. Loves building games, responds well to challenges."
            className="w-full bg-white border border-amber-300 text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
            autoFocus
          />
          {error && <p className="text-ninja-red text-xs font-ninja">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-xs font-ninja font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="text-xs font-ninja font-semibold text-amber-700 hover:text-amber-900 px-3 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className={`font-ninja text-sm leading-relaxed ${note ? 'text-amber-900' : 'text-amber-400 italic'}`}>
          {note || 'No pinned note yet.'}
        </p>
      )}
    </div>
  );
}
