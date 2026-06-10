import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import Markdown from '../../components/shared/Markdown';
import { api } from '../../api/client';
import { supabase } from '../../lib/supabase';
import { SIGNED_TTL, extractStoragePath } from '../../lib/supabase';

const BUCKET = 'club-resources'; // reuse existing private bucket; media stored under releases/

function AdminNav() {
  const path = window.location.pathname;
  const links = [
    { to: '/admin/locations', label: 'Locations' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/curriculum', label: 'Curriculum' },
    { to: '/admin/releases', label: 'Releases' },
    { to: '/admin/onboarding', label: 'Onboarding' },
    { to: '/admin/settings', label: 'Settings' },
  ];
  return (
    <div className="flex items-center gap-4 mb-6 border-b border-ninja-border pb-4 overflow-x-auto no-scrollbar">
      {links.map((l) => (
        <a
          key={l.to}
          href={l.to}
          className={`font-ninja text-sm font-semibold transition-colors whitespace-nowrap ${
            path === l.to
              ? 'text-ninja-navy border-b-2 border-ninja-blue pb-0.5'
              : 'text-ninja-muted hover:text-ninja-navy'
          }`}
        >
          {l.label}
        </a>
      ))}
    </div>
  );
}

const EMPTY = { id: null, title: '', version: '', body_md: '', media: [], published: false };

function formatDate(d) {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date) ? '' : date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ReleasesPage() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(EMPTY);
  const [editing, setEditing] = useState(false);
  const [preview, setPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => {
    setLoading(true);
    api.get('/releases/all')
      .then((rows) => setList(Array.isArray(rows) ? rows : []))
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const startNew = () => { setDraft(EMPTY); setEditing(true); setPreview(false); setError(''); };
  const startEdit = (r) => {
    setDraft({ id: r.id, title: r.title, version: r.version || '', body_md: r.body_md || '', media: r.media || [], published: r.published });
    setEditing(true); setPreview(false); setError('');
  };
  const cancel = () => { setEditing(false); setDraft(EMPTY); setError(''); };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    setError('');
    try {
      const added = [];
      for (const file of files) {
        const isVideo = file.type.startsWith('video/');
        const isImage = file.type.startsWith('image/');
        if (!isVideo && !isImage) { setError('Only images and videos allowed'); continue; }
        if (file.size > 50 * 1024 * 1024) { setError('Files must be under 50MB'); continue; }
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `releases/${Date.now()}_${safe}`;
        const { data, error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });
        if (upErr) throw new Error(upErr.message);
        const { data: signed, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(data.path, SIGNED_TTL);
        if (signErr) throw new Error(signErr.message);
        added.push({ type: isVideo ? 'video' : 'image', url: signed.signedUrl });
      }
      setDraft((d) => ({ ...d, media: [...d.media, ...added] }));
    } catch (err) {
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeMedia = async (idx) => {
    const item = draft.media[idx];
    setDraft((d) => ({ ...d, media: d.media.filter((_, i) => i !== idx) }));
    try {
      const p = extractStoragePath(item.url, BUCKET);
      if (p) await supabase.storage.from(BUCKET).remove([p]);
    } catch {}
  };

  const moveMedia = (idx, dir) => {
    setDraft((d) => {
      const m = [...d.media];
      const j = idx + dir;
      if (j < 0 || j >= m.length) return d;
      [m[idx], m[j]] = [m[j], m[idx]];
      return { ...d, media: m };
    });
  };

  const save = async (publish) => {
    if (!draft.title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    const payload = {
      title: draft.title.trim(),
      version: draft.version.trim(),
      body_md: draft.body_md,
      media: draft.media,
      published: publish !== undefined ? publish : draft.published,
    };
    try {
      if (draft.id) await api.patch(`/releases/${draft.id}`, payload);
      else await api.post('/releases', payload);
      setEditing(false);
      setDraft(EMPTY);
      load();
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async (id) => {
    try { await api.delete(`/releases/${id}`); setConfirmDelete(null); load(); }
    catch (err) { setError(err.message || 'Delete failed'); }
  };

  const togglePublish = async (r) => {
    try { await api.patch(`/releases/${r.id}`, { published: !r.published }); load(); }
    catch (err) { setError(err.message || 'Update failed'); }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <AdminNav />

        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-2xl font-black font-ninja text-ninja-navy">Release Notes</h1>
            <p className="text-ninja-muted font-ninja text-sm mt-1">Published updates pop up for all staff and appear on the What's New page.</p>
          </div>
          {!editing && (
            <button onClick={startNew} className="flex-shrink-0 px-4 py-2 rounded-xl bg-ninja-blue text-white font-ninja font-semibold text-sm hover:bg-ninja-blue/90 transition-colors">
              + New
            </button>
          )}
        </div>

        {error && <div className="mb-4 px-4 py-2.5 rounded-xl bg-ninja-red/10 text-ninja-red font-ninja text-sm">{error}</div>}

        {editing && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-ninja-border rounded-2xl p-5 mb-6 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 mb-3">
              <div className="flex-1">
                <label className="block text-xs font-ninja font-semibold text-ninja-muted mb-1">Title</label>
                <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} maxLength={120}
                  placeholder="e.g. Faster mobile navigation"
                  className="w-full px-3 py-2 rounded-xl border border-ninja-border bg-ninja-bg font-ninja text-sm text-ninja-navy focus:outline-none focus:border-ninja-blue" />
              </div>
              <div className="sm:w-32">
                <label className="block text-xs font-ninja font-semibold text-ninja-muted mb-1">Version (optional)</label>
                <input value={draft.version} onChange={(e) => setDraft({ ...draft, version: e.target.value })} maxLength={30}
                  placeholder="v1.4"
                  className="w-full px-3 py-2 rounded-xl border border-ninja-border bg-ninja-bg font-ninja text-sm text-ninja-navy focus:outline-none focus:border-ninja-blue" />
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-ninja font-semibold text-ninja-muted">Body (Markdown)</label>
                <button onClick={() => setPreview((p) => !p)} className="text-xs font-ninja font-semibold text-ninja-blue hover:underline">
                  {preview ? 'Edit' : 'Preview'}
                </button>
              </div>
              {preview ? (
                <div className="min-h-[8rem] px-3 py-2 rounded-xl border border-ninja-border bg-ninja-bg">
                  <Markdown>{draft.body_md || '_Nothing to preview_'}</Markdown>
                </div>
              ) : (
                <textarea value={draft.body_md} onChange={(e) => setDraft({ ...draft, body_md: e.target.value })} rows={8}
                  placeholder="What changed? Supports **bold**, lists, [links](url), headings…"
                  className="w-full px-3 py-2 rounded-xl border border-ninja-border bg-ninja-bg font-ninja text-sm text-ninja-navy focus:outline-none focus:border-ninja-blue resize-y" />
              )}
            </div>

            <div className="mb-4">
              <label className="block text-xs font-ninja font-semibold text-ninja-muted mb-2">Media (images &amp; looping videos)</label>
              {draft.media.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  {draft.media.map((m, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-ninja-border bg-black/5">
                      {m.type === 'video'
                        ? <video src={m.url} muted loop playsInline className="w-full h-24 object-cover" />
                        : <img src={m.url} alt="" className="w-full h-24 object-cover" />}
                      <div className="absolute inset-x-0 bottom-0 flex justify-between p-1 bg-gradient-to-t from-black/60 to-transparent">
                        <div className="flex gap-1">
                          <button onClick={() => moveMedia(i, -1)} className="w-6 h-6 rounded bg-white/80 text-ninja-navy text-xs font-bold" aria-label="Move left">←</button>
                          <button onClick={() => moveMedia(i, 1)} className="w-6 h-6 rounded bg-white/80 text-ninja-navy text-xs font-bold" aria-label="Move right">→</button>
                        </div>
                        <button onClick={() => removeMedia(i)} className="w-6 h-6 rounded bg-ninja-red text-white text-xs font-bold" aria-label="Remove">✕</button>
                      </div>
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/50 text-white text-[10px] font-ninja">{m.type}</span>
                    </div>
                  ))}
                </div>
              )}
              <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-ninja-border font-ninja text-sm cursor-pointer hover:border-ninja-blue transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''} text-ninja-navy`}>
                {uploading ? 'Uploading…' : '+ Add images / video'}
                <input type="file" accept="image/*,video/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-ninja-border">
              <button onClick={() => save(true)} disabled={saving || uploading}
                className="px-4 py-2 rounded-xl bg-ninja-blue text-white font-ninja font-semibold text-sm hover:bg-ninja-blue/90 transition-colors disabled:opacity-50">
                {draft.published ? 'Save & keep live' : 'Publish'}
              </button>
              <button onClick={() => save(false)} disabled={saving || uploading}
                className="px-4 py-2 rounded-xl bg-ninja-bg border border-ninja-border text-ninja-navy font-ninja font-semibold text-sm hover:border-ninja-blue transition-colors disabled:opacity-50">
                Save as draft
              </button>
              <button onClick={cancel} disabled={saving}
                className="px-4 py-2 rounded-xl text-ninja-muted font-ninja font-semibold text-sm hover:text-ninja-navy transition-colors ml-auto">
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {loading ? (
          <p className="text-ninja-muted font-ninja text-sm">Loading…</p>
        ) : list.length === 0 && !editing ? (
          <div className="bg-ninja-border/10 border border-ninja-border rounded-2xl p-8 text-center">
            <p className="text-ninja-muted font-ninja text-sm">No releases yet. Create your first update.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((r) => (
              <div key={r.id} className="bg-white border border-ninja-border rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-ninja font-bold text-ninja-navy truncate">{r.title}</h3>
                      {r.version && <span className="px-2 py-0.5 rounded-full bg-ninja-blue/10 text-ninja-blue text-xs font-ninja font-semibold">{r.version}</span>}
                      <span className={`px-2 py-0.5 rounded-full text-xs font-ninja font-semibold ${r.published ? 'bg-green-500/10 text-green-600' : 'bg-ninja-muted/15 text-ninja-muted'}`}>
                        {r.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-ninja-muted font-ninja text-xs mt-1">
                      {r.published && r.published_at ? `Published ${formatDate(r.published_at)}` : `Created ${formatDate(r.created_at)}`}
                      {Array.isArray(r.media) && r.media.length ? ` · ${r.media.length} media` : ''}
                    </p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1">
                    <button onClick={() => togglePublish(r)} className="px-2.5 py-1 rounded-lg font-ninja text-xs font-semibold text-ninja-blue hover:bg-ninja-blue/10 transition-colors">
                      {r.published ? 'Unpublish' : 'Publish'}
                    </button>
                    <button onClick={() => startEdit(r)} className="px-2.5 py-1 rounded-lg font-ninja text-xs font-semibold text-ninja-navy hover:bg-ninja-bg transition-colors">Edit</button>
                    {confirmDelete === r.id ? (
                      <>
                        <button onClick={() => doDelete(r.id)} className="px-2.5 py-1 rounded-lg font-ninja text-xs font-semibold text-white bg-ninja-red">Delete</button>
                        <button onClick={() => setConfirmDelete(null)} className="px-2.5 py-1 rounded-lg font-ninja text-xs font-semibold text-ninja-muted hover:text-ninja-navy">Cancel</button>
                      </>
                    ) : (
                      <button onClick={() => setConfirmDelete(r.id)} className="px-2.5 py-1 rounded-lg font-ninja text-xs font-semibold text-ninja-red hover:bg-ninja-red/10 transition-colors">Delete</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
