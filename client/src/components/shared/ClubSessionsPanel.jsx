import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/dateUtils';
import { api } from '../../api/client';
import Button from '../ui/Button';

const CLUB_COLORS = {
  '3D Design Club': { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  'Minecraft Club':  { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200'  },
  'Roblox Club':     { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200'    },
};

function ClubBadge({ name }) {
  const c = CLUB_COLORS[name] || { bg: 'bg-ninja-bg', text: 'text-ninja-navy', border: 'border-ninja-border' };
  return (
    <span className={`text-xs font-ninja font-semibold px-2 py-0.5 rounded-md border ${c.bg} ${c.text} ${c.border}`}>
      {name}
    </span>
  );
}

export { ClubBadge };

export default function ClubSessionsPanel({ sessions, onDeleted, onNotesUpdated }) {
  const navigate = useNavigate();
  const { user, isReadOnly } = useAuth();
  const isManager = user?.role === 'manager';

  const [expanded, setExpanded] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleDelete = async (id) => {
    try {
      await api.delete(`/clubs/${id}`);
      onDeleted && onDeleted(id);
    } catch {
      // ignore
    } finally {
      setConfirmId(null);
    }
  };

  const startEdit = (session) => {
    setEditingId(session.id);
    setDraftNotes(session.notes || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftNotes('');
  };

  const saveNotes = async (id) => {
    setSaving(true);
    try {
      await api.patch(`/clubs/${id}/notes`, { notes: draftNotes });
      onNotesUpdated && onNotesUpdated(id, draftNotes.trim());
      setEditingId(null);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-ninja-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold font-ninja text-ninja-navy tracking-wide">Clubs</h2>
        {isManager && !isReadOnly && (
          <Button size="sm" onClick={() => navigate('/manager/clubs/log')}>
            + Log Club Session
          </Button>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="text-ninja-muted font-ninja text-sm text-center py-6 italic">No club sessions logged yet.</p>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const isOpen = expanded === s.id;
            const isEditing = editingId === s.id;

            return (
              <div key={s.id} className="border border-ninja-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  className="w-full flex items-center gap-3 p-3 text-left hover:bg-ninja-bg transition-colors"
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                >
                  <ClubBadge name={s.club_name} />
                  <span className="text-ninja-muted font-ninja text-xs flex-shrink-0">{formatDate(s.session_date)}</span>
                  {!s.notes && !isManager && (
                    <span className="text-orange-500 font-ninja text-xs font-semibold">Notes needed</span>
                  )}
                  <span className="text-ninja-muted font-ninja text-xs ml-auto flex-shrink-0">
                    {s.attendees?.length ?? 0} students {isOpen ? '▲' : '▼'}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-ninja-border px-4 py-3 bg-ninja-bg space-y-3">
                    {/* Attendees */}
                    {s.attendees?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {s.attendees.map((a) => (
                          <span key={a.id} className="text-xs font-ninja bg-white border border-ninja-border text-ninja-navy px-2 py-0.5 rounded-md">
                            {a.full_name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Notes — inline editing for senseis */}
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={draftNotes}
                          onChange={(e) => setDraftNotes(e.target.value)}
                          placeholder="How did the session go? What did the group work on?"
                          rows={4}
                          className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => saveNotes(s.id)} disabled={saving}>
                            {saving ? 'Saving...' : 'Save Notes'}
                          </Button>
                          <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                        </div>
                      </div>
                    ) : s.notes ? (
                      <div>
                        <p className="text-ninja-navy font-ninja text-sm">{s.notes}</p>
                        {!isManager && (
                          <button
                            onClick={() => startEdit(s)}
                            className="text-ninja-blue font-ninja text-xs mt-1 hover:underline"
                          >
                            Edit notes
                          </button>
                        )}
                      </div>
                    ) : (
                      !isManager && (
                        <button
                          onClick={() => startEdit(s)}
                          className="text-ninja-blue font-ninja text-sm font-semibold hover:underline"
                        >
                          + Add session notes
                        </button>
                      )
                    )}

                    {s.sensei_name && (
                      <p className="text-ninja-muted font-ninja text-xs">Notes by {s.sensei_name}</p>
                    )}

                    {/* Manager actions */}
                    {isManager && !isReadOnly && (
                      <div className="flex items-center gap-2 pt-1">
                        {confirmId === s.id ? (
                          <>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>Confirm Delete</Button>
                            <Button variant="secondary" size="sm" onClick={() => setConfirmId(null)}>Cancel</Button>
                          </>
                        ) : (
                          <Button variant="danger" size="sm" onClick={() => setConfirmId(s.id)}>Delete Session</Button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
