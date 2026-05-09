import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout/Layout';
import TodayBoard from '../../components/manager/TodayBoard';
import AddStudentToday from '../../components/manager/AddStudentToday';
import ClubSessionsPanel from '../../components/shared/ClubSessionsPanel';
import Button from '../../components/ui/Button';
import { api } from '../../api/client';
import { today, formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

export default function ManagerDashboard() {
  const { user, isReadOnly } = useAuth();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [clubSessions, setClubSessions] = useState([]);

  const todayStr = today();

  const fetchAssignments = useCallback(async () => {
    try {
      const data = await api.get(`/daily?date=${todayStr}`);
      setAssignments(data);
    } catch (err) {
      setError('Failed to load today\'s board');
    } finally {
      setLoading(false);
    }
  }, [todayStr, user?.activeLocation?.id]);

  useEffect(() => {
    fetchAssignments();
    api.get('/clubs').then(setClubSessions).catch(() => {});
  }, [fetchAssignments]);

  const handleAdded = (newAssignment) => {
    setAssignments((prev) => [...prev, newAssignment]);
  };

  const handleUpdate = (updated) => {
    setAssignments((prev) =>
      prev.map((a) => (a.id === updated.id ? updated : a))
    );
  };

  const handleRemove = (id) => {
    setAssignments((prev) => prev.filter((a) => a.id !== id));
  };

  const existingEntries = assignments.map((a) => ({ student_id: a.student_id, program: a.program }));
  const completedCount = assignments.filter((a) => a.completed).length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold font-ninja text-ninja-navy tracking-wide">
              Today's <span className="text-ninja-blue">Dojo</span>
            </h1>
            <p className="text-ninja-muted font-ninja mt-1">{formatDate(todayStr)}</p>
          </div>
          {!isReadOnly && (
            <Button onClick={() => setShowAddModal(true)} size="md">
              + Check In Ninja
            </Button>
          )}
        </div>

        {/* Stats */}
        {assignments.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className="text-3xl font-bold font-ninja text-ninja-blue">{assignments.length}</p>
              <p className="text-ninja-muted font-ninja text-sm mt-1">Total Ninjas</p>
            </div>
            <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className={`text-3xl font-bold font-ninja ${completedCount > 0 ? 'text-green-500' : 'text-ninja-border'}`}>
                {completedCount}
              </p>
              <p className="text-ninja-muted font-ninja text-sm mt-1">Completed</p>
            </div>
            <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className={`text-3xl font-bold font-ninja ${assignments.length - completedCount > 0 ? 'text-ninja-muted' : 'text-ninja-border'}`}>
                {assignments.length - completedCount}
              </p>
              <p className="text-ninja-muted font-ninja text-sm mt-1">Remaining</p>
            </div>
          </div>
        )}

        {/* Board */}
        <div className="bg-white border border-ninja-border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold font-ninja text-ninja-navy mb-4 tracking-wide">Session Board</h2>

          {error && (
            <p className="text-ninja-red font-ninja text-center py-4">{error}</p>
          )}

          {loading ? (
            <p className="text-ninja-muted font-ninja text-center py-8">Loading...</p>
          ) : (
            <TodayBoard
              assignments={assignments}
              onRemove={handleRemove}
            />
          )}
        </div>

        {/* Clubs */}
        <ClubSessionsPanel
          sessions={clubSessions}
          onDeleted={(id) => setClubSessions((prev) => prev.filter((s) => s.id !== id))}
          onNotesUpdated={(id, notes) => setClubSessions((prev) => prev.map((s) => s.id === id ? { ...s, notes } : s))}
        />
      </div>

      <AddStudentToday
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={handleAdded}
        existingEntries={existingEntries}
      />
    </Layout>
  );
}
