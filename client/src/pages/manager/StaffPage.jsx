import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

function StaffAvatar({ url, name }) {
  const [imgError, setImgError] = useState(false);
  const initials = name?.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase();
  if (url && !imgError) {
    return (
      <img src={url} alt={name} onError={() => setImgError(true)} className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-ninja-border" />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-ninja-blue flex-shrink-0 flex items-center justify-center border border-ninja-border">
      <span className="text-white font-ninja font-bold text-sm leading-none">{initials}</span>
    </div>
  );
}
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import AddSenseiModal from '../../components/manager/AddSenseiModal';
import SenseiProfileModal from '../../components/manager/SenseiProfileModal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

function EditCredentialsModal({ sensei, onClose }) {
  const [username, setUsername] = useState(sensei.username || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const trimmedPassword = newPassword.trim();
    if (trimmedPassword && trimmedPassword !== confirmPassword.trim()) {
      return setError('Passwords do not match.');
    }
    if (trimmedPassword && trimmedPassword.length < 6) {
      return setError('Password must be at least 6 characters.');
    }
    const payload = {};
    if (username.trim() !== sensei.username) payload.username = username.trim();
    if (trimmedPassword) payload.new_password = trimmedPassword;
    if (!Object.keys(payload).length) return setSuccess('No changes to save.');

    setSaving(true);
    try {
      await api.patch(`/users/${sensei.id}/credentials`, payload);
      setSuccess('Credentials updated.');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err?.message || 'Failed to update credentials.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-ninja-navy font-ninja font-bold text-lg mb-1">Edit Login — {sensei.display_name}</h2>
        <p className="text-ninja-muted font-ninja text-xs mb-4">Passwords are never shown. Leave blank to keep current.</p>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
            />
          </div>
          <div>
            <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
              className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
            />
          </div>
          <div>
            <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full bg-ninja-bg border border-ninja-border text-ninja-navy rounded-lg px-3 py-2 font-ninja text-sm focus:outline-none focus:border-ninja-blue"
            />
          </div>
          {error && <p className="text-ninja-red font-ninja text-sm">{error}</p>}
          {success && <p className="text-green-600 font-ninja text-sm">{success}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="submit" disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Save'}</Button>
            <Button variant="secondary" type="button" onClick={onClose}>Close</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function StaffPage() {
  const [senseis, setSenseis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSensei, setSelectedSensei] = useState(null);
  const [profileLogs, setProfileLogs] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editCredentialsSensei, setEditCredentialsSensei] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const { user, isReadOnly } = useAuth();

  const isManager = ['manager', 'admin'].includes(user?.role);

  useEffect(() => {
    setLoading(true);
    const params = showArchived ? '?role=staff&inactive=true' : '?role=staff';
    api.get(`/users${params}`)
      .then(setSenseis)
      .catch(() => setError('Failed to load staff'))
      .finally(() => setLoading(false));
  }, [user?.activeLocation?.id, showArchived]);

  const handleAdded = (newSensei) => {
    setSenseis((prev) => [...prev, { ...newSensei, progress_log_count: 0 }]);
  };

  const handleRemove = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      setSenseis((prev) => prev.filter((s) => s.id !== id));
      setSelectedSensei(null);
    } catch (err) {
      setError(err.message || 'Failed to remove sensei');
    }
  };

  const handleRestore = async (id) => {
    try {
      await api.patch(`/users/${id}/restore`, {});
      setSenseis((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to restore staff member');
    }
  };

  const handleRowClick = async (sensei) => {
    setSelectedSensei(sensei);
    setProfileLogs([]);
    setProfileLoading(true);
    try {
      const data = await api.get(`/users/${sensei.id}`);
      setProfileLogs(data.progress_logs || []);
    } catch {
      setProfileLogs([]);
    } finally {
      setProfileLoading(false);
    }
  };

  const totalLogs = senseis.reduce((sum, s) => sum + (s.progress_log_count || 0), 0);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold font-ninja text-ninja-navy tracking-wide">
              Center <span className="text-ninja-blue">{showArchived ? 'Archive' : 'Staff'}</span>
            </h1>
            <p className="text-ninja-muted font-ninja mt-1">{user?.activeLocation?.name}</p>
          </div>
          <div className="flex gap-2">
            {isManager && (
              <Button variant="secondary" onClick={() => setShowArchived((v) => !v)}>
                {showArchived ? 'Active Staff' : 'Archived'}
              </Button>
            )}
            {isManager && !isReadOnly && !showArchived && (
              <Button onClick={() => setShowAddModal(true)}>+ Add Staff</Button>
            )}
          </div>
        </div>

        {/* Stats */}
        {!loading && !error && senseis.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            {[
              { value: senseis.length, label: 'Staff Members', color: 'text-ninja-blue' },
              { value: totalLogs, label: 'Total Progress Logs', color: 'text-ninja-navy' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3, ease: 'easeOut' }}
                className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm"
              >
                <p className={`text-3xl font-bold font-ninja ${s.color}`}>{s.value}</p>
                <p className="text-ninja-muted font-ninja text-sm mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Sensei list */}
        <div className="bg-white border border-ninja-border rounded-xl shadow-sm overflow-hidden">
          {error && (
            <p className="text-ninja-red font-ninja text-center py-8">{error}</p>
          )}
          {loading && (
            <p className="text-ninja-muted font-ninja text-center py-8">Loading senseis...</p>
          )}
          {!loading && !error && senseis.length === 0 && (
            <div className="text-center py-12">
              <p className="text-ninja-muted font-ninja">
                {showArchived ? 'No archived staff.' : 'No staff at this location yet.'}
              </p>
              {!showArchived && isManager && !isReadOnly && (
                <p className="text-ninja-muted font-ninja text-sm mt-1">
                  Use "+ Add Staff" to create an account.
                </p>
              )}
            </div>
          )}
          {!loading && !error && senseis.length > 0 && (
            <>
              <div className="grid grid-cols-3 border-b border-ninja-border bg-ninja-bg px-5 py-3">
                <span className="text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest">Name</span>
                <span className="text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest">Username</span>
                <span className="text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest text-right">
                  {showArchived ? 'Action' : 'Progress Logs'}
                </span>
              </div>
              <div className="divide-y divide-ninja-border">
                {senseis.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.25, ease: 'easeOut' }}
                    className="grid grid-cols-3 items-center px-5 py-4 gap-2 hover:bg-ninja-bg cursor-pointer transition-colors"
                    onClick={() => !showArchived && handleRowClick(s)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StaffAvatar url={s.profile_pic_url} name={s.display_name} />
                        <div className="min-w-0 flex-1">
                        <p className="font-ninja font-bold text-ninja-navy truncate">{s.display_name}</p>
                        <span className={`text-[10px] font-ninja font-bold uppercase tracking-wide ${s.role === 'manager' ? 'text-ninja-blue' : 'text-ninja-muted'}`}>
                          {s.role === 'manager' ? 'Center Director' : 'Sensei'}
                        </span>
                      </div>
                    </div>
                    <p className="font-ninja text-sm text-ninja-muted">@{s.username}</p>
                    <div className="flex items-center justify-end gap-2">
                      {showArchived ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRestore(s.id); }}
                          className="text-xs font-ninja font-semibold text-green-700 border border-green-300 rounded-lg px-3 py-1 hover:bg-green-50 transition-colors"
                        >
                          Restore
                        </button>
                      ) : (
                        <span className={`text-lg font-bold font-ninja ${s.progress_log_count > 0 ? 'text-ninja-blue' : 'text-ninja-border'}`}>
                          {s.progress_log_count || 0}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <AddSenseiModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={handleAdded}
      />

      <SenseiProfileModal
        isOpen={!!selectedSensei}
        onClose={() => setSelectedSensei(null)}
        sensei={selectedSensei}
        logs={profileLoading ? [] : profileLogs}
        isManager={isManager}
        isReadOnly={isReadOnly}
        onEditLogin={() => setEditCredentialsSensei(selectedSensei)}
        onRemove={() => selectedSensei && handleRemove(selectedSensei.id)}
      />

      {editCredentialsSensei && (
        <EditCredentialsModal
          sensei={editCredentialsSensei}
          onClose={() => setEditCredentialsSensei(null)}
        />
      )}
    </Layout>
  );
}
