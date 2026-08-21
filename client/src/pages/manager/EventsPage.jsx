import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CalendarIcon, ImageIcon, MegaphoneIcon, PlusIcon } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Modal from '../../components/ui/Modal';
import Logo from '../../components/ui/Logo';
import { CARD } from '../../lib/surfaces';
import { SkeletonCards } from '../../components/ui/Skeleton';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { uploadToSigned } from '../../lib/supabase';

// Events: the listings families see on the Parent Portal home, authored here
// the way they will be read there — title, hook line, banner image, a link to
// sign up. This is a different thing from the calendar: the calendar is the
// center's operational schedule for staff; a listing is a promotion written
// for parents, and the two never share a record so staff notes can never leak
// into a family's banner.

const EASE = [0.23, 1, 0.32, 1];

const field = 'w-full rounded-lg border border-ninja-border bg-white px-3 py-2 font-ninja text-sm text-ninja-navy placeholder:text-ninja-muted focus:outline-none focus:border-ninja-blue transition-colors';
const label = 'block font-ninja text-xs font-bold uppercase tracking-wide text-ninja-muted mb-1.5';
const optional = <span className="opacity-60 normal-case font-semibold">(optional)</span>;

function fmtDate(dIso) {
  if (!dIso) return null;
  const d = new Date(`${dIso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

const todayIso = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
};

function ListingForm({ initial, onSave, onCancel, busy, error }) {
  const [title, setTitle] = useState(initial.title || '');
  const [subtitle, setSubtitle] = useState(initial.subtitle || '');
  const [eventUrl, setEventUrl] = useState(initial.event_url || '');
  const [date, setDate] = useState(initial.event_date || '');
  // One stored string, two fields: "6:00 PM - 8:00 PM" round-trips through
  // the same separator it was joined with.
  const [timeStart, setTimeStart] = useState((initial.event_time || '').split(' - ')[0] || '');
  const [timeEnd, setTimeEnd] = useState((initial.event_time || '').split(' - ')[1] || '');
  const [description, setDescription] = useState(initial.description || '');
  // The image travels separately from the fields: a chosen file is held here
  // and uploaded after the listing row exists, because the attach route needs
  // an id to hang it on.
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initial.image_url || null);
  const [removeImage, setRemoveImage] = useState(false);
  const objectUrl = useRef(null);
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);

  const pickFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = URL.createObjectURL(f);
    setFile(f);
    setPreview(objectUrl.current);
    setRemoveImage(false);
  };

  const clearImage = () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setFile(null);
    setPreview(null);
    setRemoveImage(Boolean(initial.image_url));
  };

  const canSave = title.trim();
  const wasPublished = Boolean(initial.id) && initial.published !== false;
  const submit = (pub) => onSave(
    {
      title, subtitle, event_url: eventUrl, event_date: date || null,
      event_time: [timeStart.trim(), timeEnd.trim()].filter(Boolean).join(' - '),
      description, published: pub,
    },
    { file, removeImage },
  );

  return (
    <div className="space-y-5">
      {/* Two columns so the form reads as a desk, not a tunnel: the words on
          the left, the picture and the long text on the right. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
       <div className="space-y-4">
      <div>
        <label className={label}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
          placeholder="e.g. Parent's Night Out" className={field} autoFocus />
      </div>

      <div>
        <label className={label}>Subtitle {optional}</label>
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} maxLength={200}
          placeholder="e.g. Drop them off. Just remember to pick them up!" className={field} />
      </div>

      <div>
        <label className={label}>Sign-up link {optional}</label>
        <input value={eventUrl} onChange={(e) => setEventUrl(e.target.value)} maxLength={500} type="url"
          placeholder="https://…" className={field} />
        <p className="font-ninja text-xs text-ninja-muted mt-1">Where the banner sends a family who taps it: a MyStudio event page, a form, anything.</p>
      </div>

      <div>
        <label className={label}>Date {optional}</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Starts {optional}</label>
          <input value={timeStart} onChange={(e) => setTimeStart(e.target.value)} maxLength={18}
            placeholder="e.g. 6:00 PM" className={field} />
        </div>
        <div>
          <label className={label}>Ends {optional}</label>
          <input value={timeEnd} onChange={(e) => setTimeEnd(e.target.value)} maxLength={18}
            placeholder="e.g. 8:00 PM" className={field} />
        </div>
      </div>
      <p className="font-ninja text-xs text-ninja-muted -mt-2">With a date, the banner comes down by itself once the day passes. Without one, it stays up until you unpublish it.</p>
       </div>

       <div className="space-y-4">
      <div>
        <label className={label}>Banner image {optional}</label>
        {preview ? (
          <div>
            <img src={preview} alt="" className="w-full aspect-[2/1] object-cover rounded-xl border border-ninja-border" />
            <div className="flex items-center gap-3 mt-1.5">
              <label className="font-ninja text-xs font-bold text-ninja-blue hover:underline cursor-pointer rounded">
                Replace
                <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
              </label>
              <button type="button" onClick={clearImage} className="font-ninja text-xs font-bold text-ninja-muted hover:text-ninja-navy rounded">Remove</button>
            </div>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-1.5 w-full aspect-[2/1] rounded-xl border-2 border-dashed border-ninja-border hover:border-ninja-blue text-ninja-muted hover:text-ninja-blue cursor-pointer transition-colors">
            <ImageIcon size={22} strokeWidth={1.8} aria-hidden />
            <span className="font-ninja text-xs font-bold">Add an image</span>
            <span className="font-ninja text-[11px]">wide works best, about 1600 × 800</span>
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
          </label>
        )}
      </div>

      <div>
        <label className={label}>Description {optional}</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={6}
          placeholder="What families should know. Parents read this word for word." className={`${field} resize-none`} />
      </div>
       </div>
      </div>

      {error && <p className="font-ninja text-sm text-ninja-red">{error}</p>}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button onClick={onCancel} className="font-ninja text-sm font-bold text-ninja-muted hover:text-ninja-navy px-2 py-2 rounded">Cancel</button>
        <button
          onClick={() => submit(false)}
          disabled={busy || !canSave}
          className="font-ninja text-sm font-bold px-4 py-2 rounded-lg border border-ninja-border bg-white text-ninja-navy hover:bg-ninja-bg transition-colors disabled:opacity-50">
          {wasPublished ? 'Move to draft' : 'Save draft'}
        </button>
        <button
          onClick={() => submit(true)}
          disabled={busy || !canSave}
          className="font-ninja text-sm font-bold px-4 py-2 rounded-lg bg-ninja-blue text-white transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:opacity-50 disabled:active:scale-100">
          {busy ? 'Saving…' : wasPublished ? 'Save' : 'Publish'}
        </button>
      </div>
    </div>
  );
}

function ListingCard({ listing, canManage, onEdit, onDelete, onTogglePublished }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const past = listing.event_date && listing.event_date < todayIso();
  const when = [fmtDate(listing.event_date), listing.event_time].filter(Boolean).join(' · ');
  const status = past ? 'Ended' : listing.published ? 'Live for families' : 'Draft';
  return (
    <article className={`${CARD} overflow-hidden flex flex-col`}>
      <div className="relative">
        {listing.image_url ? (
          <img src={listing.image_url} alt="" className="w-full aspect-[2/1] object-cover" />
        ) : (
          <div className="w-full aspect-[2/1] flex items-center justify-center text-white/80"
            style={{ background: 'linear-gradient(135deg, #12264d 0%, #0b3d8f 100%)' }}>
            <Logo variant="mark" className="h-10" />
          </div>
        )}
        {/* The whole status in one dot on the banner's corner: green live,
            amber draft, gray ended. The word lives in the tooltip. */}
        <span
          role="img"
          title={status}
          aria-label={status}
          className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full"
          style={{ background: past ? '#94a3b8' : listing.published ? '#22c55e' : '#f59e0b', boxShadow: '0 0 0 3px rgb(10 16 32 / 0.45)' }}
        />
      </div>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="min-w-0">
          <h3 className="font-ninja font-extrabold text-[16px] text-ninja-navy leading-tight truncate">{listing.title}</h3>
          {listing.subtitle && <p className="font-ninja text-[12.5px] text-ninja-muted truncate mt-0.5">{listing.subtitle}</p>}
        </div>
        {when && (
          <p className="flex items-center gap-1 font-ninja text-xs text-ninja-muted"><CalendarIcon size={12} aria-hidden />{when}</p>
        )}
        {canManage && (
          <div className="flex items-center gap-3 pt-1 mt-auto">
            <button onClick={onEdit} className="font-ninja text-sm font-bold text-ninja-blue hover:underline rounded">Edit</button>
            {!past && (
              <button onClick={onTogglePublished} className="font-ninja text-sm font-bold text-ninja-muted hover:text-ninja-navy rounded">
                {listing.published ? 'Unpublish' : 'Publish'}
              </button>
            )}
            <span className="flex-1" />
            {confirmDel ? (
              <span className="flex items-center gap-2">
                <button onClick={onDelete} className="font-ninja text-sm font-bold px-2.5 py-1 rounded-lg bg-ninja-red text-white">Delete</button>
                <button onClick={() => setConfirmDel(false)} className="font-ninja text-sm font-bold text-ninja-muted hover:text-ninja-navy rounded">Keep</button>
              </span>
            ) : (
              <button onClick={() => setConfirmDel(true)} className="font-ninja text-sm font-bold text-ninja-red hover:underline rounded">Delete</button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default function EventsPage() {
  const { isReadOnly } = useAuth();
  const canManage = !isReadOnly;
  const [listings, setListings] = useState(null);
  const [editor, setEditor] = useState(null); // { listing } — add uses {}
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let alive = true;
    api.get('/event-listings')
      .then((rows) => { if (alive) setListings(rows || []); })
      .catch(() => { if (alive) setListings([]); });
    return () => { alive = false; };
  }, []);

  const save = async (payload, { file, removeImage }) => {
    setBusy(true);
    setFormError('');
    try {
      const editing = editor?.listing?.id;
      let saved = editing
        ? await api.patch(`/event-listings/${editing}`, payload)
        : await api.post('/event-listings', payload);
      if (file) {
        const { bucket, path, token } = await api.post('/storage/event-image', { contentType: file.type });
        await uploadToSigned(bucket, path, token, file, file.type);
        const { image_url } = await api.patch(`/event-listings/${saved.id}/image`, { path });
        saved = { ...saved, image_url };
      } else if (removeImage && editing) {
        await api.patch(`/event-listings/${saved.id}/image`, { path: null });
        saved = { ...saved, image_url: null };
      }
      setListings((prev) => editing ? prev.map((l) => (l.id === saved.id ? saved : l)) : [saved, ...prev]);
      setEditor(null);
    } catch (err) {
      setFormError(err.message || 'Could not save the listing.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    const previous = listings;
    setListings((prev) => prev.filter((l) => l.id !== id));
    try { await api.delete(`/event-listings/${id}`); }
    catch { setListings(previous); }
  };

  const togglePublished = async (listing) => {
    const next = { ...listing, published: !listing.published };
    setListings((prev) => prev.map((l) => (l.id === listing.id ? next : l)));
    try {
      const saved = await api.patch(`/event-listings/${listing.id}`, {
        title: listing.title, subtitle: listing.subtitle, description: listing.description,
        event_url: listing.event_url, event_date: listing.event_date, event_time: listing.event_time,
        published: !listing.published,
      });
      setListings((prev) => prev.map((l) => (l.id === saved.id ? { ...saved, image_url: l.image_url } : l)));
    } catch {
      setListings((prev) => prev.map((l) => (l.id === listing.id ? listing : l)));
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}
          className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-ninja font-extrabold text-2xl text-ninja-navy">Events</h1>
            <p className="font-ninja text-sm text-ninja-muted mt-0.5">What families see on the Parent Portal home. Listings rotate there like a slideshow.</p>
          </div>
          {canManage && (
            <button type="button" onClick={() => { setFormError(''); setEditor({ listing: {} }); }}
              className="flex-shrink-0 inline-flex items-center gap-1.5 font-ninja text-sm font-bold px-3.5 py-2 rounded-lg bg-ninja-blue text-white transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]">
              <PlusIcon size={15} strokeWidth={2.75} aria-hidden />
              New listing
            </button>
          )}
        </motion.header>

        {listings === null ? (
          <SkeletonCards count={3} cols="sm:grid-cols-2 xl:grid-cols-3" height={260} label="Loading events" />
        ) : listings.length === 0 ? (
          <div className={`${CARD} p-10 text-center space-y-1.5`}>
            <MegaphoneIcon size={26} strokeWidth={1.6} className="mx-auto text-ninja-muted" aria-hidden />
            <p className="font-ninja font-bold text-ninja-navy">Nothing listed yet.</p>
            <p className="font-ninja text-sm text-ninja-muted">Create a listing and it appears as a banner on every family's home page.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l} canManage={canManage}
                onEdit={() => { setFormError(''); setEditor({ listing: l }); }}
                onDelete={() => remove(l.id)}
                onTogglePublished={() => togglePublished(l)} />
            ))}
          </div>
        )}
      </div>

      {/* Centered and wide, not a side panel: authoring a listing is a
          sit-down task, and two columns keep it from becoming a tall
          tunnel of fields. */}
      <Modal isOpen={!!editor} onClose={() => setEditor(null)} title={editor?.listing?.id ? 'Edit listing' : 'New listing'} width="max-w-3xl">
        {editor && (
          <ListingForm initial={editor.listing} onSave={save} onCancel={() => setEditor(null)} busy={busy} error={formError} />
        )}
      </Modal>
    </Layout>
  );
}
