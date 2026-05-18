import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import EmojiButton from '../components/ui/EmojiButton';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/dateUtils';
import { COLOR_SETS, getClubColors } from '../utils/clubUtils';

const mdComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-ninja-blue hover:underline">{children}</a>,
  code: ({ children }) => <code className="bg-ninja-bg px-1 rounded font-mono text-xs">{children}</code>,
};

function Comment({ comment }) {
  return (
    <div className="flex gap-3">
      <div className="w-1 flex-shrink-0 bg-ninja-blue rounded-full" />
      <div className="flex-1 min-w-0">
        <div className="font-ninja text-sm text-ninja-navy leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{comment.body}</ReactMarkdown>
        </div>
        <p className="text-ninja-muted font-ninja text-xs mt-1">
          {comment.user_name} · {formatDate(comment.created_at)}
        </p>
      </div>
    </div>
  );
}

function insertAtCursor(ref, current, emoji, setter) {
  const el = ref.current;
  if (!el) { setter(current + emoji); return; }
  const start = el.selectionStart;
  const end = el.selectionEnd;
  const next = current.slice(0, start) + emoji + current.slice(end);
  setter(next);
  requestAnimationFrame(() => {
    el.selectionStart = el.selectionEnd = start + emoji.length;
    el.focus();
  });
}

export default function ClubSessionPage() {
  const { slug, id } = useParams();
  const navigate = useNavigate();
  const { user, isReadOnly } = useAuth();

  const [clubDef, setClubDef] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Notes editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [notesPreview, setNotesPreview] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const notesRef = useRef(null);

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
    // Resolve slug → club definition
    api.get('/clubs/definitions').then((defs) => {
      const def = defs.find((d) => d.slug === slug);
      if (!def) { setNotFound(true); setLoading(false); return; }
      setClubDef(def);
      return api.get(`/clubs/sessions/${id}`);
    }).then((data) => {
      if (!data) return;
      setSession(data);
      setNotesDraft(data.notes || '');
      setComments(data.comments || []);
      setSelectedIds(new Set((data.attendees || []).map((a) => a.id)));
    }).catch((err) => {
      if (err?.status === 404) setNotFound(true);
    }).finally(() => setLoading(false));
  }, [id, slug]);

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
      api.get('/students').then(({ students: data }) => setAllStudents(data.filter((s) => s.active !== false))).catch(() => {});
    }
    setEditingAttendees(true);
  };

  if (notFound) return <Layout><p className="text-ninja-red font-ninja text-center py-12">Session not found.</p></Layout>;
  if (loading || !clubDef) return <Layout><p className="text-ninja-muted font-ninja text-center py-12">Loading...</p></Layout>;

  const c = getClubColors(clubDef);
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
          ← Back to {clubDef.name}
        </button>

        {/* Header */}
        <div className="bg-white border border-ninja-border rounded-xl p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <span className={`text-sm font-ninja font-bold px-3 py-1 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
              {clubDef.name}
            </span>
            <h1 className="text-xl font-bold font-ninja text-ninja-navy">{formatDate(session.session_date)}</h1>
          </div>
          {session.sensei_name && (
            <p className="text-ninja-muted font-ninja text-sm mt-1">Notes by {session.sensei_name}</p>
          )}
        </div>

        {/* Attendees */}
        <div className="bg-white border border-ninja-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-ninja-navy font-ninja font-bold text-lg">
              Attendees <span className="text-ninja-muted font-normal text-base">({session.attendees?.length ?? 0})</span>
            </h2>
            {!isReadOnly && !editingAttendees && (
              <button onClick={loadStudents} className="text-ninja-blue font-ninja text-sm font-semibold hover:underline">
                Edit
              </button>
            )}
          </div>

          {editingAttendees ? (
            <div className="space-y-3">
              <input type="text" placeholder="Search ninjas..." value={attendeeSearch}
                onChange={(e) => setAttendeeSearch(e.target.value)}
                className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue" />
              <div className="space-y-1 max-h-56 overflow-y-auto border border-ninja-border rounded-lg p-2 bg-ninja-bg">
                {filteredStudents.map((s) => {
                  const checked = selectedIds.has(s.id);
                  return (
                    <button key={s.id} type="button"
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
              <button onClick={() => { setEditingNotes(true); setNotesPreview(false); }}
                className="text-ninja-blue font-ninja text-sm font-semibold hover:underline">
                {session.notes ? 'Edit' : '+ Add Notes'}
              </button>
            )}
          </div>

          {editingNotes ? (
            <div className="space-y-2">
              {/* Toolbar */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1">
                  {['Write', 'Preview'].map((tab) => {
                    const active = tab === 'Preview' ? notesPreview : !notesPreview;
                    return (
                      <button key={tab} type="button" onClick={() => setNotesPreview(tab === 'Preview')}
                        className={`text-xs font-ninja font-semibold px-2 py-1 rounded transition-colors ${
                          active ? 'bg-ninja-bg text-ninja-navy border border-ninja-border' : 'text-ninja-muted hover:text-ninja-navy'
                        }`}>
                        {tab}
                      </button>
                    );
                  })}
                </div>
                <EmojiButton onSelect={(emoji) => insertAtCursor(notesRef, notesDraft, emoji, setNotesDraft)} />
              </div>

              {notesPreview ? (
                <div className="min-h-[100px] bg-ninja-bg border border-ninja-border rounded-lg px-3 py-2 font-ninja text-sm text-ninja-navy leading-relaxed">
                  {notesDraft ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{notesDraft}</ReactMarkdown>
                  ) : (
                    <span className="text-ninja-muted italic">Nothing to preview.</span>
                  )}
                </div>
              ) : (
                <textarea
                  ref={notesRef}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  rows={5}
                  placeholder="How did the session go? Supports **markdown**."
                  className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue resize-none"
                  autoFocus
                />
              )}
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
            <div className={`font-ninja text-sm leading-relaxed ${session.notes ? 'text-ninja-navy' : 'text-ninja-muted italic'}`}>
              {session.notes ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{session.notes}</ReactMarkdown>
              ) : 'No notes added yet.'}
            </div>
          )}
        </div>

        {/* Comments — only available once session notes have been written */}
        {!session.notes && (
          <div className="bg-white border border-ninja-border rounded-xl p-5 shadow-sm text-center">
            <p className="text-ninja-muted font-ninja text-sm italic">Comments will be available once session notes are added.</p>
          </div>
        )}
        {session.notes && <div className="bg-white border border-ninja-border rounded-xl p-5 shadow-sm">
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
              <div className="relative">
                <textarea
                  ref={commentRef}
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  rows={2}
                  placeholder="Add a comment... (supports **markdown**)"
                  className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 pr-10 font-ninja text-sm focus:outline-none focus:border-ninja-blue resize-none"
                />
                <div className="absolute top-2 right-2">
                  <EmojiButton
                    onSelect={(emoji) => insertAtCursor(commentRef, commentBody, emoji, setCommentBody)}
                    position="top"
                  />
                </div>
              </div>
              <Button size="sm" onClick={handlePostComment} disabled={postingComment || !commentBody.trim()}>
                {postingComment ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          )}
        </div>}
      </div>
    </Layout>
  );
}
