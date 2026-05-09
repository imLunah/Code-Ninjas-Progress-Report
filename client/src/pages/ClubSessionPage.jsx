import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/dateUtils';
import { CLUB_SLUG_TO_NAME, CLUB_COLORS } from '../utils/clubUtils';

function ClubBadge({ name }) {
  const c = CLUB_COLORS[name] || { bg: 'bg-ninja-bg', text: 'text-ninja-navy', border: 'border-ninja-border' };
  return (
    <span className={`text-sm font-ninja font-bold px-3 py-1 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      {name}
    </span>
  );
}

function Comment({ comment }) {
  return (
    <div className="flex gap-3">
      <div className="w-1 flex-shrink-0 bg-ninja-blue rounded-full" />
      <div className="flex-1 min-w-0">
        <p className="text-ninja-navy font-ninja text-sm leading-relaxed">{comment.body}</p>
        <p className="text-ninja-muted font-ninja text-xs mt-1">
          {comment.user_name} · {formatDate(comment.created_at)}
        </p>
      </div>
    </div>
  );
}

export default function ClubSessionPage() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const { user, isReadOnly } = useAuth();

  const clubName = CLUB_SLUG_TO_NAME[slug];

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Comments
  const [comments, setComments] = useState([]);
  const [commentBody, setCommentBody] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const commentRef = useRef(null);

  // Attendee editing (manager only)
  const [editingAttendees, setEditingAttendees] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [savingAttendees, setSavingAttendees] = useState(false);

  useEffect(() => {
    if (!clubName) return;
    api.get(`/clubs/sessions/${id}`)
      .then((data) => {
        setSession(data);
        setNotesDraft(data.notes || '');
        setComments(data.comments || []);
        setSelectedIds(new Set((data.attendees || []).map((a) => a.id)));
      })
      .catch((err) => {
        if (err?.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id, clubName]);

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await api.patch(`/clubs/${id}/notes`, { notes: notesDraft });
      setSession((prev) => ({ ...prev, notes: notesDraft, sensei_name: user?.displayName || prev.sensei_name }));
      setEditingNotes(false);
    } catch { /* ignore */ } finally {
      setSavingNotes(false);
    }
  };

  const handlePostComment = async () => {
    if (!commentBody.trim()) return;
    setPostingComment(true);
    try {
      const c = await api.post(`/clubs/${id}/comments`, { body: commentBody.trim() });
      setComments((prev) => [...prev, c]);
      setCommentBody('');
    } catch { /* ignore */ } finally {
      setPostingComment(false);
    }
  };

  const handleSaveAttendees = async () => {
    if (selectedIds.size === 0) return;
    setSavingAttendees(true);
    try {
      await api.patch(`/clubs/${id}/attendees`, { student_ids: [...selectedIds] });
      const updated = allStudents.filter((s) => selectedIds.has(s.id)).map((s) => ({ id: s.id, full_name: s.full_name }));
      setSession((prev) => ({ ...prev, attendees: updated }));
      setEditingAttendees(false);
    } catch { /* ignore */ } finally {
      setSavingAttendees(false);
    }
  };

  const loadStudents = () => {
    if (allStudents.length === 0) {
      api.get('/students').then((data) => setAllStudents(data.filter((s) => s.active !== false))).catch(() => {});
    }
    setEditingAttendees(true);
  };

  if (!clubName) {
    return <Layout><p className="text-ninja-red font-ninja text-center py-12">Club not found.</p></Layout>;
  }

  if (loading) {
    return <Layout><p className="text-ninja-muted font-ninja text-center py-12">Loading...</p></Layout>;
  }

  if (notFound || !session) {
    return <Layout><p className="text-ninja-red font-ninja text-center py-12">Session not found.</p></Layout>;
  }

  const filteredStudents = allStudents.filter((s) =>
    s.full_name.toLowerCase().includes(attendeeSearch.toLowerCase())
  );

  return (
    <Layout>
      <div className="space-y-5 max-w-3xl mx-auto">
        <button
          onClick={() => navigate(`/clubs/${slug}`)}
          className="text-ninja-muted hover:text-ninja-blue font-ninja text-sm flex items-center gap-1 transition-colors"
        >
          ← Back to {clubName}
        </button>

        {/* Header */}
        <div className="bg-white border border-ninja-border rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <ClubBadge name={clubName} />
                <h1 className="text-xl font-bold font-ninja text-ninja-navy">{formatDate(session.session_date)}</h1>
              </div>
              {session.sensei_name && (
                <p className="text-ninja-muted font-ninja text-sm">Notes by {session.sensei_name}</p>
              )}
            </div>
          </div>
        </div>

        {/* Attendees */}
        <div className="bg-white border border-ninja-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-ninja-navy font-ninja font-bold text-lg">
              Attendees <span className="text-ninja-muted font-normal text-base">({session.attendees?.length ?? 0})</span>
            </h2>
            {user?.role === 'manager' && !isReadOnly && !editingAttendees && (
              <button onClick={loadStudents}
                className="text-ninja-blue font-ninja text-sm font-semibold hover:underline">
                Edit
              </button>
            )}
          </div>

          {editingAttendees ? (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search ninjas..."
                value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
              />
              <div className="space-y-1 max-h-56 overflow-y-auto border border-ninja-border rounded-lg p-2 bg-ninja-bg">
                {filteredStudents.map((s) => {
                  const checked = selectedIds.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedIds((prev) => {
                        const next = new Set(prev);
                        next.has(s.id) ? next.delete(s.id) : next.add(s.id);
                        return next;
                      })}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        checked ? 'bg-ninja-blue text-white' : 'bg-white text-ninja-navy hover:bg-blue-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        checked ? 'bg-white border-white' : 'border-ninja-border bg-white'
                      }`}>
                        {checked && <span className="text-ninja-blue text-xs font-bold">✓</span>}
                      </div>
                      <span className="font-ninja font-semibold text-sm">{s.full_name}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveAttendees} disabled={savingAttendees || selectedIds.size === 0}>
                  {savingAttendees ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => {
                  setEditingAttendees(false);
                  setSelectedIds(new Set((session.attendees || []).map((a) => a.id)));
                }}>Cancel</Button>
              </div>
            </div>
          ) : (
            session.attendees?.length === 0 ? (
              <p className="text-ninja-muted font-ninja text-sm italic">No attendees recorded.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {session.attendees.map((a) => (
                  <span key={a.id} className="bg-ninja-bg border border-ninja-border text-ninja-navy font-ninja text-sm px-3 py-1 rounded-full">
                    {a.full_name}
                  </span>
                ))}
              </div>
            )
          )}
        </div>

        {/* Session Notes */}
        <div className="bg-white border border-ninja-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-ninja-navy font-ninja font-bold text-lg">Session Notes</h2>
            {!isReadOnly && !editingNotes && (
              <button
                onClick={() => setEditingNotes(true)}
                className="text-ninja-blue font-ninja text-sm font-semibold hover:underline"
              >
                {session.notes ? 'Edit' : '+ Add Notes'}
              </button>
            )}
          </div>

          {editingNotes ? (
            <div className="space-y-2">
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                rows={5}
                placeholder="How did the session go? What did the group work on?"
                className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue resize-none"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveNotes} disabled={savingNotes}>
                  {savingNotes ? 'Saving...' : 'Save'}
                </Button>
                <Button size="sm" variant="secondary" onClick={() => { setEditingNotes(false); setNotesDraft(session.notes || ''); }}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className={`font-ninja text-sm leading-relaxed ${session.notes ? 'text-ninja-navy' : 'text-ninja-muted italic'}`}>
              {session.notes || 'No notes added yet.'}
            </p>
          )}
        </div>

        {/* Comments */}
        <div className="bg-white border border-ninja-border rounded-xl p-5 shadow-sm">
          <h2 className="text-ninja-navy font-ninja font-bold text-lg mb-4">
            Comments {comments.length > 0 && <span className="text-ninja-muted font-normal text-base">({comments.length})</span>}
          </h2>

          {comments.length === 0 ? (
            <p className="text-ninja-muted font-ninja text-sm italic mb-4">No comments yet.</p>
          ) : (
            <div className="space-y-4 mb-4">
              {comments.map((c) => <Comment key={c.id} comment={c} />)}
            </div>
          )}

          {!isReadOnly && (
            <div className="space-y-2 border-t border-ninja-border pt-4">
              <textarea
                ref={commentRef}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                rows={2}
                placeholder="Add a comment..."
                className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue resize-none"
              />
              <Button
                size="sm"
                onClick={handlePostComment}
                disabled={postingComment || !commentBody.trim()}
              >
                {postingComment ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
