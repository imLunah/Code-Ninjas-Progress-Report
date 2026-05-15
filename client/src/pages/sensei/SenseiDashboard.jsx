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
  const navigate = useNavigate();
  const { user } = useAuth();
  const todayStr = today();

  useEffect(() => {
    api.get(`/daily?date=${todayStr}`)
      .then(setAssignments)
      .catch(() => setError('Failed to load today\'s ninjas'))
      .finally(() => setLoading(false));
    api.get('/clubs').then(setClubSessions).catch(() => {});
  }, [todayStr, user?.activeLocation?.id]);

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
          <p className="text-ninja-muted font-ninja mt-1">{formatDate(todayStr)}</p>
          {user && (
            <p className="text-ninja-navy font-ninja mt-1 font-semibold">
              Welcome {user.role === 'manager' ? 'Director' : 'Sensei'}{' '}
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
            {groupedList.map((group) => {
              const programsStr = group.assignments.map((a) => a.program).join(',');
              const doneStr = group.assignments.filter((a) => a.completed).map((a) => a.program).join(',');
              return (
                <StudentCard
                  key={group.student_id}
                  student={group}
                  onClick={() => navigate(`/manager/students/${group.student_id}`)}
                  onLogProgress={() =>
                    navigate(`/sensei/student/${group.student_id}?programs=${encodeURIComponent(programsStr)}${doneStr ? `&done=${encodeURIComponent(doneStr)}` : ''}`)
                  }
                />
              );
            })}
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
