import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import BeltBadge from '../../components/ui/BeltBadge';
import ProgramBadge from '../../components/ui/ProgramBadge';
import Card from '../../components/ui/Card';
import LogEntryForm from '../../components/sensei/LogEntryForm';
import ProgressHistory from '../../components/shared/ProgressHistory';
import PinnedNote from '../../components/shared/PinnedNote';
import { api } from '../../api/client';

export default function LogProgressPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/students/${id}`)
      .then(setStudent)
      .catch(() => setError('Failed to load student'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLogged = (newLog) => {
    setStudent((prev) => ({
      ...prev,
      progress_logs: [newLog, ...(prev.progress_logs || [])],
    }));
  };

  if (loading) {
    return (
      <Layout>
        <p className="text-ninja-muted font-ninja text-center py-12">Loading...</p>
      </Layout>
    );
  }

  if (error || !student) {
    return (
      <Layout>
        <p className="text-ninja-red font-ninja text-center py-12">{error || 'Student not found'}</p>
      </Layout>
    );
  }

  const recentLogs = (student.progress_logs || []).slice(0, 3);

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Back */}
        <button
          onClick={() => navigate('/sensei/dashboard')}
          className="text-ninja-muted hover:text-ninja-blue font-ninja text-sm flex items-center gap-1 transition-colors"
        >
          ← Back to Dashboard
        </button>

        {/* Student Banner */}
        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <h1 className="text-2xl font-bold font-ninja text-ninja-navy">{student.full_name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <ProgramBadge program={student.program} />
                {student.program === 'CREATE' && student.belt_level && (
                  <BeltBadge belt={student.belt_level} sublevel={student.belt_sublevel} />
                )}
                {student.current_project && (
                  <span className="text-ninja-muted font-ninja text-sm">
                    {student.current_project} — {student.project_status}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Pinned Note */}
        <PinnedNote
          studentId={student.id}
          initialNote={student.pinned_note}
          onUpdated={(note) => setStudent((prev) => ({ ...prev, pinned_note: note }))}
        />

        {/* Recent Logs */}
        {recentLogs.length > 0 && (
          <div className="bg-white border border-ninja-border rounded-xl p-4 shadow-sm">
            <h2 className="text-lg font-bold font-ninja text-ninja-navy mb-3">
              Recent <span className="text-ninja-blue">Sessions</span>
            </h2>
            <ProgressHistory logs={recentLogs} />
          </div>
        )}

        {/* Log Form */}
        <div className="bg-white border border-ninja-border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold font-ninja text-ninja-navy mb-4">
            Log Today's <span className="text-ninja-blue">Session</span>
          </h2>
          <LogEntryForm student={student} onLogged={handleLogged} />
        </div>
      </div>
    </Layout>
  );
}
