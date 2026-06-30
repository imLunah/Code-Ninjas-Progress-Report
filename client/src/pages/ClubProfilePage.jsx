import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
import remarkGfm from 'remark-gfm';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import CropModal from '../components/ui/CropModal';
import LazyMarkdownEditor from '../components/shared/LazyMarkdownEditor';
import { Pin, MARKDOWN_COMPONENTS } from '../components/shared/PinnedNote';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { formatDate, today } from '../utils/dateUtils';
import { COLOR_SETS, getClubColors } from '../utils/clubUtils';
import { uploadToSigned } from '../lib/supabase';

const mdComponents = {
  h1: ({ children }) => <h1 className="text-lg font-bold text-ninja-navy mb-1">{children}</h1>,
  h2: ({ children }) => <h2 className="text-base font-bold text-ninja-navy mb-1">{children}</h2>,
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-ninja-blue hover:underline">{children}</a>,
  code: ({ children }) => <code className="bg-amber-100 px-1 rounded font-mono text-xs">{children}</code>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-amber-400 pl-3 italic text-amber-800">{children}</blockquote>,
};

function resourceTypeBadge(r) {
  if (r.resource_type === 'url') {
    return { label: 'LINK', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' };
  }
  const ext = (r.file_name || r.url || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return { label: 'PDF', bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' };
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return { label: 'IMG', bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' };
  return { label: 'FILE', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200' };
}

function PinnedNoteSection({ clubName, initialNote, initialAuthor, initialUpdatedAt, onUpdated, isReadOnly }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(initialNote || '');
  const [draft, setDraft] = useState(initialNote || '');
  const [author, setAuthor] = useState(initialAuthor || '');
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt || null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch(`/clubs/profile/${encodeURIComponent(clubName)}/pinned-note`, { note: draft });
      setNote(draft);
      setEditing(false);
      onUpdated && onUpdated(draft);
    } catch { } finally {
      setSaving(false);
    }
  };

  const relativeDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const hasNote = Boolean(note && note.trim());

  return (
    <div className="rounded-2xl bg-amber-50 ring-1 ring-amber-200/80 shadow-sm">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2 text-amber-700">
            <Pin className="w-4 h-4 -rotate-12" />
            <h3 className="font-ninja font-bold text-[15px] text-amber-900">
              {author ? `Pinned by ${author}` : 'Pinned note'}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {updatedAt && (
              <span className="text-amber-500 font-ninja text-xs">{relativeDate(updatedAt)}</span>
            )}
            {!isReadOnly && !editing && (
              <button
                onClick={() => { setDraft(note); setEditing(true); }}
                className="font-ninja text-xs font-bold text-amber-700 hover:text-amber-900 transition-colors"
              >
                {hasNote ? 'Edit' : 'Add note'}
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-2.5">
            <LazyMarkdownEditor
              value={draft}
              onChange={setDraft}
              placeholder="Notes, tips, reminders for this club..."
            />
            <div className="flex items-center gap-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="font-ninja text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white px-3.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save note'}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="font-ninja text-xs font-bold text-amber-700 hover:text-amber-900 px-3 py-1.5 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : hasNote ? (
          <div className="font-ninja text-sm leading-relaxed text-amber-900">
            <ReactMarkdown
              components={MARKDOWN_COMPONENTS}
              urlTransform={(url) => (/^(https?:|mailto:)/i.test(url) ? url : '')}
            >
              {note}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="font-ninja text-sm leading-relaxed text-amber-700/70 dark:text-amber-200/40">
            Nothing pinned yet.
          </p>
        )}
      </div>
    </div>
  );
}

function SessionsSection({ sessions, memberCount, slug, navigate, isManager, isReadOnly, onDeleted }) {
  const [expanded, setExpanded] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const todayStr = today();
  const shown = expanded ? sessions : sessions.slice(0, 4);
  const canDelete = isManager && !isReadOnly;

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/clubs/${id}`);
      onDeleted && onDeleted(id);
      setConfirmId(null);
    } catch {
      // leave confirm open so the CD can retry
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-ninja font-bold text-ninja-navy text-base">Sessions</h2>
        {sessions.length > 4 && (
          <button onClick={() => setExpanded(!expanded)}
            className="text-ninja-blue font-ninja text-sm font-semibold hover:underline">
            {expanded ? 'Show less' : `All ${sessions.length} sessions →`}
          </button>
        )}
      </div>

      {sessions.length === 0 ? (
        <p className="text-ninja-muted font-ninja text-sm italic">No sessions logged yet.</p>
      ) : (
        <div className="space-y-0 divide-y divide-ninja-border">
          {shown.map((s) => {
            const hasNotes = !!s.notes;
            const isOverdue = !hasNotes && String(s.session_date).split('T')[0] < todayStr;
            const borderColor = hasNotes ? '#4ade80' : isOverdue ? '#f87171' : '#fbbf24';
            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/clubs/${slug}/sessions/${s.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/clubs/${slug}/sessions/${s.id}`); }}
                className="w-full text-left py-3.5 flex items-start gap-4 hover:bg-ninja-bg transition-colors first:pt-0 last:pb-0 px-1 -mx-1 rounded-lg cursor-pointer"
              >
                <div className="w-0.5 self-stretch rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: borderColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-ninja font-bold text-ninja-navy text-sm">
                      {formatDate(s.session_date)}
                    </span>
                    {isOverdue && (
                      <span className="text-[10px] font-ninja font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200 uppercase tracking-wide">
                        Overdue
                      </span>
                    )}
                  </div>
                  {s.notes ? (
                    <p className="text-ninja-muted font-ninja text-xs leading-snug truncate">{s.notes}</p>
                  ) : (
                    <p className="text-ninja-muted font-ninja text-xs italic">No notes yet</p>
                  )}
                </div>
                <span className="font-ninja font-semibold text-sm text-ninja-muted flex-shrink-0 mt-0.5">
                  {s.attendees?.length ?? 0}{memberCount > 0 ? `/${memberCount}` : ''}
                </span>
                {canDelete && (
                  confirmId === s.id ? (
                    <span className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDelete(s.id)}
                        disabled={deletingId === s.id}
                        className="text-[11px] font-ninja font-bold text-ninja-red hover:underline disabled:opacity-50"
                      >
                        {deletingId === s.id ? '…' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="text-[11px] font-ninja font-bold text-ninja-muted hover:underline"
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmId(s.id); }}
                      title="Delete session"
                      className="text-ninja-muted hover:text-ninja-red transition-colors flex-shrink-0 text-lg leading-none -mt-0.5"
                    >
                      &times;
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClubInfoCard({ clubDef, colors, isManager, isReadOnly, onCoverUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [cropSrc, setCropSrc] = useState(null);
  const [coverError, setCoverError] = useState(false);
  const fileInputRef = useRef(null);

  const initials = clubDef.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const createdYear = clubDef.created_at
    ? new Date(clubDef.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : null;
  const canEditCover = isManager && !isReadOnly && clubDef.location_id !== null;

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image must be under 10 MB.');
      return;
    }
    setUploadError('');
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleRemoveCover = async () => {
    setUploading(true);
    setUploadError('');
    try {
      // Server clears the DB and deletes the orphaned object.
      await api.patch(`/clubs/definitions/${clubDef.id}/cover-image`, { path: null });
      onCoverUpdated(null);
    } catch {
      setUploadError('Remove failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCropConfirm = async (blob) => {
    setCropSrc(null);
    setUploading(true);
    setUploadError('');
    try {
      const sign = await api.post(`/storage/club-cover/${clubDef.id}`, { contentType: 'image/jpeg' });
      await uploadToSigned(sign.bucket, sign.path, sign.token, blob, 'image/jpeg');
      // Server signs the read URL, stores it, and deletes the old cover.
      const updated = await api.patch(`/clubs/definitions/${clubDef.id}/cover-image`, { path: sign.path });
      onCoverUpdated(updated?.cover_image_url || null);
    } catch {
      setUploadError('Upload failed. Try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white border border-ninja-border rounded-2xl shadow-sm overflow-hidden">
      {/* Cover image / color banner */}
      <div className="relative h-40 w-full overflow-hidden">
        {clubDef.cover_image_url && !coverError ? (
          <img src={clubDef.cover_image_url} alt={clubDef.name} onError={() => setCoverError(true)} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${colors.bg}`}>
            <span className={`font-ninja font-black text-4xl opacity-30 ${colors.text}`}>{initials}</span>
          </div>
        )}
        {canEditCover && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
            {clubDef.cover_image_url && (
              <button
                onClick={handleRemoveCover}
                disabled={uploading}
                className="bg-black/50 hover:bg-red-600/80 disabled:opacity-50 text-white text-xs font-ninja font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove
              </button>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-black/50 hover:bg-black/70 disabled:opacity-50 text-white text-xs font-ninja font-semibold px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {uploading ? 'Uploading…' : clubDef.cover_image_url ? 'Change photo' : 'Add photo'}
            </button>
          </div>
        )}
        {canEditCover && (
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
        )}
        {cropSrc && (
          <CropModal
            imageSrc={cropSrc}
            aspect={16 / 9}
            cropShape="rect"
            onConfirm={handleCropConfirm}
            onCancel={() => setCropSrc(null)}
          />
        )}
      </div>

      {uploadError && <p className="text-ninja-red font-ninja text-xs px-4 pt-2">{uploadError}</p>}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-ninja font-bold text-sm flex-shrink-0 ${colors.bg} ${colors.text}`}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-ninja font-bold text-ninja-navy text-base leading-tight">{clubDef.name}</p>
            {(createdYear || clubDef.creator_name) && (
              <p className="text-ninja-muted font-ninja text-xs mt-0.5">
                {createdYear && `Created ${createdYear}`}
                {createdYear && clubDef.creator_name && ' · '}
                {clubDef.creator_name}
              </p>
            )}
          </div>
        </div>
        {clubDef.description && (
          <p className="text-ninja-muted font-ninja text-sm mt-3 leading-relaxed">{clubDef.description}</p>
        )}
      </div>
    </div>
  );
}

function ResourcesSection({ clubName, clubSlug, locationId, resources: initial, isReadOnly }) {
  const [resources, setResources] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [mode, setMode] = useState('url');
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
      let payload;
      if (mode === 'file') {
        setUploadProgress('Uploading...');
        const sign = await api.post('/storage/club-resource', { filename: file.name });
        await uploadToSigned(sign.bucket, sign.path, sign.token, file, file.type || undefined);
        setUploadProgress('Saving...');
        // Server signs the read URL from the path.
        payload = { title: title.trim(), path: sign.path, resource_type: 'file', file_name: file.name };
      } else {
        payload = { title: title.trim(), url: url.trim(), resource_type: 'url' };
      }
      const resource = await api.post(`/clubs/profile/${encodeURIComponent(clubName)}/resources`, payload);
      setResources((prev) => [resource, ...prev]);
      resetForm();
    } catch {
      setUploadProgress('Upload failed. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r) => {
    try {
      // Server deletes the DB row and the stored file (if any).
      await api.delete(`/clubs/resources/${r.id}`);
      setResources((prev) => prev.filter((x) => x.id !== r.id));
    } catch { } finally {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="bg-white border border-ninja-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-ninja font-bold text-ninja-navy text-base">Resources</h2>
        {!isReadOnly && !adding && (
          <button onClick={() => setAdding(true)}
            className="text-ninja-blue font-ninja text-sm font-semibold hover:underline">
            + Add file
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleAdd} className="mb-4 space-y-3 p-3 bg-ninja-bg border border-ninja-border rounded-xl">
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
              placeholder="https://..."
              className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue" />
          ) : (
            <input type="file" onChange={(e) => setFile(e.target.files[0])}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm"
              className="w-full text-sm font-ninja text-ninja-muted file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-ninja file:font-semibold file:bg-ninja-blue file:text-white file:cursor-pointer cursor-pointer" />
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
        <p className="text-ninja-muted font-ninja text-sm italic">No resources yet.</p>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => {
            const badge = resourceTypeBadge(r);
            const addedDate = r.created_at
              ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : null;
            return (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-ninja-border last:border-0">
                <span className={`text-[10px] font-ninja font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${badge.bg} ${badge.text} ${badge.border}`}>
                  {badge.label}
                </span>
                <div className="flex-1 min-w-0">
                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                    className="text-ninja-navy font-ninja font-semibold text-sm hover:text-ninja-blue transition-colors truncate block">
                    {r.title}
                  </a>
                  <p className="text-ninja-muted font-ninja text-xs mt-0.5">
                    {r.added_by}{addedDate ? ` · ${addedDate}` : ''}
                  </p>
                </div>
                {!isReadOnly && (
                  confirmDelete === r.id ? (
                    <div className="flex gap-1 flex-shrink-0">
                      <Button variant="danger" size="sm" onClick={() => handleDelete(r)}>Delete</Button>
                      <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDelete(r.id)}
                      className="text-ninja-muted hover:text-ninja-red text-sm flex-shrink-0 transition-colors">↓</button>
                  )
                )}
                {isReadOnly && (
                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                    className="text-ninja-muted hover:text-ninja-blue text-sm flex-shrink-0 transition-colors">↓</a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ClubProfilePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isReadOnly, viewAs } = useAuth();
  const isSenseiView = user?.role === 'admin' && viewAs === 'sensei';
  const isManager = ['manager', 'admin'].includes(user?.role) && !isSenseiView;

  const [clubDef, setClubDef] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [profile, setProfile] = useState(null);
  const [resources, setResources] = useState([]);
  const [memberCount, setMemberCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
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
        setMemberCount(profileData.member_count || 0);
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [slug, user?.activeLocation?.id]);

  if (notFound) return <Layout><p className="text-ninja-red font-ninja text-center py-12">Club not found.</p></Layout>;
  if (loading || !clubDef) return <Layout><p className="text-ninja-muted font-ninja text-center py-12">Loading...</p></Layout>;

  const colors = getClubColors(clubDef);
  const locationName = user?.activeLocation?.name ?? '';

  return (
    <Layout>
      <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={fadeUp} className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <button onClick={() => navigate('/clubs')}
              className="text-ninja-muted hover:text-ninja-blue font-ninja text-sm flex items-center gap-1 transition-colors mb-2">
              ← Back to Clubs
            </button>
            <h1 className="text-2xl sm:text-3xl font-bold font-ninja text-ninja-navy">{clubDef.name}</h1>
            <p className="text-ninja-muted font-ninja text-sm mt-1">
              {locationName}
              {memberCount > 0 && ` · ${memberCount} member${memberCount !== 1 ? 's' : ''}`}
              {clubDef.schedule && ` · Meets ${clubDef.schedule}`}
            </p>
          </div>
          {isManager && !isReadOnly && (
            <Button onClick={() => navigate(`/clubs/log?club=${encodeURIComponent(clubDef.name)}`)}>
              + New session
            </Button>
          )}
        </motion.div>

        {/* Two-column body */}
        <motion.div variants={fadeUp} className="lg:flex lg:gap-6 lg:items-start space-y-5 lg:space-y-0">
          {/* Left: pinned note + sessions */}
          <div className="flex-1 min-w-0 space-y-5">
            <PinnedNoteSection
              clubName={clubDef.name}
              initialNote={profile?.pinned_note}
              initialAuthor={profile?.pinned_note_author}
              initialUpdatedAt={profile?.pinned_note_updated_at}
              isReadOnly={isReadOnly}
              onUpdated={(note) => setProfile((prev) => ({ ...prev, pinned_note: note, pinned_note_author: user?.displayName, pinned_note_updated_at: new Date().toISOString() }))}
            />
            <SessionsSection
              sessions={sessions}
              memberCount={memberCount}
              slug={slug}
              navigate={navigate}
              isManager={isManager}
              isReadOnly={isReadOnly}
              onDeleted={(id) => setSessions((prev) => prev.filter((s) => s.id !== id))}
            />
          </div>

          {/* Right: club info + resources */}
          <div className="lg:w-72 lg:flex-shrink-0 space-y-4">
            <ClubInfoCard
              clubDef={clubDef}
              colors={colors}
              isManager={isManager}
              isReadOnly={isReadOnly}
              onCoverUpdated={(url) => setClubDef((prev) => ({ ...prev, cover_image_url: url }))}
            />
            <ResourcesSection
              clubName={clubDef.name}
              clubSlug={slug}
              locationId={user?.activeLocation?.id}
              resources={resources}
              isReadOnly={isReadOnly}
            />
          </div>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
