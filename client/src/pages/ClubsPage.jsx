import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { COLOR_SETS, toSlug } from '../utils/clubUtils';
import ModalPortal from '../components/ui/ModalPortal';

const COLOR_OPTIONS = [
  { key: 'purple', label: 'Purple' },
  { key: 'green',  label: 'Green'  },
  { key: 'red',    label: 'Red'    },
  { key: 'blue',   label: 'Blue'   },
  { key: 'orange', label: 'Orange' },
  { key: 'teal',   label: 'Teal'   },
  { key: 'pink',   label: 'Pink'   },
  { key: 'indigo', label: 'Indigo' },
  { key: 'yellow', label: 'Yellow' },
];

function ClubCard({ club, onClick, onDelete, onEdit, canManage }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [coverError, setCoverError] = useState(false);
  const c = COLOR_SETS[club.color_key] || COLOR_SETS.blue;
  const initial = (club.name?.trim()?.[0] || '?').toUpperCase();
  const hasCover = club.cover_image_url && !coverError;

  const handleDelete = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await onDelete(club.id);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="relative h-full flex flex-col bg-white border border-ninja-border rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group overflow-hidden">
      <button onClick={onClick} className="flex-1 flex flex-col text-left">
        {/* Identity header — cover image or a color wash with a faded monogram */}
        <div
          className="relative h-20 overflow-hidden"
          style={hasCover ? undefined : { background: `linear-gradient(135deg, ${c.solid} 0%, ${c.solid}b3 100%)` }}
        >
          {hasCover ? (
            <img src={club.cover_image_url} alt={club.name} onError={() => setCoverError(true)} className="w-full h-full object-cover" />
          ) : (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 font-ninja font-black text-white/15 leading-none select-none" style={{ fontSize: '3.75rem' }}>
              {initial}
            </span>
          )}
        </div>

        <div className="flex-1 flex flex-col px-5 pt-4 pb-4">
          <h3 className="text-ninja-navy font-ninja font-bold text-lg leading-snug line-clamp-2">{club.name}</h3>

          {club.schedule && (
            <div className="flex items-center gap-1.5 mt-1.5 text-ninja-muted font-ninja text-xs font-semibold">
              <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
              </svg>
              <span className="truncate">{club.schedule}</span>
            </div>
          )}

          {club.description && (
            <p className="text-ninja-muted font-ninja text-sm leading-relaxed mt-2 line-clamp-2">{club.description}</p>
          )}

          <span className="mt-auto pt-4 inline-flex items-center gap-1 text-ninja-muted group-hover:text-ninja-blue font-ninja font-semibold text-sm transition-colors">
            View club
            <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
          </span>
        </div>
      </button>

      {canManage && (
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {confirming ? (
            <>
              <button onClick={handleDelete} disabled={deleting}
                className="text-xs font-ninja font-semibold text-white bg-ninja-red px-2 py-1 rounded-lg shadow disabled:opacity-50">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
              <button onClick={() => setConfirming(false)}
                className="text-xs font-ninja font-semibold text-ninja-navy bg-white/90 px-2 py-1 rounded-lg shadow">
                Cancel
              </button>
            </>
          ) : (
            <>
              <button onClick={(e) => { e.stopPropagation(); onEdit(club); }} title="Edit club"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-white bg-black/25 hover:bg-black/40 backdrop-blur-sm p-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button onClick={() => setConfirming(true)} title="Delete club"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-white bg-black/25 hover:bg-ninja-red backdrop-blur-sm p-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EditClubModal({ club, onSaved, onClose }) {
  const [name, setName] = useState(club.name);
  const [description, setDescription] = useState(club.description || '');
  const [colorKey, setColorKey] = useState(club.color_key || 'blue');
  const [schedule, setSchedule] = useState(club.schedule || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const slug = name.trim() ? toSlug(name.trim()) : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Club name is required.');
    setSaving(true);
    setError('');
    try {
      const updated = await api.patch(`/clubs/definitions/${club.id}`, {
        name: name.trim(),
        description: description.trim() || undefined,
        color_key: colorKey,
        schedule: schedule.trim() || undefined,
      });
      onSaved(updated);
    } catch (err) {
      setError(err?.message || 'Failed to update club.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal><div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-ninja-navy font-ninja font-bold text-xl mb-4">Edit Club</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1">
              Club Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
            />
            {slug && (
              <p className="text-ninja-muted font-ninja text-xs mt-1">URL: /clubs/{slug}</p>
            )}
          </div>

          <div>
            <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1">
              Description <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What do students do in this club?"
              rows={2}
              className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue resize-none"
            />
          </div>

          <div>
            <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-2">
              Badge Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((opt) => {
                const c = COLOR_SETS[opt.key];
                const selected = colorKey === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setColorKey(opt.key)}
                    className={`px-3 py-1 rounded-full text-xs font-ninja font-semibold border transition-all ${c.bg} ${c.text} ${c.border} ${
                      selected ? 'ring-2 ring-offset-1 ring-ninja-blue' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-ninja-red font-ninja text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div></ModalPortal>
  );
}

function CreateClubModal({ onCreated, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorKey, setColorKey] = useState('blue');
  const [schedule, setSchedule] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const slug = name.trim() ? toSlug(name.trim()) : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Club name is required.');
    setSaving(true);
    setError('');
    try {
      const club = await api.post('/clubs/definitions', {
        name: name.trim(),
        description: description.trim() || undefined,
        color_key: colorKey,
        schedule: schedule.trim() || undefined,
      });
      onCreated(club);
    } catch (err) {
      setError(err?.message || 'Failed to create club.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalPortal><div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 overflow-y-auto bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-ninja-navy font-ninja font-bold text-xl mb-4">Create New Club</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1">
              Club Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Coding Club"
              autoFocus
              className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
            />
            {slug && (
              <p className="text-ninja-muted font-ninja text-xs mt-1">URL: /clubs/{slug}</p>
            )}
          </div>

          <div>
            <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1">
              Description <span className="normal-case font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What do students do in this club?"
              rows={2}
              className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue resize-none"
            />
          </div>

          <div>
            <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-2">
              Badge Color
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((opt) => {
                const c = COLOR_SETS[opt.key];
                const selected = colorKey === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setColorKey(opt.key)}
                    className={`px-3 py-1 rounded-full text-xs font-ninja font-semibold border transition-all ${c.bg} ${c.text} ${c.border} ${
                      selected ? 'ring-2 ring-offset-1 ring-ninja-blue' : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="text-ninja-red font-ninja text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Creating...' : 'Create Club'}
            </Button>
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div></ModalPortal>
  );
}

export default function ClubsPage() {
  const navigate = useNavigate();
  const { user, isReadOnly, viewAs } = useAuth();
  const isSenseiView = user?.role === 'admin' && viewAs === 'sensei';
  const isManager = ['manager', 'admin'].includes(user?.role) && !isSenseiView;

  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingClub, setEditingClub] = useState(null);

  const handleDeleteClub = async (id) => {
    await api.delete(`/clubs/definitions/${id}`);
    setClubs((prev) => prev.filter((c) => c.id !== id));
  };

  useEffect(() => {
    api.get('/clubs/definitions')
      .then(setClubs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.activeLocation?.id]);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold font-ninja text-ninja-navy tracking-wide">
              Clubs
            </h1>
            <p className="text-ninja-muted font-ninja mt-1">Weekly optional clubs at your center.</p>
          </div>
          {isManager && !isReadOnly && (
            <Button onClick={() => setShowCreate(true)}>+ Create Club</Button>
          )}
        </div>

        {loading ? (
          <p className="text-ninja-muted font-ninja text-center py-12">Loading...</p>
        ) : clubs.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <img src="/CodeNinjasIcon.svg" alt="" className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-ninja-muted font-ninja italic">No clubs yet.</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {clubs.map((club, i) => (
              <motion.div
                key={club.id}
                className="h-full"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.28, ease: 'easeOut' }}
              >
                <ClubCard
                  club={club}
                  onClick={() => navigate(`/clubs/${club.slug}`)}
                  canManage={isManager && !isReadOnly && !!club.location_id}
                  onDelete={handleDeleteClub}
                  onEdit={setEditingClub}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateClubModal
          onCreated={(club) => {
            setClubs((prev) => [...prev, club]);
            setShowCreate(false);
          }}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editingClub && (
        <EditClubModal
          club={editingClub}
          onSaved={(updated) => {
            setClubs((prev) => prev.map((c) => c.id === updated.id ? updated : c));
            setEditingClub(null);
          }}
          onClose={() => setEditingClub(null)}
        />
      )}
    </Layout>
  );
}
