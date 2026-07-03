import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import TodayBoard from '../../components/manager/TodayBoard';
import DashboardFilters from '../../components/shared/DashboardFilters';
import BoardStats from '../../components/shared/BoardStats';
import AddStudentToday from '../../components/manager/AddStudentToday';
import CheckInClubModal from '../../components/manager/CheckInClubModal';
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
  const [showCheckInClub, setShowCheckInClub] = useState(false);
  const [clubSessions, setClubSessions] = useState([]);
  const [statusFilter, setStatusFilter] = useState('unlogged');
  const [programFilter, setProgramFilter] = useState(null);

  const todayStr = today();

  const programs = [...new Set(assignments.map((a) => a.program))].filter(Boolean);
  const visibleAssignments = programFilter
    ? assignments.filter((a) => a.program === programFilter)
    : assignments;

  const isPast = (a) => a.session_date && String(a.session_date).split('T')[0] < todayStr;
  const counts = {
    logged:  visibleAssignments.filter((a) => a.completed).length,
    pending: visibleAssignments.filter((a) => !a.completed && !isPast(a)).length,
    overdue: visibleAssignments.filter((a) => !a.completed && isPast(a)).length,
    total:   visibleAssignments.length,
  };

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
    const controller = new AbortController();
    fetchAssignments();
    api.get('/clubs').then((data) => { if (!controller.signal.aborted) setClubSessions(data); }).catch(() => {});
    return () => controller.abort();
  }, [fetchAssignments]);

  const handleAdded = (newAssignment) => {
    // Server may reuse an existing (overdue) session and move it to today —
    // replace by id rather than appending a duplicate.
    setAssignments((prev) => [...prev.filter((a) => a.id !== newAssignment.id), newAssignment]);
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold font-ninja text-ninja-navy tracking-wide">
              Today's <span className="text-ninja-blue">Ninjas</span>
            </h1>
            <p className="text-ninja-muted font-ninja mt-1">{formatDate(todayStr)}</p>
            {user && (
              <p className="text-ninja-navy font-ninja mt-1 font-semibold">
                Welcome Center Director {user.displayName?.split(' ')[0]}
              </p>
            )}
          </div>
          {!isReadOnly && (
            <Button onClick={() => setShowAddModal(true)} size="md">
              + Check In Ninja
            </Button>
          )}
        </div>

        {/* Stat cards — also the board's status filter */}
        {!loading && !error && assignments.length > 0 && (
          <BoardStats counts={counts} active={statusFilter} onSelect={setStatusFilter} />
        )}

        {/* Board */}
        {error && <p className="text-ninja-red font-ninja text-center py-4">{error}</p>}

        {!loading && !error && assignments.length > 0 && (
          <DashboardFilters
            program={programFilter}
            onProgram={setProgramFilter}
            programs={programs}
          />
        )}

        {loading ? (
          <p className="text-ninja-muted font-ninja text-center py-8">Loading...</p>
        ) : (
          <TodayBoard
            assignments={visibleAssignments}
            onRemove={handleRemove}
            statusFilter={statusFilter}
          />
        )}

        {/* Clubs */}
        <ClubSessionsPanel
          sessions={clubSessions}
          onDeleted={(id) => setClubSessions((prev) => prev.filter((s) => s.id !== id))}
          onAttendeesUpdated={(id, attendees) => setClubSessions((prev) => prev.map((s) => s.id === id ? { ...s, attendees } : s))}
          onCheckIn={() => setShowCheckInClub(true)}
        />
      </div>

      <AddStudentToday
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdded={handleAdded}
        existingEntries={existingEntries}
      />

      <CheckInClubModal
        isOpen={showCheckInClub}
        onClose={() => setShowCheckInClub(false)}
        onCheckedIn={(newSession) => {
          api.get('/clubs').then(setClubSessions).catch(() => {});
        }}
      />
    </Layout>
  );
}
