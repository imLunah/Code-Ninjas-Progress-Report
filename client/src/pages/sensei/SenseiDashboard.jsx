import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import TodayBoard from '../../components/manager/TodayBoard';
import DashboardFilters from '../../components/shared/DashboardFilters';
import BoardStats from '../../components/shared/BoardStats';
import ClubSessionsPanel from '../../components/shared/ClubSessionsPanel';
import EventCalendar from '../../components/manager/EventCalendar';
import Modal from '../../components/ui/Modal';
import { CalendarIcon, BookOpenIcon } from 'lucide-react';
import { api } from '../../api/client';
import { today, formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';
import { CARD } from '../../lib/surfaces';

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};

export default function SenseiDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [clubSessions, setClubSessions] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState('unlogged');
  const [programFilter, setProgramFilter] = useState(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { user } = useAuth();
  const todayStr = today();

  const refresh = () => setRefreshKey(k => k + 1);

  // Auto-refresh every 30 seconds so new check-ins added by the manager appear automatically
  useEffect(() => {
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api.get(`/daily?date=${todayStr}`)
      .then((data) => { if (!controller.signal.aborted) setAssignments(data); })
      .catch(() => { if (!controller.signal.aborted) setError('Failed to load today\'s ninjas'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    api.get('/clubs').then((data) => { if (!controller.signal.aborted) setClubSessions(data); }).catch(() => {});
    return () => controller.abort();
  }, [todayStr, user?.activeLocation?.id, refreshKey]);

  const programs = [...new Set(assignments.map((a) => a.program))].filter(Boolean);
  const filteredAssignments = programFilter
    ? assignments.filter((a) => a.program === programFilter)
    : assignments;

  const isPast = (a) => a.session_date && String(a.session_date).split('T')[0] < todayStr;
  const counts = {
    logged:  filteredAssignments.filter((a) => a.completed).length,
    pending: filteredAssignments.filter((a) => !a.completed && !isPast(a)).length,
    overdue: filteredAssignments.filter((a) => !a.completed && isPast(a)).length,
    total:   filteredAssignments.length,
  };

  return (
    <Layout>
      <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp} className="flex items-start justify-between gap-4">
          <div>
          <h1 className="text-2xl sm:text-4xl font-bold font-ninja text-ninja-navy tracking-wide">
            Today's <span className="text-ninja-blue">Ninjas</span>
          </h1>
          <p className="text-ninja-muted font-ninja mt-1">{formatDate(todayStr)}</p>
          {user && (
            <p className="text-ninja-navy font-ninja mt-1 font-semibold">
              Welcome {user.role === 'manager' ? 'Center Director' : user.role === 'admin' ? 'Admin' : 'Sensei'}{' '}
              {(() => {
                const name = user.role === 'sensei' && user.displayName?.toLowerCase().startsWith('sensei ')
                  ? user.displayName.slice(7)
                  : user.displayName;
                return name?.split(' ')[0];
              })()}
            </p>
          )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* The sidebar carries this too, but a phone never renders the
                sidebar, so without it here Curriculum is unreachable mid
                session, which is when the passcodes are wanted. */}
            <Link
              to="/curriculum-roadmap"
              aria-label="Open curriculum"
              className={`${CARD} w-11 h-11 flex items-center justify-center text-ninja-muted hover:text-ninja-blue hover:border-ninja-blue/50 transition-colors`}
            >
              <BookOpenIcon className="w-5 h-5" />
            </Link>

            {/* Opens over the page rather than pushing the board down, since the
                calendar is a reference, not part of the check-in flow. */}
            <button
              type="button"
              onClick={() => setCalendarOpen(true)}
              aria-label="Open calendar"
              aria-haspopup="dialog"
              aria-expanded={calendarOpen}
              className={`${CARD} w-11 h-11 flex items-center justify-center text-ninja-muted hover:text-ninja-blue hover:border-ninja-blue/50 transition-colors`}
            >
              <CalendarIcon className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        <Modal
          isOpen={calendarOpen}
          onClose={() => setCalendarOpen(false)}
          title="Calendar"
          width="max-w-2xl"
        >
          <EventCalendar canManage={false} bare />
        </Modal>

        {!loading && !error && assignments.length > 0 && (
          <motion.div variants={fadeUp}>
            <BoardStats counts={counts} active={statusFilter} onSelect={setStatusFilter} />
          </motion.div>
        )}

        {!loading && !error && assignments.length > 0 && (
          <motion.div variants={fadeUp}>
            <DashboardFilters
              program={programFilter}
              onProgram={setProgramFilter}
              programs={programs}
            />
          </motion.div>
        )}

        {error && <p className="text-ninja-red font-ninja text-center py-8">{error}</p>}
        {loading && <p className="text-ninja-muted font-ninja text-center py-8">Loading your ninjas...</p>}

        {/* Same board the directors see. Senseis can't remove a check-in
            (DELETE /daily/:id is manager-only), so the × stays off. */}
        {!loading && !error && (
          <motion.div variants={fadeUp}>
            <TodayBoard
              assignments={filteredAssignments}
              statusFilter={statusFilter}
              canRemove={false}
              emptyHint="Check-ins are added by a Center Director."
            />
          </motion.div>
        )}

        {/* Clubs */}
        <ClubSessionsPanel
          sessions={clubSessions}
          onDeleted={(id) => setClubSessions((prev) => prev.filter((s) => s.id !== id))}
          onAttendeesUpdated={(id, attendees) => setClubSessions((prev) => prev.map((s) => s.id === id ? { ...s, attendees } : s))}
        />

      </motion.div>
    </Layout>
  );
}
