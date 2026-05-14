import React, { useState, useEffect } from 'react';
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
import { PROGRAMS, BELTS, PROJECTS, STATUSES, getMaxLevel, getBelt } from '../../utils/beltConfig';

// ── Avatar helpers (shared with roster) ──────────────────────────────────────
const AVATAR_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#3b82f6',
  '#8b5cf6','#ec4899','#14b8a6','#6366f1','#f59e0b',
];
function getAvatarColor(name) {
  const sum = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}
function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── Mobile: Belt Journey card ─────────────────────────────────────────────────
function MobileBeltJourney({ enrollment }) {
  const { belt_level, belt_sublevel, current_project } = enrollment;
  const belt = getBelt(belt_level);
  const maxLevel = getMaxLevel(belt_level);
  const progress = maxLevel ? Math.round((belt_sublevel / maxLevel) * 100) : null;
  const beltIdx = BELTS.findIndex(b => b.name === belt_level);
  const start = Math.max(0, Math.min(beltIdx - 2, BELTS.length - 5));
  const visible = BELTS.slice(start, start + 5);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-ninja-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-ninja font-bold text-ninja-navy">Belt Journey</h2>
        {maxLevel && (
          <span className="text-ninja-muted font-ninja text-sm">
            {belt_level} #{belt_sublevel} of {maxLevel}
          </span>
        )}
      </div>

      {/* Belt icons */}
      <div className="flex items-center">
        {visible.map((b, i) => {
          const idx = BELTS.findIndex(x => x.name === b.name);
          const isCurrent = idx === beltIdx;
          const isPast = idx < beltIdx;
          const size = isCurrent ? 56 : 40;
          return (
            <React.Fragment key={b.name}>
              {i > 0 && (
                <div className="flex-1 h-0.5" style={{ backgroundColor: idx <= beltIdx ? '#006ADD' : '#e2e8f0' }} />
              )}
              <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
                <img
                  src={`/belts/belt-${b.name.toLowerCase()}.png`}
                  alt={b.name}
                  className={`w-full h-full object-contain ${!isPast && !isCurrent ? 'opacity-25 grayscale' : ''}`}
                />
                {isCurrent && belt?.color && (
                  <div className="absolute inset-0 rounded-full border-[3px]" style={{ borderColor: belt.color }} />
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Progress bar */}
      {progress !== null && (
        <div className="mt-4">
          <div className="h-2.5 rounded-full overflow-hidden bg-gray-100">
            <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: belt?.color || '#006ADD' }} />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-ninja-muted font-ninja text-xs">
              {current_project ? `Current project: ${current_project}` : ''}
            </span>
            <span className="font-ninja font-bold text-xs text-ninja-navy">{progress}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Mobile: Activity bar chart ────────────────────────────────────────────────
function MobileActivityChart({ logs }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString('en-US', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), count: 0 };
  });
  for (const log of logs) {
    const d = new Date(String(log.session_date).split('T')[0] + 'T00:00:00');
    const m = months.find(m => m.year === d.getFullYear() && m.month === d.getMonth());
    if (m) m.count++;
  }
  const max = Math.max(...months.map(m => m.count), 1);
  const BAR_HEIGHT = 52;

  return (
    <div className="flex items-end gap-2">
      {months.map((m) => (
        <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1.5">
          <div className="w-full flex flex-col justify-end" style={{ height: BAR_HEIGHT }}>
            <div
              className="w-full rounded-t-md bg-ninja-blue"
              style={{ height: m.count > 0 ? `${Math.max(6, Math.round((m.count / max) * BAR_HEIGHT))}px` : 0 }}
            />
          </div>
          <span className="text-ninja-muted font-ninja text-xs">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

// ── AddProgramForm (unchanged) ────────────────────────────────────────────────
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
    return <div className="text-ninja-muted font-ninja text-sm italic">Ninja is already enrolled in all programs.</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 border border-ninja-border rounded-xl p-4 bg-ninja-bg">
      {error && <p className="text-ninja-red text-sm font-ninja">{error}</p>}
      <select
        value={program}
        onChange={(e) => { setProgram(e.target.value); setBeltLevel(''); setBeltSublevel(''); setCurrentProject(''); setProjectStatus(''); }}
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
        <Button type="submit" disabled={loading || !program} size="sm">{loading ? 'Adding...' : 'Add Program'}</Button>
        <Button variant="secondary" size="sm" type="button" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StudentProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isReadOnly } = useAuth();
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEdit, setShowEdit] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [confirmRemoveProgram, setConfirmRemoveProgram] = useState(null);
  const [editingEnrollment, setEditingEnrollment] = useState(null);
  const [showAddProgram, setShowAddProgram] = useState(false);

  const isManager = user?.role === 'manager';

  useEffect(() => {
    api.get(`/students/${id}`)
      .then(setStudent)
      .catch(() => setError('Failed to load ninja'))
      .finally(() => setLoading(false));
  }, [id, user?.activeLocation?.id]);

  const handleSaved = (updated) => setStudent((prev) => ({ ...prev, ...updated }));

  const handleEnrollmentSaved = (updated) => {
    setStudent((prev) => ({
      ...prev,
      programs: (prev.programs || []).map((p) => p.program === updated.program ? { ...p, ...updated } : p),
    }));
  };

  const handleProgramAdded = (newEnrollment) => {
    setStudent((prev) => ({ ...prev, programs: [...(prev.programs || []), newEnrollment] }));
    setShowAddProgram(false);
  };

  const handleRemoveProgram = async (program) => {
    try {
      await api.delete(`/students/${id}/programs/${encodeURIComponent(program)}`);
      setStudent((prev) => ({ ...prev, programs: (prev.programs || []).filter((p) => p.program !== program) }));
    } catch {
      setError('Failed to remove program');
    } finally {
      setConfirmRemoveProgram(null);
    }
  };

  const handleDeactivate = async () => {
    setDeactivating(true);
    try {
      await api.delete(`/students/${id}`);
      navigate('/manager/students');
    } catch {
      setError('Failed to deactivate ninja');
      setDeactivating(false);
    } finally {
      setConfirmDeactivate(false);
    }
  };

  if (loading) return <Layout><p className="text-ninja-muted font-ninja text-center py-12">Loading...</p></Layout>;
  if (error || !student) return <Layout><p className="text-ninja-red font-ninja text-center py-12">{error || 'Ninja not found'}</p></Layout>;

  const programs = student.programs || [];
  const createEnrollment = programs.find((p) => p.program === 'CREATE');
  const logs = student.progress_logs || [];
  const locationName = user?.availableLocations?.find(l => l.id === student.location_id)?.name;

  return (
    <Layout>
      <div>
        <button
          onClick={() => navigate('/manager/students')}
          className="text-ninja-muted hover:text-ninja-blue font-ninja text-sm flex items-center gap-1 transition-colors mb-4"
        >
          ← Back to Roster
        </button>

        {/* ── Mobile layout ───────────────────────────────────────────────── */}
        <div className="md:hidden space-y-4">

          {/* Compact header */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-ninja-border flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold font-ninja text-ninja-navy leading-tight">{student.full_name}</h1>
              <p className="text-ninja-muted font-ninja text-sm mt-0.5 truncate">
                {[
                  locationName,
                  programs.map(p => p.program === 'Robotics Academy' ? 'Robotics' : p.program === 'AI Academy' ? 'AI' : p.program).join(' · '),
                  `Joined ${new Date(student.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-ninja font-bold text-base flex-shrink-0"
              style={{ backgroundColor: getAvatarColor(student.full_name) }}
            >
              {getInitials(student.full_name)}
            </div>
          </div>

          {/* Belt Journey */}
          {createEnrollment?.belt_level && <MobileBeltJourney enrollment={createEnrollment} />}

          {/* Activity chart */}
          {logs.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-ninja-border">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-ninja font-bold text-ninja-navy">Activity</h2>
                <span className="text-ninja-blue font-ninja font-bold text-sm">{logs.length} sessions</span>
              </div>
              <MobileActivityChart logs={logs} />
            </div>
          )}

          {/* Recent Progress */}
          {logs.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-ninja-border">
              <h2 className="font-ninja font-bold text-ninja-navy mb-3">Recent Progress</h2>
              <div className="space-y-4">
                {logs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex gap-3">
                    <div className="w-1 rounded-full bg-ninja-blue flex-shrink-0 self-stretch" />
                    <div className="min-w-0">
                      <p className="font-ninja font-bold text-ninja-navy text-sm leading-snug">
                        {new Date(String(log.session_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {log.sensei_name && (
                          <span className="font-normal text-ninja-muted"> · {log.sensei_name}</span>
                        )}
                      </p>
                      {log.notes && (
                        <p className="text-ninja-muted font-ninja text-sm mt-0.5 leading-snug">{log.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {logs.length === 0 && (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-ninja-border text-center">
              <p className="text-ninja-muted font-ninja text-sm italic">No sessions logged yet.</p>
            </div>
          )}

          {/* Log Progress CTA */}
          {!isReadOnly && programs.length > 0 && (
            <button
              onClick={() => navigate(`/sensei/student/${student.id}?programs=${encodeURIComponent(programs.map(p => p.program).join(','))}`)}
              className="w-full bg-ninja-blue text-white font-ninja font-bold py-3.5 rounded-2xl shadow-sm"
            >
              Log Progress
            </button>
          )}
        </div>

        {/* ── Desktop layout (existing) ────────────────────────────────────── */}
        <div className="hidden md:block space-y-6">

          {/* Profile Header */}
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-xl sm:text-3xl font-bold font-ninja text-ninja-navy">{student.full_name}</h1>
                  {programs.map((p) => <ProgramBadge key={p.program} program={p.program} size="md" />)}
                </div>
                {createEnrollment && (
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {createEnrollment.belt_level && (
                      <BeltBadge belt={createEnrollment.belt_level} sublevel={createEnrollment.belt_sublevel} size="md" />
                    )}
                    {createEnrollment.current_project && (
                      <span className="text-ninja-navy font-ninja">
                        {createEnrollment.current_project}
                        {createEnrollment.project_status && <span className="text-ninja-muted ml-2">— {createEnrollment.project_status}</span>}
                      </span>
                    )}
                  </div>
                )}
                {student.birthday && (
                  <p className="text-ninja-muted font-ninja text-sm mt-2">
                    Age {Math.floor((Date.now() - new Date(student.birthday.split('T')[0] + 'T00:00:00')) / (365.25 * 24 * 60 * 60 * 1000))}
                    {' · '}Born {new Date(student.birthday.split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
                <p className="text-ninja-muted font-ninja text-sm mt-1">
                  Member since {new Date(student.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </p>
                {isManager && (student.parent_name || student.parent_email || student.parent_phone) && (
                  <div className="mt-3 pt-3 border-t border-ninja-border">
                    {student.parent_name && <p className="text-ninja-muted font-ninja text-sm"><span className="font-semibold text-ninja-navy">Parent:</span> {student.parent_name}</p>}
                    {student.parent_email && (
                      <p className="text-ninja-muted font-ninja text-sm">
                        <span className="font-semibold text-ninja-navy">Email:</span>{' '}
                        <a href={`mailto:${student.parent_email}`} className="text-ninja-blue hover:underline">{student.parent_email}</a>
                      </p>
                    )}
                    {student.parent_phone && <p className="text-ninja-muted font-ninja text-sm"><span className="font-semibold text-ninja-navy">Phone:</span> {student.parent_phone}</p>}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {programs.length > 0 && !isReadOnly && (
                  <Button onClick={() => navigate(`/sensei/student/${student.id}?programs=${encodeURIComponent(programs.map(p => p.program).join(','))}`)}>
                    Log Progress
                  </Button>
                )}
                {isManager && !isReadOnly && (
                  <>
                    <Button onClick={() => setShowEdit(true)} variant="secondary">Edit</Button>
                    {confirmDeactivate ? (
                      <div className="flex items-center gap-2">
                        <Button variant="danger" disabled={deactivating} onClick={handleDeactivate}>{deactivating ? 'Removing...' : 'Confirm'}</Button>
                        <Button variant="secondary" onClick={() => setConfirmDeactivate(false)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button onClick={() => setConfirmDeactivate(true)} variant="danger">Remove</Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
              <p className="text-2xl font-bold font-ninja text-ninja-blue">{logs.length}</p>
              <p className="text-ninja-muted font-ninja text-sm">Total Sessions</p>
            </div>
            {createEnrollment && (
              <>
                <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
                  <p className="text-2xl font-bold font-ninja text-ninja-navy">{createEnrollment.belt_level || '—'}</p>
                  <p className="text-ninja-muted font-ninja text-sm">Current Belt</p>
                </div>
                <div className="bg-white border border-ninja-border rounded-xl p-4 text-center shadow-sm">
                  <p className="text-2xl font-bold font-ninja text-ninja-navy">{createEnrollment.current_project || '—'}</p>
                  <p className="text-ninja-muted font-ninja text-sm">Current Project</p>
                </div>
              </>
            )}
          </div>

          {/* Programs */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold font-ninja text-ninja-navy">Program <span className="text-ninja-blue">Enrollments</span></h2>
              {isManager && !isReadOnly && !showAddProgram && (
                <button onClick={() => setShowAddProgram(true)} className="text-ninja-blue font-ninja text-sm hover:underline">+ Add Program</button>
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
                      <span className="text-ninja-muted font-ninja text-sm">{enrollment.current_project}{enrollment.project_status && ` — ${enrollment.project_status}`}</span>
                    )}
                  </div>
                  {isManager && !isReadOnly && (
                    <div className="flex gap-2">
                      {enrollment.program === 'CREATE' && (
                        <Button size="sm" variant="secondary" onClick={() => setEditingEnrollment(enrollment)}>Edit</Button>
                      )}
                      {confirmRemoveProgram === enrollment.program ? (
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="danger" onClick={() => handleRemoveProgram(enrollment.program)}>Confirm</Button>
                          <Button size="sm" variant="secondary" onClick={() => setConfirmRemoveProgram(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="danger" onClick={() => setConfirmRemoveProgram(enrollment.program)}>Remove</Button>
                      )}
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

          {/* Special Instructions from Parent */}
          {student.special_instructions && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 shadow-sm">
              <h2 className="text-ninja-navy font-ninja font-bold text-lg mb-2 flex items-center gap-2">
                <span className="text-amber-500">⚠</span> Special Instructions from Parent
              </h2>
              <p className="text-ninja-navy font-ninja text-sm leading-relaxed whitespace-pre-wrap">{student.special_instructions}</p>
            </div>
          )}

          {/* Progress History */}
          <div className="bg-white border border-ninja-border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-bold font-ninja text-ninja-navy mb-4">Progress <span className="text-ninja-blue">History</span></h2>
            <ProgressHistory
              logs={logs}
              onLogUpdated={(logId, changes) =>
                setStudent((prev) => ({ ...prev, progress_logs: prev.progress_logs.map((l) => l.id === logId ? { ...l, ...changes } : l) }))
              }
              onLogDeleted={(logId) =>
                setStudent((prev) => ({ ...prev, progress_logs: prev.progress_logs.filter((l) => l.id !== logId) }))
              }
            />
          </div>
        </div>
      </div>

      <EditStudentModal isOpen={showEdit} onClose={() => setShowEdit(false)} student={student} onSaved={handleSaved} />
      <EnrollmentEditModal isOpen={!!editingEnrollment} onClose={() => setEditingEnrollment(null)} studentId={student.id} enrollment={editingEnrollment} onSaved={handleEnrollmentSaved} />
    </Layout>
  );
}
