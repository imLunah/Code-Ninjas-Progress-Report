import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/dateUtils';
import { CLUB_SLUG_TO_NAME, CLUB_NAME_TO_SLUG, CLUB_COLORS } from '../utils/clubUtils';

function ClubBadge({ name }) {
  const c = CLUB_COLORS[name] || { bg: 'bg-ninja-bg', text: 'text-ninja-navy', border: 'border-ninja-border' };
  return (
    <span className={`text-sm font-ninja font-bold px-3 py-1 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      {name}
    </span>
  );
}

function PinnedNoteSection({ clubName, initialNote, initialAuthor, onUpdated, isReadOnly }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(initialNote || '');
  const [draft, setDraft] = useState(initialNote || '');
  const [author, setAuthor] = useState(initialAuthor || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/clubs/profile/${encodeURIComponent(clubName)}/pinned-note`, { note: draft });
      setNote(draft);
      setEditing(false);
      onUpdated && onUpdated(draft);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-amber-500">📌</span>
          <h3 className="text-sm font-ninja font-semibold text-amber-800 uppercase tracking-wide">Pinned Note</h3>
          {author && !editing && <span className="text-amber-500 font-ninja text-xs">by {author}</span>}
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
            placeholder="Notes, tips, or reminders for this club..."
            className="w-full bg-white border border-amber-300 text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-amber-500 resize-none"
            autoFocus
          />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="text-xs font-ninja font-semibold bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={() => setEditing(false)}
              className="text-xs font-ninja font-semibold text-amber-700 hover:text-amber-900 px-3 py-1.5 transition-colors">
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

function ResourcesSection({ clubName, resources: initial, isReadOnly }) {
  const [resources, setResources] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;
    setSaving(true);
    try {
      const resource = await api.post(`/clubs/profile/${encodeURIComponent(clubName)}/resources`, { title: title.trim(), url: url.trim() });
      setResources((prev) => [resource, ...prev]);
      setTitle(''); setUrl(''); setAdding(false);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/clubs/resources/${id}`);
      setResources((prev) => prev.filter((r) => r.id !== id));
    } catch { /* ignore */ } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="bg-white border border-ninja-border rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-ninja-navy font-ninja font-bold text-lg">Resources</h2>
        {!isReadOnly && !adding && (
          <button onClick={() => setAdding(true)}
            className="text-ninja-blue font-ninja text-sm font-semibold hover:underline">
            + Add Resource
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="mb-4 space-y-2 p-3 bg-ninja-bg border border-ninja-border rounded-xl">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Week 3 Slides)"
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue" />
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="URL (https://...)"
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue" />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving || !title.trim() || !url.trim()}>
              {saving ? 'Saving...' : 'Add'}
            </Button>
            <Button size="sm" variant="secondary" type="button" onClick={() => { setAdding(false); setTitle(''); setUrl(''); }}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {resources.length === 0 ? (
        <p className="text-ninja-muted font-ninja text-sm italic">No resources added yet.</p>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-ninja-bg border border-ninja-border rounded-xl">
              <div className="flex-1 min-w-0">
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  className="text-ninja-blue font-ninja font-semibold text-sm hover:underline truncate block">
                  {r.title}
                </a>
                <p className="text-ninja-muted font-ninja text-xs mt-0.5">Added by {r.added_by}</p>
              </div>
              {!isReadOnly && (
                confirmDelete === r.id ? (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="danger" size="sm" onClick={() => handleDelete(r.id)}>Confirm</Button>
                    <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmDelete(r.id)}
                    className="text-ninja-muted hover:text-ninja-red font-ninja text-xs flex-shrink-0 transition-colors">✕</button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ClubProfilePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isReadOnly } = useAuth();
  const isManager = user?.role === 'manager';

  const clubName = CLUB_SLUG_TO_NAME[slug];
  const [sessions, setSessions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubName) return;
    Promise.all([
      api.get(`/clubs?club=${encodeURIComponent(clubName)}`),
      api.get(`/clubs/profile/${encodeURIComponent(clubName)}`),
    ]).then(([sessionsData, profileData]) => {
      setSessions(sessionsData);
      setProfile(profileData.profile);
      setResources(profileData.resources);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [clubName, user?.activeLocation?.id]);

  if (!clubName) {
    return <Layout><p className="text-ninja-red font-ninja text-center py-12">Club not found.</p></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-5 max-w-3xl mx-auto">
        <button onClick={() => navigate('/clubs')}
          className="text-ninja-muted hover:text-ninja-blue font-ninja text-sm flex items-center gap-1 transition-colors">
          ← Back to Clubs
        </button>

        {/* Header */}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-xl sm:text-3xl font-bold font-ninja text-ninja-navy">{clubName}</h1>
                <ClubBadge name={clubName} />
              </div>
              <div className="flex gap-6 mt-3">
                <div>
                  <p className="text-2xl font-bold font-ninja text-ninja-blue">{sessions.length}</p>
                  <p className="text-ninja-muted font-ninja text-xs">Sessions</p>
                </div>
                {sessions[0] && (
                  <div>
                    <p className="text-ninja-navy font-ninja font-bold text-sm">{formatDate(sessions[0].session_date)}</p>
                    <p className="text-ninja-muted font-ninja text-xs">Last Session</p>
                  </div>
                )}
              </div>
            </div>
            {isManager && !isReadOnly && (
              <Button onClick={() => navigate(`/manager/clubs/log?club=${encodeURIComponent(clubName)}`)}>
                + Log Session
              </Button>
            )}
          </div>
        </Card>

        {/* Pinned note */}
        <PinnedNoteSection
          clubName={clubName}
          initialNote={profile?.pinned_note}
          initialAuthor={profile?.pinned_note_author}
          isReadOnly={isReadOnly}
        />

        {/* Resources */}
        <ResourcesSection clubName={clubName} resources={resources} isReadOnly={isReadOnly} />

        {/* Session threads */}
        <div className="bg-white border border-ninja-border rounded-xl p-5 shadow-sm">
          <h2 className="text-ninja-navy font-ninja font-bold text-lg mb-4">Session Threads</h2>
          {loading ? (
            <p className="text-ninja-muted font-ninja text-sm text-center py-6">Loading...</p>
          ) : sessions.length === 0 ? (
            <p className="text-ninja-muted font-ninja text-sm italic">No sessions logged yet.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 bg-ninja-bg border border-ninja-border rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-ninja-blue font-ninja font-semibold text-sm">{formatDate(s.session_date)}</p>
                    <div className="flex flex-wrap gap-2 mt-1 text-ninja-muted font-ninja text-xs">
                      <span>{s.attendees?.length ?? 0} students</span>
                      {s.sensei_name && <span>· Notes by {s.sensei_name}</span>}
                      {s.comments?.length > 0 && <span>· {s.comments.length} comment{s.comments.length !== 1 ? 's' : ''}</span>}
                    </div>
                    {s.notes && (
                      <p className="text-ninja-navy font-ninja text-xs mt-1 truncate">{s.notes}</p>
                    )}
                  </div>
                  <button
                    onClick={() => navigate(`/clubs/${slug}/sessions/${s.id}`)}
                    className="flex-shrink-0 text-sm font-ninja font-bold text-ninja-blue border border-ninja-blue rounded-lg px-3 py-1.5 hover:bg-ninja-blue hover:text-white transition-colors"
                  >
                    Log Progress
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
