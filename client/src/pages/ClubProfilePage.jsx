import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmojiButton from '../components/ui/EmojiButton';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate } from '../utils/dateUtils';
import { COLOR_SETS, getClubColors } from '../utils/clubUtils';
import { supabase } from '../lib/supabase';

// Markdown prose styles via Tailwind classes on individual elements
const mdComponents = {
  h1: ({ children }) => <h1 className="text-lg font-bold text-ninja-navy mb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold text-ninja-navy mb-1">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-bold text-ninja-navy mb-1">{children}</h3>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-ninja-blue hover:underline">{children}</a>,
  code: ({ children }) => <code className="bg-amber-100 px-1 rounded font-mono text-xs">{children}</code>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-amber-400 pl-3 italic text-amber-800">{children}</blockquote>,
  hr: () => <hr className="border-amber-200 my-2" />,
};

function ClubBadge({ club }) {
  const c = getClubColors(club);
  return (
    <span className={`text-sm font-ninja font-bold px-3 py-1 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      {club.name}
    </span>
  );
}

function PinnedNoteSection({ clubName, initialNote, initialAuthor, onUpdated, isReadOnly }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(initialNote || '');
  const [draft, setDraft] = useState(initialNote || '');
  const [author, setAuthor] = useState(initialAuthor || '');
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef(null);

  const insertEmoji = (emoji) => {
    const el = textareaRef.current;
    if (!el) { setDraft((d) => d + emoji); return; }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + emoji.length;
      el.focus();
    });
  };

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
            onClick={() => { setDraft(note); setEditing(true); setPreview(false); }}
            className="text-xs font-ninja font-semibold text-amber-600 hover:text-amber-800 transition-colors"
          >
            {note ? 'Edit' : '+ Add Note'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          {/* Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button type="button"
                onClick={() => setPreview(false)}
                className={`text-xs font-ninja font-semibold px-2 py-1 rounded transition-colors ${!preview ? 'bg-amber-200 text-amber-900' : 'text-amber-600 hover:text-amber-800'}`}>
                Write
              </button>
              <button type="button"
                onClick={() => setPreview(true)}
                className={`text-xs font-ninja font-semibold px-2 py-1 rounded transition-colors ${preview ? 'bg-amber-200 text-amber-900' : 'text-amber-600 hover:text-amber-800'}`}>
                Preview
              </button>
            </div>
            <EmojiButton onSelect={insertEmoji} />
          </div>

          {preview ? (
            <div className="min-h-[72px] bg-white border border-amber-300 rounded-lg px-3 py-2 font-ninja text-sm text-amber-900 leading-relaxed">
              {draft ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{draft}</ReactMarkdown>
              ) : (
                <span className="text-amber-400 italic">Nothing to preview.</span>
              )}
            </div>
          ) : (
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={4}
              placeholder="Supports **markdown**. Notes, tips, reminders for this club..."
              className="w-full bg-white border border-amber-300 text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-amber-500 resize-none"
              autoFocus
            />
          )}

          <p className="text-amber-500 font-ninja text-xs">Supports **bold**, *italic*, - lists, [links](url), and more.</p>

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
        <div className={`font-ninja text-sm leading-relaxed ${note ? 'text-amber-900' : 'text-amber-400 italic'}`}>
          {note ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>{note}</ReactMarkdown>
          ) : (
            'No pinned note yet.'
          )}
        </div>
      )}
    </div>
  );
}

function ResourcesSection({ clubName, clubSlug, locationId, resources: initial, isReadOnly }) {
  const [resources, setResources] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState('url'); // 'url' | 'file'
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const resetForm = () => { setTitle(''); setUrl(''); setFile(null); setAdding(false); setUploadProgress(''); };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (mode === 'url' && !url.trim()) return;
    if (mode === 'file' && !file) return;

    setSaving(true);
    try {
      let resourceUrl = url.trim();
      let fileName = null;

      if (mode === 'file') {
        setUploadProgress('Uploading file...');
        const ext = file.name.split('.').pop();
        const path = `${locationId}/${clubSlug}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
        const { data, error } = await supabase.storage.from('club-resources').upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });
        if (error) throw new Error(error.message);
        const { data: { publicUrl } } = supabase.storage.from('club-resources').getPublicUrl(data.path);
        resourceUrl = publicUrl;
        fileName = file.name;
        setUploadProgress('Saving...');
      }

      const resource = await api.post(`/clubs/profile/${encodeURIComponent(clubName)}/resources`, {
        title: title.trim(),
        url: resourceUrl,
        resource_type: mode,
        file_name: fileName,
      });
      setResources((prev) => [resource, ...prev]);
      resetForm();
    } catch (err) {
      setUploadProgress('Upload failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r) => {
    try {
      // If it's a file, delete from storage too
      if (r.resource_type === 'file' && r.url) {
        const urlObj = new URL(r.url);
        const pathParts = urlObj.pathname.split('/object/public/club-resources/');
        if (pathParts[1]) {
          await supabase.storage.from('club-resources').remove([pathParts[1]]);
        }
      }
      await api.delete(`/clubs/resources/${r.id}`);
      setResources((prev) => prev.filter((x) => x.id !== r.id));
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
        <form onSubmit={handleAdd} className="mb-4 space-y-3 p-3 bg-ninja-bg border border-ninja-border rounded-xl">
          {/* Mode tabs */}
          <div className="flex gap-1">
            {['url', 'file'].map((m) => (
              <button key={m} type="button" onClick={() => { setMode(m); setUrl(''); setFile(null); }}
                className={`text-xs font-ninja font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                  mode === m ? 'bg-ninja-blue text-white' : 'bg-white border border-ninja-border text-ninja-navy hover:border-ninja-blue'
                }`}>
                {m === 'url' ? '🔗 Link' : '📁 File'}
              </button>
            ))}
          </div>

          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (e.g. Week 3 Slides)"
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue" />

          {mode === 'url' ? (
            <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="URL (https://...)"
              className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue" />
          ) : (
            <div>
              <input type="file" onChange={(e) => setFile(e.target.files[0])}
                accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm"
                className="w-full text-sm font-ninja text-ninja-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-ninja file:font-semibold file:bg-ninja-blue file:text-white hover:file:bg-ninja-blue-hover file:cursor-pointer cursor-pointer" />
              <p className="text-ninja-muted font-ninja text-xs mt-1">PDF, images, video, Word, PowerPoint · Max 50 MB</p>
            </div>
          )}

          {uploadProgress && <p className="text-ninja-muted font-ninja text-xs">{uploadProgress}</p>}

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={saving || !title.trim() || (mode === 'url' ? !url.trim() : !file)}>
              {saving ? 'Uploading...' : 'Add'}
            </Button>
            <Button size="sm" variant="secondary" type="button" onClick={resetForm}>Cancel</Button>
          </div>
        </form>
      )}

      {resources.length === 0 ? (
        <p className="text-ninja-muted font-ninja text-sm italic">No resources added yet.</p>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-3 bg-ninja-bg border border-ninja-border rounded-xl">
              <span className="text-base flex-shrink-0">{r.resource_type === 'file' ? '📁' : '🔗'}</span>
              <div className="flex-1 min-w-0">
                <a href={r.url} target="_blank" rel="noopener noreferrer"
                  className="text-ninja-blue font-ninja font-semibold text-sm hover:underline truncate block">
                  {r.title}
                </a>
                <p className="text-ninja-muted font-ninja text-xs mt-0.5">
                  {r.resource_type === 'file' && r.file_name ? r.file_name + ' · ' : ''}Added by {r.added_by}
                </p>
              </div>
              {!isReadOnly && (
                confirmDelete === r.id ? (
                  <div className="flex gap-1 flex-shrink-0">
                    <Button variant="danger" size="sm" onClick={() => handleDelete(r)}>Confirm</Button>
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

  const [clubDef, setClubDef] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // First resolve the slug → club definition
    api.get('/clubs/definitions').then((defs) => {
      const def = defs.find((d) => d.slug === slug);
      if (!def) { setNotFound(true); setLoading(false); return; }
      setClubDef(def);
      return Promise.all([
        api.get(`/clubs?club=${encodeURIComponent(def.name)}`),
        api.get(`/clubs/profile/${encodeURIComponent(def.name)}`),
      ]).then(([sessionsData, profileData]) => {
        setSessions(sessionsData);
        setProfile(profileData.profile);
        setResources(profileData.resources);
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [slug, user?.activeLocation?.id]);

  if (notFound) {
    return <Layout><p className="text-ninja-red font-ninja text-center py-12">Club not found.</p></Layout>;
  }

  if (loading || !clubDef) {
    return <Layout><p className="text-ninja-muted font-ninja text-center py-12">Loading...</p></Layout>;
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
                <h1 className="text-xl sm:text-3xl font-bold font-ninja text-ninja-navy">{clubDef.name}</h1>
                <ClubBadge club={clubDef} />
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
              <Button onClick={() => navigate(`/manager/clubs/log?club=${encodeURIComponent(clubDef.name)}`)}>
                + Log Session
              </Button>
            )}
          </div>
        </Card>

        {/* Pinned note */}
        <PinnedNoteSection
          clubName={clubDef.name}
          initialNote={profile?.pinned_note}
          initialAuthor={profile?.pinned_note_author}
          isReadOnly={isReadOnly}
        />

        {/* Resources */}
        <ResourcesSection
          clubName={clubDef.name}
          clubSlug={slug}
          locationId={user?.activeLocation?.id}
          resources={resources}
          isReadOnly={isReadOnly}
        />

        {/* Session threads */}
        <div className="bg-white border border-ninja-border rounded-xl p-5 shadow-sm">
          <h2 className="text-ninja-navy font-ninja font-bold text-lg mb-4">Session Threads</h2>
          {sessions.length === 0 ? (
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
