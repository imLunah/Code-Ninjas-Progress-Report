import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { formatDate, today } from '../../utils/dateUtils';
import { api } from '../../api/client';
import Button from '../ui/Button';
import { CLUB_COLORS, toSlug } from '../../utils/clubUtils';

function ClubBadge({ name }) {
  const c = CLUB_COLORS[name] || { bg: 'bg-ninja-bg', text: 'text-ninja-navy', border: 'border-ninja-border' };
  return (
    <span className={`text-xs font-ninja font-semibold px-2 py-0.5 rounded-md border ${c.bg} ${c.text} ${c.border}`}>
      {name}
    </span>
  );
}

export { ClubBadge };

export default function ClubSessionsPanel({ sessions = [], onDeleted, onAttendeesUpdated, onCheckIn }) {
  const navigate = useNavigate();
  const { user, isReadOnly, viewAs } = useAuth();
  const isSenseiView = user?.role === 'admin' && viewAs === 'sensei';
  const isManager = ['manager', 'admin'].includes(user?.role) && !isSenseiView;

  const todayStr = today();

  // Only show sessions that haven't been logged yet (no notes); sort overdue first
  const pendingSessions = [...sessions]
    .filter((s) => !s.notes)
    .sort((a, b) => {
      const aOver = String(a.session_date).split('T')[0] < todayStr;
      const bOver = String(b.session_date).split('T')[0] < todayStr;
      if (aOver === bOver) return 0;
      return aOver ? -1 : 1;
    });

  const [expanded, setExpanded] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  // Attendee editing (manager only)
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
        const { students: data } = await api.get('/students?all=true');
        setAllStudents((data ?? []).filter((s) => s.active !== false));
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
    setSavingAttendees(true);
    try {
      await api.patch(`/clubs/${session.id}/attendees`, { student_ids: [...draftAttendeeIds] });
      // Only derive display names from allStudents if it has actually loaded — otherwise
      // pass null so the parent re-fetches rather than showing an empty list.
      const updatedAttendees = allStudents.length > 0
        ? allStudents.filter((s) => draftAttendeeIds.has(s.id)).map((s) => ({ id: s.id, full_name: s.full_name }))
        : null;
      if (updatedAttendees !== null) onAttendeesUpdated && onAttendeesUpdated(session.id, updatedAttendees);
      setEditingAttendeesId(null);
    } catch {
      alert('Failed to save attendees. Please try again.');
    } finally {
      setSavingAttendees(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/clubs/${id}`);
      onDeleted && onDeleted(id);
    } catch {
      alert('Failed to delete session. Please try again.');
    } finally {
      setConfirmId(null);
    }
  };

  return (
    <div className="bg-white border border-ninja-border rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold font-ninja text-ninja-navy tracking-wide">Clubs</h2>
        {isManager && !isReadOnly && (
          <Button size="sm" onClick={onCheckIn ?? (() => navigate('/clubs/log'))}>
            + Check In Club
          </Button>
        )}
      </div>

      {pendingSessions.length === 0 ? (
        <div className="text-center py-6">
          <img src="/CodeNinjasLaptop.png" alt="No sessions" className="h-28 mx-auto mb-4 opacity-80" />
          <p className="text-ninja-muted font-ninja text-sm italic">No pending club sessions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {pendingSessions.map((s) => {
            const isOpen = expanded === s.id;
            const isEditingAttendees = editingAttendeesId === s.id;
            const sessionDateStr = String(s.session_date).split('T')[0];
            const isPast = sessionDateStr < todayStr;
            const attendeeCount = s.attendees?.length ?? 0;

            return (
              <div key={s.id} className="relative bg-white border border-ninja-border rounded-xl shadow-sm p-4 flex flex-col gap-3 hover:border-ninja-blue/50 transition-colors">
                {/* X delete button */}
                {isManager && !isReadOnly && confirmId !== s.id && (
                  <button
                    onClick={() => setConfirmId(s.id)}
                    className="absolute top-2 right-2 text-ninja-muted hover:text-red-400 transition-colors text-sm leading-none p-1"
                  >
                    ✕
                  </button>
                )}
                {/* Header */}
                <div className="pr-6">
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <h3 className="font-ninja font-bold text-ninja-navy text-sm leading-snug">{s.club_name}</h3>
                    {isPast && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-400/15 text-amber-500 text-[10px] font-ninja font-bold uppercase tracking-wide">
                        Needs logging
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-ninja-muted font-ninja text-xs">
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <rect x="3" y="4" width="18" height="18" rx="2" /><path strokeLinecap="round" d="M16 2v4M8 2v4M3 10h18" />
                      </svg>
                      {formatDate(s.session_date)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87" />
                      </svg>
                      {attendeeCount} {attendeeCount === 1 ? 'ninja' : 'ninjas'}
                    </span>
                  </div>
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
                      {!isReadOnly && (
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

                {/* Log Progress — opens session detail with notes + comment thread */}
                {!isReadOnly && (
                  <button
                    onClick={() => navigate(`/clubs/${toSlug(s.club_name)}/sessions/${s.id}`)}
                    className="mt-auto w-full text-sm font-ninja font-bold text-white bg-ninja-blue rounded-lg py-2 hover:bg-ninja-blue/90 transition-colors"
                  >
                    Log Club
                  </button>
                )}

                {/* Manager delete confirm */}
                {isManager && !isReadOnly && confirmId === s.id && (
                  <div className="flex items-center gap-2">
                    <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>Confirm</Button>
                    <Button variant="secondary" size="sm" onClick={() => setConfirmId(null)}>Cancel</Button>
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
