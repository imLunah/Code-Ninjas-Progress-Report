import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import { api } from '../../api/client';

function AdminNav() {
  const path = window.location.pathname;
  const links = [
    { to: '/admin/locations', label: 'Locations' },
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/curriculum', label: 'Curriculum' },
    { to: '/admin/settings', label: 'Settings' },
  ];
  return (
    <div className="flex items-center gap-4 mb-6 border-b border-ninja-border pb-4">
      {links.map((l) => (
        <a
          key={l.to}
          href={l.to}
          className={`font-ninja text-sm font-semibold transition-colors ${
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

function EditLocationModal({ loc, onClose, onSaved }) {
  const [name, setName] = useState(loc.name);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === loc.name) return onClose();
    setSaving(true);
    setError('');
    try {
      const result = await api.patch(`/admin/locations/${loc.id}`, { name: name.trim() });
      onSaved(result);
    } catch (err) {
      setError(err?.message || 'Failed to update location.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
      >
        <h2 className="text-ninja-navy font-ninja font-bold text-lg mb-4">Rename Location</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
            />
          </div>
          {error && <p className="text-ninja-red text-xs font-ninja">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex-1 bg-ninja-blue text-white font-ninja font-semibold rounded-xl py-2 text-sm hover:opacity-90 disabled:opacity-50 transition-opacity">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 bg-ninja-bg text-ninja-navy font-ninja font-semibold rounded-xl py-2 text-sm border border-ninja-border hover:bg-ninja-border transition-colors">
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function DeleteLocationModal({ loc, onClose, onDeleted }) {
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const confirmed = typed.trim() === loc.name;

  const handleDelete = async () => {
    if (!confirmed) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/admin/locations/${loc.id}`);
      onDeleted(loc.id);
    } catch (err) {
      setError(err?.message || 'Failed to delete location.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
      >
        <h2 className="text-ninja-red font-ninja font-bold text-lg mb-1">Delete Location</h2>
        <p className="text-ninja-muted font-ninja text-xs mb-4 leading-relaxed">
          This permanently deletes all students, staff, progress logs, club sessions, and other data for this location. This cannot be undone.
        </p>
        <div className="bg-ninja-bg rounded-xl p-3 mb-4 text-sm font-ninja">
          <span className="text-ninja-muted">Deleting:</span>{' '}
          <span className="text-ninja-navy font-semibold">{loc.name}</span>
          <span className="text-ninja-muted ml-2">· {loc.student_count} students · {loc.staff_count} staff</span>
        </div>
        <div className="mb-5">
          <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1">
            Type <span className="text-ninja-navy font-mono">{loc.name}</span> to confirm
          </label>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoFocus
            className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-red"
          />
        </div>
        {error && <p className="text-ninja-red font-ninja text-xs mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={!confirmed || deleting}
            className="flex-1 bg-ninja-red text-white font-ninja font-semibold rounded-xl py-2 text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {deleting ? 'Deleting…' : 'Delete Everything'}
          </button>
          <button onClick={onClose} className="flex-1 bg-ninja-bg text-ninja-navy font-ninja font-semibold rounded-xl py-2 text-sm border border-ninja-border hover:bg-ninja-border transition-colors">
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function LocationsPage() {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [createdData, setCreatedData] = useState(null);
  const [editLoc, setEditLoc] = useState(null);
  const [deleteLoc, setDeleteLoc] = useState(null);
  const [togglingId, setTogglingId] = useState(null);

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

  const handleToggleActive = async (loc) => {
    setTogglingId(loc.id);
    try {
      const result = await api.patch(`/admin/locations/${loc.id}`, { active: !loc.active });
      setLocations((prev) => prev.map((l) => l.id === loc.id ? { ...l, ...result } : l));
    } catch {
      // ignore
    } finally {
      setTogglingId(null);
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
                  className={`bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm ${loc.active ? 'border-ninja-border' : 'border-dashed border-ninja-border opacity-60'}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-ninja-navy font-ninja font-semibold">{loc.name}</p>
                      {!loc.active && (
                        <span className="text-[10px] font-ninja font-bold uppercase tracking-wide bg-ninja-bg text-ninja-muted border border-ninja-border rounded-full px-2 py-0.5">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-ninja-muted font-ninja text-xs mt-0.5">
                      slug: <span className="font-mono">{loc.slug}</span>
                      <span className="mx-2">·</span>
                      {loc.student_count} student{loc.student_count !== 1 ? 's' : ''}
                      <span className="mx-2">·</span>
                      {loc.staff_count} staff
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditLoc(loc)}
                      className="text-xs font-ninja text-ninja-muted hover:text-ninja-blue transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(loc)}
                      disabled={togglingId === loc.id}
                      className="text-xs font-ninja text-ninja-muted hover:text-ninja-navy transition-colors disabled:opacity-50"
                    >
                      {loc.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => setDeleteLoc(loc)}
                      className="text-xs font-ninja text-ninja-muted hover:text-ninja-red transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {locations.length === 0 && !loading && (
              <p className="text-ninja-muted font-ninja text-center py-12">No locations yet.</p>
            )}
          </div>
        )}
      </div>

      {showAdd && <AddLocationModal onClose={() => setShowAdd(false)} onAdded={handleAdded} />}
      {createdData && <TempPasswordModal data={createdData} onClose={() => setCreatedData(null)} />}
      {editLoc && (
        <EditLocationModal
          loc={editLoc}
          onClose={() => setEditLoc(null)}
          onSaved={(updated) => {
            setLocations((prev) => prev.map((l) => l.id === updated.id ? { ...l, ...updated } : l));
            setEditLoc(null);
          }}
        />
      )}
      {deleteLoc && (
        <DeleteLocationModal
          loc={deleteLoc}
          onClose={() => setDeleteLoc(null)}
          onDeleted={(id) => {
            setLocations((prev) => prev.filter((l) => l.id !== id));
            setDeleteLoc(null);
          }}
        />
      )}
    </Layout>
  );
}
