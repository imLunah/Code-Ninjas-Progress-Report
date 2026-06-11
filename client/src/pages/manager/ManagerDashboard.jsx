import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import TodayBoard from '../../components/manager/TodayBoard';
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
    const controller = new AbortController();
    fetchAssignments();
    api.get('/clubs').then((data) => { if (!controller.signal.aborted) setClubSessions(data); }).catch(() => {});
    return () => controller.abort();
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

{/* Desktop stat strip */}
        {!loading && !error && (
          <div className="hidden lg:grid grid-cols-4 gap-4">
            {[
              { label: 'Logged today',  value: assignments.filter(a => a.completed).length, color: '#22c55e' },
              { label: 'Pending',       value: assignments.filter(a => !a.completed && !(a.session_date && String(a.session_date).split('T')[0] < todayStr)).length, color: '#eab308' },
              { label: 'Overdue',       value: assignments.filter(a => !a.completed && a.session_date && String(a.session_date).split('T')[0] < todayStr).length, color: '#ef4444' },
              { label: 'Total today',   value: assignments.length, color: 'rgb(var(--ninja-blue))' },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07, duration: 0.3, ease: 'easeOut' }}
                className="bg-white border border-ninja-border rounded-xl p-4 shadow-sm"
              >
                <p className="font-ninja font-bold text-xs text-ninja-muted uppercase tracking-wide">{s.label}</p>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="font-ninja font-black text-3xl text-ninja-navy leading-none">{s.value}</span>
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                </div>
              </motion.div>
            ))}
          </div>
        )}

{/* Board */}
        {error && <p className="text-ninja-red font-ninja text-center py-4">{error}</p>}

        {loading ? (
          <p className="text-ninja-muted font-ninja text-center py-8">Loading...</p>
        ) : (
          <TodayBoard
            assignments={assignments}
            onRemove={handleRemove}
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
