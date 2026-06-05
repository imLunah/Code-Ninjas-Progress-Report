import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Layout from '../../components/layout/Layout';
import StudentCard from '../../components/shared/StudentCard';
import ClubSessionsPanel from '../../components/shared/ClubSessionsPanel';
import { api } from '../../api/client';
import { today, formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

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
  const navigate = useNavigate();
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

  // Group assignments by student so each student shows one card
  const grouped = assignments.reduce((acc, a) => {
    if (!acc[a.student_id]) {
      acc[a.student_id] = { ...a, assignments: [] };
    }
    acc[a.student_id].assignments.push(a);
    return acc;
  }, {});
  const allGrouped = Object.values(grouped);
  const completedCount = allGrouped.filter((g) => g.assignments.every((a) => a.completed)).length;
  // Only show students with at least one program not yet logged; overdue first
  const groupedList = allGrouped
    .filter((g) => !g.assignments.every((a) => a.completed))
    .sort((a, b) => {
      const aOver = a.assignments.some((x) => !x.completed && x.session_date && String(x.session_date).split('T')[0] < todayStr);
      const bOver = b.assignments.some((x) => !x.completed && x.session_date && String(x.session_date).split('T')[0] < todayStr);
      if (aOver === bOver) return 0;
      return aOver ? -1 : 1;
    });

  return (
    <Layout>
      <motion.div className="space-y-6" variants={stagger} initial="hidden" animate="show">
        <motion.div variants={fadeUp}>
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
        </motion.div>

        {allGrouped.length > 0 && (
          <motion.div className="grid grid-cols-3 gap-4" variants={stagger}>
            <motion.div variants={fadeUp} className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className="text-3xl font-bold font-ninja text-ninja-blue">{allGrouped.length}</p>
              <p className="text-ninja-muted font-ninja text-sm mt-1">Total</p>
            </motion.div>
            <motion.div variants={fadeUp} className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className="text-3xl font-bold font-ninja text-green-500">{completedCount}</p>
              <p className="text-ninja-muted font-ninja text-sm mt-1">Logged</p>
            </motion.div>
            <motion.div variants={fadeUp} className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className="text-3xl font-bold font-ninja text-ninja-muted">{groupedList.length}</p>
              <p className="text-ninja-muted font-ninja text-sm mt-1">Remaining</p>
            </motion.div>
          </motion.div>
        )}

        {error && <p className="text-ninja-red font-ninja text-center py-8">{error}</p>}
        {loading && <p className="text-ninja-muted font-ninja text-center py-8">Loading your ninjas...</p>}

        {!loading && !error && allGrouped.length === 0 && (
          <div className="bg-white border border-ninja-border rounded-xl p-12 text-center shadow-sm">
            <img src="/CodeNinjasCelebrate.webp" alt="Code Ninjas" className="h-24 mx-auto mb-4" />
            <h3 className="text-2xl font-bold font-ninja text-ninja-navy mb-2">No Ninjas Yet</h3>
            <p className="text-ninja-muted font-ninja">No ninjas have been added to today's board yet.</p>
            <p className="text-ninja-muted font-ninja text-sm mt-1">Check with your Center Director to get ninjas added.</p>
          </div>
        )}

        {!loading && !error && allGrouped.length > 0 && groupedList.length === 0 && (
          <div className="text-center py-12 font-ninja">
            <p className="text-2xl mb-2">🎉</p>
            <p className="text-lg font-bold text-ninja-navy">All {completedCount} ninja{completedCount !== 1 ? 's' : ''} logged!</p>
            <p className="text-ninja-muted text-sm mt-1">Great session today.</p>
          </div>
        )}

        {!loading && !error && groupedList.length > 0 && (
          <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" variants={stagger}>
            {groupedList.map((group) => (
              <motion.div key={group.student_id} variants={fadeUp}>
              <StudentCard
                key={group.student_id}
                student={group}
                onClick={() => navigate(`/manager/students/${group.student_id}`)}
                onLogProgress={() => {
                  // Build per-program info from pending assignments (sorted ASC by server)
                  const programInfo = {};
                  group.assignments.forEach(a => {
                    if (!a.completed) {
                      const d = a.session_date ? String(a.session_date).split('T')[0] : null;
                      if (!programInfo[a.program]) programInfo[a.program] = { date: d, count: 0 };
                      programInfo[a.program].count++;
                    }
                  });
                  const uniquePrograms = [...new Set(group.assignments.map(a => a.program))];
                  // A program is "done" only when ALL its assignments are completed
                  const fullDone = uniquePrograms.filter(p =>
                    group.assignments.every(a => a.program !== p || a.completed)
                  );
                  const datesStr = Object.entries(programInfo).map(([p, {date}]) => `${p}:${date}`).join(',');
                  const countsStr = Object.entries(programInfo).map(([p, {count}]) => `${p}:${count}`).join(',');
                  navigate(
                    `/sensei/student/${group.student_id}?programs=${encodeURIComponent(uniquePrograms.join(','))}` +
                    `${fullDone.length > 0 ? `&done=${encodeURIComponent(fullDone.join(','))}` : ''}` +
                    `&dates=${encodeURIComponent(datesStr)}` +
                    `&counts=${encodeURIComponent(countsStr)}`
                  );
                }}
              />
              </motion.div>
            ))}
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
