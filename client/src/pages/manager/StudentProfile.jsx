import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/layout/Layout';
import BeltBadge from '../../components/ui/BeltBadge';
import ProgramBadge from '../../components/ui/ProgramBadge';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import ProgressHistory from '../../components/shared/ProgressHistory';
import PinnedNote from '../../components/shared/PinnedNote';
import EditStudentModal from '../../components/manager/EditStudentModal';
import EnrollmentEditModal from '../../components/manager/EnrollmentEditModal';
import { api } from '../../api/client';
import { PROGRAMS, BELTS, PROJECTS, STATUSES, getMaxLevel } from '../../utils/beltConfig';

function AddProgramForm({ studentId, existingPrograms, onAdded, onCancel }) {
  const [program, setProgram] = useState('');
  const [beltLevel, setBeltLevel] = useState('');
  const [beltSublevel, setBeltSublevel] = useState('');
  const [currentProject, setCurrentProject] = useState('');
  const [projectStatus, setProjectStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isCreate = program === 'CREATE';
  const maxLevel = getMaxLevel(beltLevel);
  const available = PROGRAMS.filter((p) => !existingPrograms.includes(p));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const added = await api.post(`/students/${studentId}/programs`, {
        program,
        belt_level: isCreate && beltLevel ? beltLevel : null,
        belt_sublevel: isCreate && beltSublevel ? parseInt(beltSublevel) : null,
        current_project: isCreate && currentProject ? currentProject : null,
        project_status: isCreate && projectStatus ? projectStatus : null,
      });
      onAdded && onAdded(added);
    } catch (err) {
      setError(err.message || 'Failed to add program');
      setLoading(false);
    }
  };

  if (available.length === 0) {
    return (
      <div className="text-ninja-muted font-ninja text-sm italic">
        Ninja is already enrolled in all programs.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-ninja-border rounded-xl p-4 bg-ninja-bg">
      {error && (
        <p className="text-ninja-red text-sm font-ninja">{error}</p>
      )}
      <select
        value={program}
        onChange={(e) => {
          setProgram(e.target.value);
          setBeltLevel(''); setBeltSublevel(''); setCurrentProject(''); setProjectStatus('');
        }}
        required
        className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors"
      >
        <option value="">Select program...</option>
        {available.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>

      {isCreate && (
        <div className="space-y-2 pt-1">
          <select value={beltLevel} onChange={(e) => { setBeltLevel(e.target.value); setBeltSublevel(''); }}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors">
            <option value="">Select belt (optional)...</option>
            {BELTS.map((b) => <option key={b.name} value={b.name}>{b.name}</option>)}
          </select>
          {maxLevel && beltLevel && (
            <input type="number" value={beltSublevel} onChange={(e) => setBeltSublevel(e.target.value)}
              min={1} max={maxLevel} placeholder={`Sublevel (1–${maxLevel})`}
              className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors" />
          )}
          <select value={currentProject} onChange={(e) => setCurrentProject(e.target.value)}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors">
            <option value="">Select project (optional)...</option>
            {PROJECTS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={projectStatus} onChange={(e) => setProjectStatus(e.target.value)}
            className="w-full bg-white border border-ninja-border text-ninja-navy rounded-lg px-4 py-2 font-ninja focus:outline-none focus:border-ninja-blue transition-colors">
            <option value="">Select status (optional)...</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading || !program} size="sm">
          {loading ? 'Adding...' : 'Add Program'}
        </Button>
        <Button variant="secondary" size="sm" type="button" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isReadOnly } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [showAddProgram, setShowAddProgram] = useState(false);

  const isManager = user?.role === 'manager';

  useEffect(() => {
    api.get(`/students/${id}`)
      .then(setStudent)
      .catch(() => setError('Failed to load ninja'))
      .finally(() => setLoading(false));
  }, [id, user?.activeLocation?.id]);

  const handleSaved = (updated) => {
    setStudent((prev) => ({ ...prev, ...updated }));
  };

  const handleEnrollmentSaved = (updated) => {
    setStudent((prev) => ({
      ...prev,
      programs: (prev.programs || []).map((p) =>
        p.program === updated.program ? { ...p, ...updated } : p
      ),
    }));
  };

  const handleProgramAdded = (newEnrollment) => {
    setStudent((prev) => ({
      ...prev,
      programs: [...(prev.programs || []), newEnrollment],
    }));
    setShowAddProgram(false);
  };

  const handleRemoveProgram = async (program) => {
    if (!window.confirm(`Remove ${student.full_name} from ${program}?`)) return;
    try {
      await api.delete(`/students/${id}/programs/${encodeURIComponent(program)}`);
      setStudent((prev) => ({
        ...prev,
        programs: (prev.programs || []).filter((p) => p.program !== program),
      }));
    } catch (err) {
      setError('Failed to remove program');
    }
  };

  const handleDeactivate = async () => {
    if (!window.confirm(`Remove ${student.full_name} from the roster? This cannot be undone.`)) return;
    setDeactivating(true);
    try {
      await api.delete(`/students/${id}`);
      navigate('/manager/students');
    } catch (err) {
      setError('Failed to deactivate ninja');
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
        <p className="text-ninja-red font-ninja text-center py-12">{error || 'Ninja not found'}</p>
      </Layout>
    );
  }

  const programs = student.programs || [];
  const createEnrollment = programs.find((p) => p.program === 'CREATE');

  return (
    <Layout>
      <div className="space-y-6">
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
                <h1 className="text-xl sm:text-3xl font-bold font-ninja text-ninja-navy">{student.full_name}</h1>
                {programs.map((p) => (
                  <ProgramBadge key={p.program} program={p.program} size="md" />
                ))}
              </div>
              {createEnrollment && (
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  {createEnrollment.belt_level && (
                    <BeltBadge belt={createEnrollment.belt_level} sublevel={createEnrollment.belt_sublevel} size="md" />
                  )}
                  {createEnrollment.current_project && (
                    <span className="text-ninja-navy font-ninja">
                      {createEnrollment.current_project}
                      {createEnrollment.project_status && (
                        <span className="text-ninja-muted ml-2">— {createEnrollment.project_status}</span>
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
            <div className="flex flex-wrap gap-2">
              {programs.length === 1 ? (
                <Button onClick={() => navigate(`/sensei/student/${student.id}?program=${encodeURIComponent(programs[0].program)}`)}>
                  Log Progress
                </Button>
              ) : programs.length > 1 ? (
                programs.map((p) => (
                  <Button
                    key={p.program}
                    variant="secondary"
                    onClick={() => navigate(`/sensei/student/${student.id}?program=${encodeURIComponent(p.program)}`)}
                  >
                    Log {p.program}
                  </Button>
                ))
              ) : null}
              {isManager && !isReadOnly && (
                <>
                  <Button onClick={() => setShowEdit(true)} variant="secondary">
                    Edit
                  </Button>
                  <Button onClick={handleDeactivate} variant="danger" disabled={deactivating}>
                    {deactivating ? 'Removing...' : 'Remove'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold font-ninja text-ninja-blue">{student.progress_logs?.length || 0}</p>
            <p className="text-ninja-muted font-ninja text-sm">Total Sessions</p>
          </div>
          {createEnrollment && (
            <>
              <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold font-ninja text-ninja-navy">
                  {createEnrollment.belt_level || '—'}
                </p>
                <p className="text-ninja-muted font-ninja text-sm">Current Belt</p>
              </div>
              <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
                <p className="text-2xl font-bold font-ninja text-ninja-navy">
                  {createEnrollment.current_project || '—'}
                </p>
                <p className="text-ninja-muted font-ninja text-sm">Current Project</p>
              </div>
            </>
          )}
        </div>

        {/* Programs */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold font-ninja text-ninja-navy">
              Program <span className="text-ninja-blue">Enrollments</span>
            </h2>
            {isManager && !isReadOnly && !showAddProgram && (
              <button
                onClick={() => setShowAddProgram(true)}
                className="text-ninja-blue font-ninja text-sm hover:underline"
              >
                + Add Program
              </button>
            )}
          </div>

          {programs.length === 0 && !showAddProgram && (
            <p className="text-ninja-muted font-ninja text-sm italic">No programs enrolled.</p>
          )}

          <div className="space-y-3">
            {programs.map((enrollment) => (
              <div key={enrollment.program} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-ninja-bg border border-ninja-border rounded-xl">
                <div className="flex flex-wrap items-center gap-3">
                  <ProgramBadge program={enrollment.program} size="sm" />
                  {enrollment.program === 'CREATE' && enrollment.belt_level && (
                    <BeltBadge belt={enrollment.belt_level} sublevel={enrollment.belt_sublevel} size="xs" />
                  )}
                  {enrollment.current_project && (
                    <span className="text-ninja-muted font-ninja text-sm">
                      {enrollment.current_project}
                      {enrollment.project_status && ` — ${enrollment.project_status}`}
                    </span>
                  )}
                </div>
                {isManager && !isReadOnly && (
                  <div className="flex gap-2">
                    {enrollment.program === 'CREATE' && (
                      <Button size="sm" variant="secondary" onClick={() => setEditingEnrollment(enrollment)}>
                        Edit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleRemoveProgram(enrollment.program)}
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {showAddProgram && (
              <AddProgramForm
                studentId={student.id}
                existingPrograms={programs.map((p) => p.program)}
                onAdded={handleProgramAdded}
                onCancel={() => setShowAddProgram(false)}
              />
            )}
          </div>
        </Card>

        {/* Pinned Note */}
        <PinnedNote
          studentId={student.id}
          initialNote={student.pinned_note}
          onUpdated={(note) => setStudent((prev) => ({ ...prev, pinned_note: note }))}
        />

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

      <EnrollmentEditModal
        isOpen={!!editingEnrollment}
        onClose={() => setEditingEnrollment(null)}
        studentId={student.id}
        enrollment={editingEnrollment}
        onSaved={handleEnrollmentSaved}
      />
    </Layout>
  );
}
