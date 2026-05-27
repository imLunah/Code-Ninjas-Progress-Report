import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import { api } from '../../api/client';

function AdminNav() {
  return (
    <div className="flex items-center gap-4 mb-6 border-b border-ninja-border pb-4">
      <a href="/admin/locations" className="text-ninja-navy font-ninja text-sm font-semibold border-b-2 border-ninja-blue pb-0.5">Locations</a>
      <a href="/admin/curriculum" className="text-ninja-muted hover:text-ninja-navy font-ninja text-sm transition-colors">Curriculum</a>
    </div>
  );
}

function TempPasswordModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(
      `Location: ${data.location.name}\nUsername: ${data.manager.username}\nTemp Password: ${data.temp_password}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">🎉</span>
          <h2 className="text-ninja-navy font-ninja font-bold text-lg">Location Created!</h2>
        </div>
        <p className="text-ninja-muted font-ninja text-xs mb-5">
          Save these credentials — the password will not be shown again.
        </p>

        <div className="bg-ninja-bg rounded-xl p-4 space-y-2 font-mono text-sm mb-5">
          <div><span className="text-ninja-muted">Location:</span> <span className="text-ninja-navy font-semibold">{data.location.name}</span></div>
          <div><span className="text-ninja-muted">Slug:</span> <span className="text-ninja-navy">{data.location.slug}</span></div>
          <div><span className="text-ninja-muted">Manager username:</span> <span className="text-ninja-navy">{data.manager.username}</span></div>
          <div><span className="text-ninja-muted">Temp password:</span> <span className="text-ninja-red font-bold">{data.temp_password}</span></div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={copy}
            className="flex-1 bg-ninja-blue text-white font-ninja font-semibold rounded-xl py-2 text-sm transition-opacity hover:opacity-90"
          >
            {copied ? 'Copied!' : 'Copy to Clipboard'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-ninja-bg text-ninja-navy font-ninja font-semibold rounded-xl py-2 text-sm border border-ninja-border hover:bg-ninja-border transition-colors"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AddLocationModal({ onClose, onAdded }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [managerUsername, setManagerUsername] = useState('');
  const [managerDisplayName, setManagerDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const autoSlug = (val) => val.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleNameChange = (val) => {
    setName(val);
    if (!slug || slug === autoSlug(name)) setSlug(autoSlug(val));
    if (!managerUsername || managerUsername === `cd_${autoSlug(name)}`) {
      setManagerUsername(`cd_${autoSlug(val)}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !slug.trim() || !managerUsername.trim() || !managerDisplayName.trim()) {
      return setError('All fields are required.');
    }
    setSaving(true);
    try {
      const result = await api.post('/admin/locations', {
        name: name.trim(),
        slug: slug.trim(),
        manager_username: managerUsername.trim(),
        manager_display_name: managerDisplayName.trim(),
      });
      onAdded(result);
    } catch (err) {
      setError(err?.message || 'Failed to create location.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue';
  const labelClass = 'block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
      >
        <h2 className="text-ninja-navy font-ninja font-bold text-lg mb-1">Add New Location</h2>
        <p className="text-ninja-muted font-ninja text-xs mb-5">A manager account will be created automatically.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Location Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Code Ninjas San Diego"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Slug <span className="normal-case text-ninja-muted font-normal">(URL-friendly ID)</span></label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="san-diego"
              className={inputClass}
            />
          </div>
          <div className="border-t border-ninja-border pt-4">
            <p className="text-ninja-muted font-ninja text-xs mb-3 font-semibold uppercase tracking-wide">Initial Manager Account</p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Username</label>
                <input
                  type="text"
                  value={managerUsername}
                  onChange={(e) => setManagerUsername(e.target.value)}
                  placeholder="cd_san-diego"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Display Name</label>
                <input
                  type="text"
                  value={managerDisplayName}
                  onChange={(e) => setManagerDisplayName(e.target.value)}
                  placeholder="San Diego Manager"
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {error && <p className="text-ninja-red text-xs font-ninja">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-ninja-blue text-white font-ninja font-semibold rounded-xl py-2 text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving ? 'Creating…' : 'Create Location'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-ninja-bg text-ninja-navy font-ninja font-semibold rounded-xl py-2 text-sm border border-ninja-border hover:bg-ninja-border transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [createdData, setCreatedData] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/locations');
      setLocations(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdded = (result) => {
    setShowAdd(false);
    setCreatedData(result);
    load();
  };

  const handleDelete = async (id) => {
    setDeleteError('');
    setDeletingId(id);
    try {
      await api.delete(`/admin/locations/${id}`);
      setConfirmDeleteId(null);
      load();
    } catch (err) {
      setDeleteError(err?.message || 'Failed to delete location.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <AdminNav />
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-ninja-navy font-ninja font-bold text-2xl">Locations</h1>
            <p className="text-ninja-muted font-ninja text-sm mt-0.5">Manage Code Ninjas centers</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-ninja-blue text-white font-ninja font-semibold rounded-xl px-4 py-2 text-sm hover:opacity-90 transition-opacity"
          >
            + Add Location
          </button>
        </div>

        {loading ? (
          <p className="text-ninja-muted font-ninja text-center py-12">Loading…</p>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {locations.map((loc) => (
                <motion.div
                  key={loc.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white border border-ninja-border rounded-2xl p-4 flex items-center justify-between shadow-sm"
                >
                  <div>
                    <p className="text-ninja-navy font-ninja font-semibold">{loc.name}</p>
                    <p className="text-ninja-muted font-ninja text-xs mt-0.5">
                      slug: <span className="font-mono">{loc.slug}</span>
                      <span className="mx-2">·</span>
                      {loc.student_count} student{loc.student_count !== 1 ? 's' : ''}
                      <span className="mx-2">·</span>
                      {loc.staff_count} staff
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {confirmDeleteId === loc.id ? (
                      <>
                        <span className="text-ninja-red font-ninja text-xs">Delete?</span>
                        <button
                          onClick={() => handleDelete(loc.id)}
                          disabled={!!deletingId}
                          className="text-xs font-ninja font-semibold text-white bg-ninja-red rounded-lg px-3 py-1 hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {deletingId === loc.id ? 'Deleting…' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => { setConfirmDeleteId(null); setDeleteError(''); }}
                          className="text-xs font-ninja text-ninja-muted hover:text-ninja-navy transition-colors"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => { setConfirmDeleteId(loc.id); setDeleteError(''); }}
                        className="text-ninja-muted hover:text-ninja-red transition-colors font-ninja text-xs"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {deleteError && (
              <p className="text-ninja-red font-ninja text-sm text-center">{deleteError}</p>
            )}

            {locations.length === 0 && !loading && (
              <p className="text-ninja-muted font-ninja text-center py-12">No locations yet.</p>
            )}
          </div>
        )}
      </div>

      {showAdd && <AddLocationModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
      {createdData && <TempPasswordModal data={createdData} onClose={() => setCreatedData(null)} />}
    </Layout>
  );
}
