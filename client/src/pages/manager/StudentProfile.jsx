import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/layout/Layout';
import BeltBadge from '../../components/ui/BeltBadge';
import ProgramBadge from '../../components/ui/ProgramBadge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ProgressHistory from '../../components/shared/ProgressHistory';
import EditStudentModal from '../../components/manager/EditStudentModal';
import { api } from '../../api/client';

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [deactivating, setDeactivating] = useState(false);

  useEffect(() => {
    api.get(`/students/${id}`)
      .then(setStudent)
      .catch(() => setError('Failed to load student'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSaved = (updated) => {
    setStudent((prev) => ({ ...prev, ...updated }));
  };

  const handleDeactivate = async () => {
    if (!window.confirm(`Remove ${student.full_name} from the roster? This cannot be undone.`)) return;
    setDeactivating(true);
    try {
      await api.delete(`/students/${id}`);
      navigate('/manager/students');
    } catch (err) {
      setError('Failed to deactivate student');
      setDeactivating(false);
    }
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

  return (
    <Layout>
      <div className="space-y-6">
        {/* Back link */}
        <button
          onClick={() => navigate('/manager/students')}
          className="text-ninja-muted hover:text-ninja-blue font-ninja text-sm flex items-center gap-1 transition-colors"
        >
          ← Back to Roster
        </button>

        {/* Profile Header */}
        <Card>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold font-ninja text-ninja-navy">{student.full_name}</h1>
                <ProgramBadge program={student.program} size="md" />
              </div>
              {student.program === 'CREATE' && (
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {student.belt_level && (
                    <BeltBadge belt={student.belt_level} sublevel={student.belt_sublevel} size="md" />
                  )}
                  {student.current_project && (
                    <span className="text-ninja-navy font-ninja">
                      {student.current_project}
                      {student.project_status && (
                        <span className="text-ninja-muted ml-2">— {student.project_status}</span>
                      )}
                    </span>
                  )}
                </div>
              )}
              {student.birthday && (
                <p className="text-ninja-muted font-ninja text-sm mt-2">
                  Age {Math.floor((Date.now() - new Date(student.birthday)) / (365.25 * 24 * 60 * 60 * 1000))}
                  {' · '}Born {new Date(student.birthday + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </p>
              )}
              <p className="text-ninja-muted font-ninja text-sm mt-1">
                Member since {new Date(student.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
              </p>
            </div>
            {user?.role === 'manager' && (
              <div className="flex gap-2">
                <Button onClick={() => setShowEdit(true)} variant="secondary">
                  Edit
                </Button>
                <Button
                  onClick={handleDeactivate}
                  variant="danger"
                  disabled={deactivating}
                >
                  {deactivating ? 'Removing...' : 'Remove'}
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold font-ninja text-ninja-blue">{student.progress_logs?.length || 0}</p>
            <p className="text-ninja-muted font-ninja text-sm">Total Sessions</p>
          </div>
          {student.program === 'CREATE' && (
            <>
              <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold font-ninja text-ninja-navy">
                  {student.belt_level || '—'}
                </p>
                <p className="text-ninja-muted font-ninja text-sm">Current Belt</p>
              </div>
              <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold font-ninja text-ninja-navy">
                  {student.current_project || '—'}
                </p>
                <p className="text-ninja-muted font-ninja text-sm">Current Project</p>
              </div>
            </>
          )}
        </div>

        {/* Progress History */}
        <div className="bg-white border border-ninja-border rounded-xl p-6 shadow-sm">
          <h2 className="text-xl font-bold font-ninja text-ninja-navy mb-4">
            Progress <span className="text-ninja-blue">History</span>
          </h2>
          <ProgressHistory logs={student.progress_logs || []} />
        </div>
      </div>

      <EditStudentModal
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        student={student}
        onSaved={handleSaved}
      />
    </Layout>
  );
}
