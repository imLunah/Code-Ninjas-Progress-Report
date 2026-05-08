import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import AddSenseiModal from '../../components/manager/AddSenseiModal';
import SenseiProfileModal from '../../components/manager/SenseiProfileModal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function StaffPage() {
  const [senseis, setSenseis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [selectedSensei, setSelectedSensei] = useState(null);
  const [profileLogs, setProfileLogs] = useState([]);
  const [profileLoading, setProfileLoading] = useState(false);
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
                    <div className="flex items-center justify-end gap-3" onClick={(e) => e.stopPropagation()}>
                      <span className={`text-lg font-bold font-ninja ${s.progress_log_count > 0 ? 'text-ninja-blue' : 'text-ninja-border'}`}>
                        {s.progress_log_count || 0}
                      </span>
                      {isManager && !isReadOnly && (
                        confirmRemoveId === s.id ? (
                          <div className="flex items-center gap-1">
                            <Button variant="danger" size="sm" onClick={() => handleRemove(s.id)}>Confirm</Button>
                            <Button variant="secondary" size="sm" onClick={() => setConfirmRemoveId(null)}>Cancel</Button>
                          </div>
                        ) : (
                          <Button variant="danger" size="sm" onClick={() => setConfirmRemoveId(s.id)}>Remove</Button>
                        )
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
    </Layout>
  );
}
