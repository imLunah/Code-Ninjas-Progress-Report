import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProgram, setSelectedProgram] = useState(searchParams.get('program') || '');

  useEffect(() => {
    api.get(`/students/${id}`)
      .then((data) => {
        setStudent(data);
        if (!selectedProgram && data.programs?.length > 0) {
          setSelectedProgram(data.programs[0].program);
        }
      })
      .catch(() => setError('Failed to load ninja'))
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
        <p className="text-ninja-red font-ninja text-center py-12">{error || 'Ninja not found'}</p>
      </Layout>
    );
  }

  const enrollment = student.programs?.find((p) => p.program === selectedProgram);
  const programLogs = (student.progress_logs || []).filter((l) => l.program === selectedProgram).slice(0, 3);

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/sensei/dashboard')}
          className="text-ninja-muted hover:text-ninja-blue font-ninja text-sm flex items-center gap-1 transition-colors"
        >
          ← Back to Dashboard
        </button>

        <Card>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <h1 className="text-2xl font-bold font-ninja text-ninja-navy">{student.full_name}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {student.programs?.map((p) => (
                  <ProgramBadge key={p.program} program={p.program} />
                ))}
                {enrollment?.program === 'CREATE' && enrollment.belt_level && (
                  <BeltBadge belt={enrollment.belt_level} sublevel={enrollment.belt_sublevel} />
                )}
                {enrollment?.current_project && (
                  <span className="text-ninja-muted font-ninja text-sm">
                    {enrollment.current_project} — {enrollment.project_status}
                  </span>
                )}
              </div>
            </div>
          </div>

          {student.programs?.length > 1 && (
            <div className="mt-4 pt-4 border-t border-ninja-border">
              <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-2">
                Logging for Program
              </label>
              <div className="flex flex-wrap gap-2">
                {student.programs.map((p) => (
                  <button
                    key={p.program}
                    onClick={() => setSelectedProgram(p.program)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-ninja font-semibold transition-colors ${
                      selectedProgram === p.program
                        ? 'bg-ninja-blue text-white'
                        : 'bg-ninja-bg border border-ninja-border text-ninja-navy hover:border-ninja-blue'
                    }`}
                  >
                    {p.program}
                  </button>
                ))}
              </div>
            </div>
          )}
        </Card>

        <PinnedNote
          studentId={student.id}
          initialNote={student.pinned_note}
          onUpdated={(note) => setStudent((prev) => ({ ...prev, pinned_note: note }))}
        />

        {programLogs.length > 0 && (
          <div className="bg-white border border-ninja-border rounded-xl p-4 shadow-sm">
            <h2 className="text-lg font-bold font-ninja text-ninja-navy mb-3">
              Recent <span className="text-ninja-blue">Sessions</span>
            </h2>
            <ProgressHistory logs={programLogs} />
          </div>
        )}

        {selectedProgram ? (
          <div className="bg-white border border-ninja-border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold font-ninja text-ninja-navy mb-4">
              Log Today's <span className="text-ninja-blue">Session</span>
            </h2>
            <LogEntryForm
              student={student}
              program={selectedProgram}
              enrollment={enrollment}
              onLogged={handleLogged}
            />
          </div>
        ) : (
          <div className="bg-white border border-ninja-border rounded-xl p-6 shadow-sm text-center">
            <p className="text-ninja-muted font-ninja">Select a program above to log a session.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
