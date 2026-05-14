import { useState, useEffect } from 'react';
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
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [selectedSensei, setSelectedSensei] = useState(null);
  const [profileLogs, setProfileLogs] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editCredentialsSensei, setEditCredentialsSensei] = useState(null);
  const { user, isReadOnly } = useAuth();

  const isManager = user?.role === 'manager';

  useEffect(() => {
    setLoading(true);
    api.get('/users?role=sensei')
      .then(setSenseis)
      .catch(() => setError('Failed to load senseis'))
      .finally(() => setLoading(false));
  }, [user?.activeLocation?.id]);

  const handleAdded = (newSensei) => {
    setSenseis((prev) => [...prev, { ...newSensei, progress_log_count: 0 }]);
  };

  const handleRemove = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      setSenseis((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to remove sensei');
    } finally {
      setConfirmRemoveId(null);
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
              Sensei <span className="text-ninja-blue">Staff</span>
            </h1>
            <p className="text-ninja-muted font-ninja mt-1">{user?.activeLocation?.name}</p>
          </div>
          {isManager && !isReadOnly && (
            <Button onClick={() => setShowAddModal(true)}>+ Add Sensei</Button>
          )}
        </div>

        {/* Stats */}
        {!loading && !error && senseis.length > 0 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className="text-3xl font-bold font-ninja text-ninja-blue">{senseis.length}</p>
              <p className="text-ninja-muted font-ninja text-sm mt-1">Senseis</p>
            </div>
            <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className="text-3xl font-bold font-ninja text-ninja-navy">{totalLogs}</p>
              <p className="text-ninja-muted font-ninja text-sm mt-1">Total Progress Logs</p>
            </div>
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
              <p className="text-ninja-muted font-ninja">No senseis at this location yet.</p>
              {isManager && !isReadOnly && (
                <p className="text-ninja-muted font-ninja text-sm mt-1">
                  Use "+ Add Sensei" to create an account.
                </p>
              )}
            </div>
          )}
          {!loading && !error && senseis.length > 0 && (
            <>
              <div className="grid grid-cols-3 border-b border-ninja-border bg-ninja-bg px-5 py-3">
                <span className="text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest">Name</span>
                <span className="text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest">Username</span>
                <span className="text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest text-right">Progress Logs</span>
              </div>
              <div className="divide-y divide-ninja-border">
                {senseis.map((s) => (
                  <div
                    key={s.id}
                    className="grid grid-cols-3 items-center px-5 py-4 gap-2 hover:bg-ninja-bg cursor-pointer transition-colors"
                    onClick={() => handleRowClick(s)}
                  >
                    <p className="font-ninja font-bold text-ninja-navy">{s.display_name}</p>
                    <p className="font-ninja text-sm text-ninja-muted">@{s.username}</p>
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <span className={`text-lg font-bold font-ninja ${s.progress_log_count > 0 ? 'text-ninja-blue' : 'text-ninja-border'}`}>
                        {s.progress_log_count || 0}
                      </span>
                      {isManager && !isReadOnly && (
                        <>
                          <Button variant="secondary" size="sm" onClick={() => setEditCredentialsSensei(s)}>Edit Login</Button>
                          {confirmRemoveId === s.id ? (
                            <div className="flex items-center gap-1">
                              <Button variant="danger" size="sm" onClick={() => handleRemove(s.id)}>Confirm</Button>
                              <Button variant="secondary" size="sm" onClick={() => setConfirmRemoveId(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button variant="danger" size="sm" onClick={() => setConfirmRemoveId(s.id)}>Remove</Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
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
