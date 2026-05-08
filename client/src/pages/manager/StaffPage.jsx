import { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import Button from '../../components/ui/Button';
import AddSenseiModal from '../../components/manager/AddSenseiModal';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function StaffPage() {
  const [senseis, setSenseis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const { user, isReadOnly } = useAuth();

  useEffect(() => {
    setLoading(true);
    api.get('/users?role=sensei')
      .then(setSenseis)
      .catch(() => setError('Failed to load staff'))
      .finally(() => setLoading(false));
  }, [user?.activeLocation?.id]);

  const handleAdded = (newSensei) => {
    setSenseis((prev) => [...prev, { ...newSensei, progress_log_count: 0 }]);
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
          {!isReadOnly && (
            <Button onClick={() => setShowModal(true)}>+ Add Sensei</Button>
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
            <p className="text-ninja-muted font-ninja text-center py-8">Loading staff...</p>
          )}
          {!loading && !error && senseis.length === 0 && (
            <div className="text-center py-12">
              <p className="text-ninja-muted font-ninja">No senseis at this location yet.</p>
              {!isReadOnly && (
                <p className="text-ninja-muted font-ninja text-sm mt-1">
                  Use "+ Add Sensei" to create an account.
                </p>
              )}
            </div>
          )}
          {!loading && !error && senseis.length > 0 && (
            <>
              {/* Table header */}
              <div className="grid grid-cols-3 border-b border-ninja-border bg-ninja-bg px-5 py-3">
                <span className="text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest">Name</span>
                <span className="text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest">Username</span>
                <span className="text-ninja-muted font-ninja font-semibold text-xs uppercase tracking-widest text-right">Progress Logs</span>
              </div>
              <div className="divide-y divide-ninja-border">
                {senseis.map((s) => (
                  <div key={s.id} className="grid grid-cols-3 items-center px-5 py-4">
                    <p className="font-ninja font-bold text-ninja-navy">{s.display_name}</p>
                    <p className="font-ninja text-sm text-ninja-muted">@{s.username}</p>
                    <div className="text-right">
                      <span className={`text-lg font-bold font-ninja ${s.progress_log_count > 0 ? 'text-ninja-blue' : 'text-ninja-border'}`}>
                        {s.progress_log_count || 0}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <AddSenseiModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onAdded={handleAdded}
      />
    </Layout>
  );
}
