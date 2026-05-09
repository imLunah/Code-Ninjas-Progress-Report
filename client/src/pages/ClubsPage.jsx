import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { ClubBadge } from '../components/shared/ClubSessionsPanel';
import Button from '../components/ui/Button';
import { api } from '../api/client';
import { formatDate } from '../utils/dateUtils';
import { useAuth } from '../context/AuthContext';

const CLUBS = ['3D Design Club', 'Minecraft Club', 'Roblox Club'];

function CommentBox({ sessionId, onAdded }) {
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    setSaving(true);
    try {
      const comment = await api.post(`/clubs/${sessionId}/comments`, { body: body.trim() });
      onAdded(comment);
      setBody('');
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
      <input
        type="text"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Add a comment..."
        className="flex-1 bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-1.5 font-ninja text-sm focus:outline-none focus:border-ninja-blue transition-colors"
      />
      <button
        type="submit"
        disabled={saving || !body.trim()}
        className="px-3 py-1.5 bg-ninja-blue text-white rounded-lg font-ninja text-sm font-semibold disabled:opacity-50 hover:bg-ninja-blue-hover transition-colors"
      >
        {saving ? '...' : 'Reply'}
      </button>
    </form>
  );
}

function SessionCard({ session, isManager, isReadOnly, onDelete, onNotesUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [draftNotes, setDraftNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [localComments, setLocalComments] = useState([]);

  const saveNotes = async () => {
    setSaving(true);
    try {
      await api.patch(`/clubs/${session.id}/notes`, { notes: draftNotes });
      onNotesUpdated && onNotesUpdated(session.id, draftNotes.trim());
      setEditingNotes(false);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const allComments = [...(session.comments || []), ...localComments];

  return (
    <div className="bg-ninja-bg border border-ninja-border rounded-xl p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-ninja-blue font-ninja font-semibold text-sm">{formatDate(session.session_date)}</span>
          {session.sensei_name && <span className="text-ninja-muted text-sm font-ninja">by {session.sensei_name}</span>}
        </div>
        <span className="text-ninja-muted font-ninja text-xs">{session.attendees?.length ?? 0} students</span>
      </div>

      {/* Attendees toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-ninja-blue font-ninja text-xs font-semibold hover:underline mb-2 block"
      >
        {expanded ? 'Hide attendees ▲' : 'View attendees ▼'}
      </button>

      {expanded && session.attendees?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {session.attendees.map((a) => (
            <span key={a.id} className="text-xs font-ninja bg-white border border-ninja-border text-ninja-navy px-2 py-0.5 rounded-md">
              {a.full_name}
            </span>
          ))}
        </div>
      )}

      {/* Notes */}
      {editingNotes ? (
        <div className="space-y-2 mb-2">
          <textarea
            value={draftNotes}
            onChange={(e) => setDraftNotes(e.target.value)}
            placeholder="How did the session go? What did the group work on?"
            rows={3}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={saveNotes}
              disabled={saving}
              className="px-3 py-1.5 bg-ninja-blue text-white rounded-lg font-ninja text-sm font-semibold disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => setEditingNotes(false)}
              className="px-3 py-1.5 bg-white border border-ninja-border text-ninja-navy rounded-lg font-ninja text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : session.notes ? (
        <p className="text-ninja-navy font-ninja text-sm leading-relaxed mb-2">{session.notes}</p>
      ) : null}

      {session.sensei_name && session.notes && (
        <p className="text-ninja-muted font-ninja text-xs mb-2">Notes by {session.sensei_name}</p>
      )}

      {/* Comments */}
      {allComments.length > 0 && (
        <div className="space-y-1 border-t border-ninja-border pt-2 mb-2">
          {allComments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="flex-shrink-0 w-1 rounded-full bg-ninja-blue" />
              <div>
                <p className="text-ninja-navy font-ninja text-sm">{c.body}</p>
                <p className="text-ninja-muted font-ninja text-xs mt-0.5">
                  {c.user_name} · {new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <CommentBox sessionId={session.id} onAdded={(c) => setLocalComments((prev) => [...prev, c])} />

      {/* Log Progress button for senseis / edit for managers */}
      {!isManager && !editingNotes && (
        <button
          onClick={() => { setEditingNotes(true); setDraftNotes(session.notes || ''); }}
          className="mt-3 w-full text-sm font-ninja font-bold text-ninja-blue border border-ninja-blue rounded-lg py-1.5 hover:bg-ninja-blue hover:text-white transition-colors"
        >
          Log Progress
        </button>
      )}

      {isManager && !isReadOnly && (
        <div className="mt-3 flex gap-2">
          {confirmDelete ? (
            <>
              <Button variant="danger" size="sm" onClick={() => onDelete(session.id)}>Confirm Delete</Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(false)}>Cancel</Button>
            </>
          ) : (
            <Button variant="danger" size="sm" onClick={() => setConfirmDelete(true)}>Delete</Button>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClubsPage() {
  const navigate = useNavigate();
  const { user, isReadOnly } = useAuth();
  const isManager = user?.role === 'manager';

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/clubs')
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.activeLocation?.id]);

  const handleDelete = (id) => {
    api.delete(`/clubs/${id}`).catch(() => {});
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleNotesUpdated = (id, notes) => {
    setSessions((prev) => prev.map((s) => s.id === id ? { ...s, notes } : s));
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold font-ninja text-ninja-navy tracking-wide">
            Clubs
          </h1>
          <p className="text-ninja-muted font-ninja mt-1">Weekly optional clubs at your center.</p>
        </div>

        {loading ? (
          <p className="text-ninja-muted font-ninja text-center py-12">Loading...</p>
        ) : (
          CLUBS.map((clubName) => {
            const clubSessions = sessions.filter((s) => s.club_name === clubName);
            return (
              <div key={clubName}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <ClubBadge name={clubName} />
                    <span className="text-ninja-muted font-ninja text-sm">{clubSessions.length} sessions logged</span>
                  </div>
                  {isManager && !isReadOnly && (
                    <Button size="sm" onClick={() => navigate(`/manager/clubs/log?club=${encodeURIComponent(clubName)}`)}>
                      + Log Session
                    </Button>
                  )}
                </div>

                {clubSessions.length === 0 ? (
                  <div className="bg-white border border-ninja-border rounded-xl p-6 text-center">
                    <p className="text-ninja-muted font-ninja text-sm italic">No sessions logged for {clubName} yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clubSessions.map((s) => (
                      <SessionCard
                        key={s.id}
                        session={s}
                        isManager={isManager}
                        isReadOnly={isReadOnly}
                        onDelete={handleDelete}
                        onNotesUpdated={handleNotesUpdated}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </Layout>
  );
}
