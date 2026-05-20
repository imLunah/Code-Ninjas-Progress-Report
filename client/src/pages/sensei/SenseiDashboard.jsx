import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import StudentCard from '../../components/shared/StudentCard';
import ClubSessionsPanel from '../../components/shared/ClubSessionsPanel';
import { api } from '../../api/client';
import { today, formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold font-ninja text-ninja-navy tracking-wide">
            Today's <span className="text-ninja-blue">Ninjas</span>
          </h1>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-ninja-muted font-ninja">{formatDate(todayStr)}</p>
            <button
              onClick={refresh}
              className="text-ninja-muted hover:text-ninja-blue font-ninja text-xs border border-ninja-border hover:border-ninja-blue rounded-lg px-2 py-1 transition-colors"
            >
              Refresh
            </button>
          </div>
          {user && (
            <p className="text-ninja-navy font-ninja mt-1 font-semibold">
              Welcome {user.role === 'manager' ? 'Center Director' : 'Sensei'}{' '}
              {(() => {
                const name = user.role === 'sensei' && user.displayName?.toLowerCase().startsWith('sensei ')
                  ? user.displayName.slice(7)
                  : user.displayName;
                return name?.split(' ')[0];
              })()}
            </p>
          )}
        </div>

        {allGrouped.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className="text-3xl font-bold font-ninja text-ninja-blue">{allGrouped.length}</p>
              <p className="text-ninja-muted font-ninja text-sm mt-1">Total</p>
            </div>
            <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className="text-3xl font-bold font-ninja text-green-500">{completedCount}</p>
              <p className="text-ninja-muted font-ninja text-sm mt-1">Logged</p>
            </div>
            <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className="text-3xl font-bold font-ninja text-ninja-muted">{groupedList.length}</p>
              <p className="text-ninja-muted font-ninja text-sm mt-1">Remaining</p>
            </div>
          </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groupedList.map((group) => (
              <StudentCard
                key={group.student_id}
                student={group}
                onClick={() => navigate(`/manager/students/${group.student_id}`)}
                onLogProgress={() => {
                  // Build per-program info from pending assignments (sorted ASC by server)
                  const programInfo = {};
                  group.assignments.forEach(a => {
                    if (!a.completed) {
                      const d = String(a.session_date).split('T')[0];
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
            ))}
          </div>
        )}

        {/* Clubs */}
        <ClubSessionsPanel
          sessions={clubSessions}
          onDeleted={(id) => setClubSessions((prev) => prev.filter((s) => s.id !== id))}
          onAttendeesUpdated={(id, attendees) => setClubSessions((prev) => prev.map((s) => s.id === id ? { ...s, attendees } : s))}
        />
      </div>
    </Layout>
  );
}
