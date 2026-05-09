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

export default function ClubSessionsPanel({ sessions, onDeleted, onNotesUpdated, onAttendeesUpdated }) {
  const navigate = useNavigate();
  const { user, isReadOnly } = useAuth();
  const isManager = user?.role === 'manager';

  const [expanded, setExpanded] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Attendee editing state (manager only)
  const [editingAttendeesId, setEditingAttendeesId] = useState(null);
  const [allStudents, setAllStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [draftAttendeeIds, setDraftAttendeeIds] = useState(new Set());
  const [savingAttendees, setSavingAttendees] = useState(false);

  const startEditAttendees = async (session) => {
    setEditingAttendeesId(session.id);
    setExpanded(session.id);
    setDraftAttendeeIds(new Set((session.attendees || []).map((a) => a.id)));
    setAttendeeSearch('');
    if (allStudents.length === 0) {
      setLoadingStudents(true);
      try {
        const data = await api.get('/students');
        setAllStudents(data.filter((s) => s.active !== false));
      } catch { /* ignore */ } finally {
        setLoadingStudents(false);
      }
    }
  };

  const toggleAttendee = (id) => {
    setDraftAttendeeIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const saveAttendees = async (session) => {
    if (draftAttendeeIds.size === 0) return;
    setSavingAttendees(true);
    try {
      await api.patch(`/clubs/${session.id}/attendees`, { student_ids: [...draftAttendeeIds] });
      const updatedAttendees = allStudents
        .filter((s) => draftAttendeeIds.has(s.id))
        .map((s) => ({ id: s.id, full_name: s.full_name }));
      onAttendeesUpdated && onAttendeesUpdated(session.id, updatedAttendees);
      setEditingAttendeesId(null);
    } catch { /* ignore */ } finally {
      setSavingAttendees(false);
    }
  };

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
    setExpanded(session.id);
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sessions.map((s) => {
            const isOpen = expanded === s.id;
            const isEditing = editingId === s.id;
            const isEditingAttendees = editingAttendeesId === s.id;

            return (
              <div key={s.id} className="bg-white border border-ninja-border rounded-xl shadow-sm p-4 flex flex-col gap-3">
                {/* Header */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <ClubBadge name={s.club_name} />
                    <span className="text-ninja-muted font-ninja text-xs">{s.attendees?.length ?? 0} students</span>
                  </div>
                  <p className="text-ninja-muted font-ninja text-xs mt-1">{formatDate(s.session_date)}</p>
                </div>

                {/* Attendees toggle */}
                <button
                  type="button"
                  onClick={() => setExpanded(isOpen ? null : s.id)}
                  className="text-ninja-blue font-ninja text-xs font-semibold text-left hover:underline"
                >
                  {isOpen ? 'Hide attendees ▲' : 'View attendees ▼'}
                </button>

                {isOpen && (
                  isEditingAttendees ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Search ninjas..."
                        value={attendeeSearch}
                        onChange={(e) => setAttendeeSearch(e.target.value)}
                        className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-1.5 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
                      />
                      {loadingStudents ? (
                        <p className="text-ninja-muted font-ninja text-xs">Loading...</p>
                      ) : (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {allStudents
                            .filter((st) => st.full_name.toLowerCase().includes(attendeeSearch.toLowerCase()))
                            .map((st) => {
                              const checked = draftAttendeeIds.has(st.id);
                              return (
                                <button
                                  key={st.id}
                                  type="button"
                                  onClick={() => toggleAttendee(st.id)}
                                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                                    checked ? 'bg-ninja-blue text-white' : 'bg-ninja-bg text-ninja-navy hover:bg-blue-50'
                                  }`}
                                >
                                  <div className={`w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center ${
                                    checked ? 'bg-white border-white' : 'border-ninja-border bg-white'
                                  }`}>
                                    {checked && <span className="text-ninja-blue text-xs font-bold leading-none">✓</span>}
                                  </div>
                                  <span className="font-ninja text-xs">{st.full_name}</span>
                                </button>
                              );
                            })}
                        </div>
                      )}
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" onClick={() => saveAttendees(s)} disabled={savingAttendees || draftAttendeeIds.size === 0}>
                          {savingAttendees ? 'Saving...' : `Save (${draftAttendeeIds.size})`}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setEditingAttendeesId(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {s.attendees?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {s.attendees.map((a) => (
                            <span key={a.id} className="text-xs font-ninja bg-ninja-bg border border-ninja-border text-ninja-navy px-2 py-0.5 rounded-md">
                              {a.full_name}
                            </span>
                          ))}
                        </div>
                      )}
                      {isManager && !isReadOnly && (
                        <button
                          onClick={() => startEditAttendees(s)}
                          className="text-ninja-blue font-ninja text-xs hover:underline"
                        >
                          Edit attendees
                        </button>
                      )}
                    </div>
                  )
                )}

                {/* Notes */}
                {isEditing ? (
                  <div className="space-y-2 flex-1">
                    <textarea
                      value={draftNotes}
                      onChange={(e) => setDraftNotes(e.target.value)}
                      placeholder="How did the session go? What did the group work on?"
                      rows={3}
                      className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue resize-none"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveNotes(s.id)} disabled={saving}>
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                    </div>
                  </div>
                ) : s.notes ? (
                  <p className="text-ninja-navy font-ninja text-sm flex-1">{s.notes}</p>
                ) : null}

                {s.sensei_name && s.notes && (
                  <p className="text-ninja-muted font-ninja text-xs">Notes by {s.sensei_name}</p>
                )}

                {/* Sensei action button — Log Progress style */}
                {!isManager && !isEditing && (
                  <button
                    onClick={() => startEdit(s)}
                    className="w-full text-sm font-ninja font-bold text-ninja-blue border border-ninja-blue rounded-lg py-1.5 hover:bg-ninja-blue hover:text-white transition-colors"
                  >
                    Log Progress
                  </button>
                )}

                {/* Manager delete */}
                {isManager && !isReadOnly && (
                  <div className="flex items-center gap-2 mt-auto">
                    {confirmId === s.id ? (
                      <>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>Confirm</Button>
                        <Button variant="secondary" size="sm" onClick={() => setConfirmId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <Button variant="danger" size="sm" onClick={() => setConfirmId(s.id)}>Delete</Button>
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
