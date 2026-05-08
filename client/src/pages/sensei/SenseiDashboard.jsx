import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import StudentCard from '../../components/shared/StudentCard';
import { api } from '../../api/client';
import { today, formatDate } from '../../utils/dateUtils';
import { useAuth } from '../../context/AuthContext';

export default function SenseiDashboard() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const todayStr = today();

  useEffect(() => {
    api.get(`/daily?date=${todayStr}`)
      .then(setAssignments)
      .catch(() => setError('Failed to load today\'s ninjas'))
      .finally(() => setLoading(false));
  }, [todayStr, user?.activeLocation?.id]);

  const completedCount = assignments.filter((a) => a.completed).length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold font-ninja text-ninja-navy tracking-wide">
            Today's <span className="text-ninja-blue">Ninjas</span>
          </h1>
          <p className="text-ninja-muted font-ninja mt-1">{formatDate(todayStr)}</p>
          {user && (
            <p className="text-ninja-navy font-ninja mt-1 font-semibold">
              Welcome, {user.displayName}
            </p>
          )}
        </div>

        {/* Stats */}
        {assignments.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className="text-3xl font-bold font-ninja text-ninja-blue">{assignments.length}</p>
              <p className="text-ninja-muted font-ninja text-sm mt-1">Total</p>
            </div>
            <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className="text-3xl font-bold font-ninja text-green-500">{completedCount}</p>
              <p className="text-ninja-muted font-ninja text-sm mt-1">Done</p>
            </div>
            <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className="text-3xl font-bold font-ninja text-ninja-muted">{assignments.length - completedCount}</p>
              <p className="text-ninja-muted font-ninja text-sm mt-1">Remaining</p>
            </div>
          </div>
        )}

        {/* Student Cards */}
        {error && (
          <p className="text-ninja-red font-ninja text-center py-8">{error}</p>
        )}

        {loading && (
          <p className="text-ninja-muted font-ninja text-center py-8">Loading your ninjas...</p>
        )}

        {!loading && !error && assignments.length === 0 && (
          <div className="bg-white border border-ninja-border rounded-xl p-12 text-center shadow-sm">
            <img src="/CodeNinjasCelebrate.webp" alt="Code Ninjas" className="h-24 mx-auto mb-4" />
            <h3 className="text-2xl font-bold font-ninja text-ninja-navy mb-2">No Ninjas Yet</h3>
            <p className="text-ninja-muted font-ninja">
              No ninjas have been added to today's board yet.
            </p>
            <p className="text-ninja-muted font-ninja text-sm mt-1">
              Check with your Center Director to get ninjas added.
            </p>
          </div>
        )}

        {!loading && !error && assignments.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignments.map((a) => (
              <StudentCard
                key={a.id}
                student={a}
                onClick={() => navigate(`/manager/students/${a.student_id}`)}
                onLogProgress={() => navigate(`/sensei/student/${a.student_id}?program=${encodeURIComponent(a.program)}`)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
