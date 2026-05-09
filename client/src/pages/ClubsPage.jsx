import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Button from '../components/ui/Button';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { COLOR_SETS, toSlug } from '../utils/clubUtils';

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

function ClubCard({ club, onClick }) {
  const c = COLOR_SETS[club.color_key] || COLOR_SETS.blue;
  return (
    <button
      onClick={onClick}
      className="bg-white border border-ninja-border rounded-2xl p-6 shadow-sm text-left hover:border-ninja-blue hover:shadow-md transition-all group"
    >
      <div className="mb-4">
        <span className={`inline-block text-sm font-ninja font-bold px-3 py-1 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
          {club.name}
        </span>
        {club.location_id && (
          <span className="ml-2 text-ninja-muted font-ninja text-xs">Custom</span>
        )}
      </div>
      <p className="text-ninja-muted font-ninja text-sm leading-relaxed">
        {club.description || 'No description yet.'}
      </p>
      <p className="text-ninja-blue font-ninja font-semibold text-sm mt-4 group-hover:underline">
        View Club →
      </p>
    </button>
  );
}

function CreateClubModal({ onCreated, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorKey, setColorKey] = useState('blue');
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
      });
      onCreated(club);
    } catch (err) {
      setError(err?.message || 'Failed to create club.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
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
    </div>
  );
}

export default function ClubsPage() {
  const navigate = useNavigate();
  const { user, isReadOnly } = useAuth();
  const isManager = user?.role === 'manager';

  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

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
          <p className="text-ninja-muted font-ninja text-center py-12 italic">No clubs yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {clubs.map((club) => (
              <ClubCard
                key={club.id}
                club={club}
                onClick={() => navigate(`/clubs/${club.slug}`)}
              />
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
    </Layout>
  );
}
