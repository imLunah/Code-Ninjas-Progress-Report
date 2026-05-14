import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/layout/Layout';
import BeltBadge from '../../components/ui/BeltBadge';
import ProgramBadge from '../../components/ui/ProgramBadge';
import Button from '../../components/ui/Button';
import ProgressHistory from '../../components/shared/ProgressHistory';
import PinnedNote from '../../components/shared/PinnedNote';
import EditStudentModal from '../../components/manager/EditStudentModal';
import EnrollmentEditModal from '../../components/manager/EnrollmentEditModal';
import { api } from '../../api/client';
import { PROGRAMS, BELTS, PROJECTS, STATUSES, getMaxLevel, getBelt } from '../../utils/beltConfig';

// ── Avatar helpers ────────────────────────────────────────────────────────────
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
  const currentIconRef = React.useRef(null);
  const scrollRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollRef.current && currentIconRef.current) {
      const container = scrollRef.current;
      const icon = currentIconRef.current;
      const containerRect = container.getBoundingClientRect();
      const iconRect = icon.getBoundingClientRect();
      const scrollTo = container.scrollLeft + iconRect.left - containerRect.left - containerRect.width / 2 + iconRect.width / 2;
      container.scrollLeft = Math.max(0, scrollTo);
    }
  }, [beltIdx]);

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

      <div ref={scrollRef} className="overflow-x-auto -mx-4 px-4 no-scrollbar">
        <div className="flex items-center" style={{ minWidth: 'max-content' }}>
          {BELTS.map((b, i) => {
            const isCurrent = i === beltIdx;
            const isPast = i < beltIdx;
            const size = isCurrent ? 52 : 36;
            return (
              <React.Fragment key={b.name}>
                {i > 0 && (
                  <div className="h-0.5 flex-shrink-0" style={{ width: 16, backgroundColor: i <= beltIdx ? '#006ADD' : '#e2e8f0' }} />
                )}
                <div
                  ref={isCurrent ? currentIconRef : null}
                  className="relative flex-shrink-0"
                  style={{ width: size, height: size }}
                >
                  <img
                    src={`/belts/belt-${b.name.toLowerCase()}.png`}
                    alt={b.name}
                    className={`w-full h-full object-contain ${!isPast && !isCurrent ? 'opacity-25 grayscale' : ''}`}
                  />
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex mt-1" style={{ minWidth: 'max-content' }}>
          {BELTS.map((b, i) => {
            const isCurrent = i === beltIdx;
            const size = isCurrent ? 52 : 36;
            return (
              <React.Fragment key={b.name}>
                {i > 0 && <div className="flex-shrink-0" style={{ width: 16 }} />}
                <div className="flex justify-center flex-shrink-0" style={{ width: size }}>
                  <span className={`font-ninja text-[10px] leading-none ${isCurrent ? 'font-bold text-ninja-navy' : 'text-ninja-muted'}`}>
                    {b.name}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {progress !== null && (
        <div className="mt-3">
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

// ── Mobile: Non-CREATE program card ──────────────────────────────────────────
function MobileProgramCard({ enrollment }) {
  const { program, percent_complete, last_sub_program, last_module_name, last_lesson_name, last_session_date } = enrollment;
  const shortName = program === 'Robotics Academy' ? 'Robotics Academy' : program === 'AI Academy' ? 'AI Academy' : program;
  const barColor = program === 'Robotics Academy' ? '#f97316' : program === 'AI Academy' ? '#6366f1' : '#14b8a6';

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-ninja-border">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-ninja font-bold text-ninja-navy">{shortName}</h2>
        <ProgramBadge program={program} size="xs" />
      </div>

      {last_sub_program && (
        <p className="text-ninja-muted font-ninja text-sm mb-1">
          <span className="font-semibold text-ninja-navy">Kit:</span> {last_sub_program}
        </p>
      )}
      {last_module_name && (
        <p className="text-ninja-muted font-ninja text-sm mb-1">
          <span className="font-semibold text-ninja-navy">Module:</span> {last_module_name}
          {last_lesson_name && <span> · {last_lesson_name}</span>}
        </p>
      )}

      {percent_complete != null && (
        <div className="mt-2.5">
          <div className="h-2.5 rounded-full overflow-hidden bg-gray-100">
            <div className="h-full rounded-full" style={{ width: `${percent_complete}%`, backgroundColor: barColor }} />
          </div>
          <p className="text-right text-xs font-ninja font-bold text-ninja-navy mt-1">{Math.round(percent_complete)}%</p>
        </div>
      )}

      {last_session_date && (
        <p className="text-ninja-muted font-ninja text-xs mt-2">
          Last session: {new Date(String(last_session_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
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

// ── Desktop: Belt Journey card ─────────────────────────────────────────────────
function DesktopBeltJourney({ enrollment }) {
  const { belt_level, belt_sublevel, current_project, project_status } = enrollment;
  const belt = getBelt(belt_level);
  const maxLevel = getMaxLevel(belt_level);
  const progress = maxLevel ? Math.round((belt_sublevel / maxLevel) * 100) : null;
  const beltIdx = BELTS.findIndex((b) => b.name === belt_level);

  return (
    <div className="bg-white rounded-2xl p-5 border border-ninja-border shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-ninja font-bold text-ninja-navy">Belt Journey</h2>
        {maxLevel && (
          <span className="text-ninja-muted font-ninja text-sm">
            {belt_level} #{belt_sublevel} of {maxLevel}
          </span>
        )}
      </div>

      {/* Icon + connector row */}
      <div className="flex items-center">
        {BELTS.map((b, i) => {
          const isCurrent = i === beltIdx;
          const isPast = i < beltIdx;
          const size = isCurrent ? 52 : 36;
          return (
            <React.Fragment key={b.name}>
              {i > 0 && (
                <div
                  className="h-0.5 flex-1"
                  style={{ backgroundColor: i <= beltIdx ? '#006ADD' : '#e2e8f0' }}
                />
              )}
              <div className="flex-shrink-0" style={{ width: size, height: size }}>
                <img
                  src={`/belts/belt-${b.name.toLowerCase()}.png`}
                  alt={b.name}
                  className={`w-full h-full object-contain ${!isPast && !isCurrent ? 'opacity-25 grayscale' : ''}`}
                />
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {/* Label row */}
      <div className="flex mt-1.5">
        {BELTS.map((b, i) => {
          const isCurrent = i === beltIdx;
          const size = isCurrent ? 52 : 36;
          return (
            <React.Fragment key={b.name}>
              {i > 0 && <div className="flex-1" />}
              <div className="flex-shrink-0 flex justify-center" style={{ width: size }}>
                <span className={`font-ninja text-[10px] ${isCurrent ? 'font-bold text-ninja-navy' : 'text-ninja-muted'}`}>
                  {b.name}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {progress !== null && (
        <div className="mt-5">
          <div className="h-2.5 rounded-full overflow-hidden bg-gray-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, backgroundColor: belt?.color || '#006ADD' }}
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="text-ninja-muted font-ninja text-sm">
              {current_project
                ? `Current project: ${current_project}${project_status ? ` — ${project_status}` : ''}`
                : ''}
            </span>
            <span className="font-ninja font-bold text-sm text-ninja-navy">{progress}% to next belt</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Desktop: Activity bar chart ───────────────────────────────────────────────
function DesktopActivityChart({ logs }) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { label: d.toLocaleDateString('en-US', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), count: 0 };
  });
  for (const log of logs) {
    const d = new Date(String(log.session_date).split('T')[0] + 'T00:00:00');
    const m = months.find((m) => m.year === d.getFullYear() && m.month === d.getMonth());
    if (m) m.count++;
  }
  const max = Math.max(...months.map((m) => m.count), 1);
  const BAR_HEIGHT = 80;

  return (
    <div className="flex items-end gap-3">
      {months.map((m) => {
        const isCurrent = m.month === now.getMonth() && m.year === now.getFullYear();
        return (
          <div key={`${m.year}-${m.month}`} className="flex-1 flex flex-col items-center gap-1.5">
            {m.count > 0 && (
              <span className="text-ninja-muted font-ninja text-xs font-bold">{m.count}</span>
            )}
            <div className="w-full flex flex-col justify-end" style={{ height: BAR_HEIGHT }}>
              <div
                className="w-full rounded-t-md"
                style={{
                  height: m.count > 0 ? `${Math.max(8, Math.round((m.count / max) * BAR_HEIGHT))}px` : 0,
                  backgroundColor: isCurrent ? '#006ADD' : '#93c5fd',
                }}
              />
            </div>
            <span className="text-ninja-muted font-ninja text-xs">{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── AddProgramForm ────────────────────────────────────────────────────────────
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
  const nonCreatePrograms = programs.filter((p) => p.program !== 'CREATE');
  const logs = student.progress_logs || [];
  const locationName = user?.availableLocations?.find(l => l.id === student.location_id)?.name;

  // Desktop stats
  const now = new Date();
  const logsThisMonth = logs.filter((l) => {
    const d = new Date(String(l.session_date).split('T')[0] + 'T00:00:00');
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
  const sortedLogs = [...logs].sort((a, b) => new Date(b.session_date) - new Date(a.session_date));
  const lastSessionStr = sortedLogs[0]
    ? new Date(String(sortedLogs[0].session_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '—';

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
        <div className="lg:hidden space-y-4">

          {/* Compact header */}
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-ninja-border">
            <div className="flex items-center gap-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-ninja font-bold text-lg flex-shrink-0"
                style={{ backgroundColor: getAvatarColor(student.full_name) }}
              >
                {getInitials(student.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h1 className="text-xl font-bold font-ninja text-ninja-navy leading-tight">{student.full_name}</h1>
                  {isManager && !isReadOnly && (
                    <button
                      onClick={() => setShowEdit(true)}
                      className="text-ninja-blue font-ninja text-sm font-semibold flex-shrink-0"
                    >
                      Edit
                    </button>
                  )}
                </div>
                <p className="text-ninja-muted font-ninja text-sm mt-0.5 truncate">
                  {[
                    locationName,
                    programs.map(p => p.program === 'Robotics Academy' ? 'Robotics' : p.program === 'AI Academy' ? 'AI' : p.program).join(' · '),
                    `Joined ${new Date(student.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>
          </div>

          {/* Special Instructions */}
          {student.special_instructions && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
              <h2 className="text-ninja-navy font-ninja font-bold text-sm mb-1.5 flex items-center gap-2">
                <span className="text-amber-500">⚠</span> Special Instructions from Parent
              </h2>
              <p className="text-ninja-navy font-ninja text-sm leading-relaxed whitespace-pre-wrap">{student.special_instructions}</p>
            </div>
          )}

          {/* Pinned Note */}
          <PinnedNote
            studentId={student.id}
            initialNote={student.pinned_note}
            onUpdated={(note) => setStudent((prev) => ({ ...prev, pinned_note: note }))}
          />

          {/* Belt Journey (CREATE) */}
          {createEnrollment?.belt_level && <MobileBeltJourney enrollment={createEnrollment} />}

          {/* Other program cards */}
          {nonCreatePrograms.map((enrollment) => (
            <MobileProgramCard key={enrollment.program} enrollment={enrollment} />
          ))}

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

        {/* ── Desktop layout (lg+) ── */}
        <div className="hidden lg:block">

          {/* Page header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold font-ninja text-ninja-navy leading-tight">{student.full_name}</h1>
              <p className="text-ninja-muted font-ninja text-sm mt-1">
                {[
                  programs.map((p) => p.program === 'Robotics Academy' ? 'Robotics' : p.program === 'AI Academy' ? 'AI' : p.program).join(' · '),
                  `Joined ${new Date(student.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`,
                  locationName,
                  student.parent_name && `Parent: ${student.parent_name}`,
                ].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isManager && !isReadOnly && (
                <button
                  onClick={() => setShowEdit(true)}
                  className="border border-ninja-border text-ninja-navy font-ninja font-semibold text-sm px-4 py-2 rounded-xl hover:bg-ninja-bg transition-colors"
                >
                  Edit
                </button>
              )}
              {programs.length > 0 && !isReadOnly && (
                <button
                  onClick={() => navigate(`/sensei/student/${student.id}?programs=${encodeURIComponent(programs.map((p) => p.program).join(','))}`)}
                  className="bg-ninja-blue text-white font-ninja font-bold text-sm px-4 py-2 rounded-xl hover:bg-ninja-blue/90 transition-colors"
                >
                  + Log Session
                </button>
              )}
            </div>
          </div>

          {/* Two-column layout */}
          <div className="flex gap-6 items-start">

            {/* Left column */}
            <div className="flex-1 min-w-0 space-y-5">

              {/* Belt Journey */}
              {createEnrollment?.belt_level && <DesktopBeltJourney enrollment={createEnrollment} />}

              {/* Non-CREATE programs */}
              {nonCreatePrograms.map((enrollment) => (
                <MobileProgramCard key={enrollment.program} enrollment={enrollment} />
              ))}

              {/* Activity */}
              <div className="bg-white rounded-2xl p-5 border border-ninja-border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-ninja font-bold text-ninja-navy">Activity</h2>
                  <span className="text-ninja-blue font-ninja font-bold text-sm">
                    {logs.length} sessions · last 6 months
                  </span>
                </div>
                <DesktopActivityChart logs={logs} />
              </div>

              {/* Recent Progress */}
              {logs.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-ninja-border shadow-sm">
                  <h2 className="font-ninja font-bold text-ninja-navy mb-1">Recent Progress</h2>
                  <div>
                    {sortedLogs.slice(0, 6).map((log) => (
                      <div key={log.id} className="flex gap-3 py-3 border-t border-ninja-border/60 first:border-t-0 first:pt-0">
                        <div className="w-0.5 rounded-full bg-ninja-blue flex-shrink-0 self-stretch min-h-[1rem]" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="font-ninja font-bold text-ninja-navy text-sm">
                              {new Date(String(log.session_date).split('T')[0] + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            {log.sensei_name && (
                              <span className="text-ninja-muted font-ninja text-sm">Sensei {log.sensei_name}</span>
                            )}
                            {log.program && <ProgramBadge program={log.program} size="xs" />}
                          </div>
                          {log.notes && (
                            <p className="text-ninja-muted font-ninja text-sm leading-snug">{log.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Enrollments management */}
              {isManager && !isReadOnly && (
                <div className="bg-white rounded-2xl p-5 border border-ninja-border shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-ninja font-bold text-ninja-navy">Enrollments</h2>
                    {!showAddProgram && (
                      <button onClick={() => setShowAddProgram(true)} className="text-ninja-blue font-ninja text-sm hover:underline">
                        + Add Program
                      </button>
                    )}
                  </div>
                  {programs.length === 0 && !showAddProgram && (
                    <p className="text-ninja-muted font-ninja text-sm italic">No programs enrolled.</p>
                  )}
                  <div className="space-y-2">
                    {programs.map((enrollment) => (
                      <div key={enrollment.program} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-ninja-bg border border-ninja-border rounded-xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <ProgramBadge program={enrollment.program} size="sm" />
                          {enrollment.program === 'CREATE' && enrollment.belt_level && (
                            <BeltBadge belt={enrollment.belt_level} sublevel={enrollment.belt_sublevel} size="xs" />
                          )}
                          {enrollment.current_project && (
                            <span className="text-ninja-muted font-ninja text-sm">
                              {enrollment.current_project}{enrollment.project_status && ` — ${enrollment.project_status}`}
                            </span>
                          )}
                        </div>
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
                </div>
              )}
            </div>

            {/* Right column */}
            <div className="w-72 flex-shrink-0 space-y-4">

              {/* Student info card */}
              <div className="bg-white rounded-2xl p-5 border border-ninja-border shadow-sm">
                <div className="flex flex-col items-center text-center mb-4">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-white font-ninja font-bold text-xl mb-3 flex-shrink-0"
                    style={{ backgroundColor: getAvatarColor(student.full_name) }}
                  >
                    {getInitials(student.full_name)}
                  </div>
                  <h2 className="font-ninja font-bold text-ninja-navy text-lg leading-tight">{student.full_name}</h2>
                  <p className="text-ninja-muted font-ninja text-sm mt-0.5">
                    {student.birthday
                      ? `Age ${Math.floor((Date.now() - new Date(student.birthday.split('T')[0] + 'T00:00:00')) / (365.25 * 24 * 60 * 60 * 1000))} · `
                      : ''}
                    Member since {new Date(student.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1 justify-center">
                    {programs.map((p) => <ProgramBadge key={p.program} program={p.program} size="xs" />)}
                  </div>
                </div>

                {/* Stats 2×2 */}
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: 'Sessions', value: logs.length },
                    { label: 'This month', value: logsThisMonth },
                    { label: 'Current belt', value: createEnrollment?.belt_level || '—' },
                    { label: 'Last session', value: lastSessionStr },
                  ].map((s) => (
                    <div key={s.label} className="bg-ninja-bg rounded-xl p-3">
                      <p className="text-ninja-muted font-ninja text-xs">{s.label}</p>
                      <p className="font-ninja font-black text-ninja-navy text-lg leading-tight mt-0.5 truncate">{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Parent contact */}
                {isManager && (student.parent_name || student.parent_email || student.parent_phone) && (
                  <div className="mt-4 pt-4 border-t border-ninja-border space-y-1">
                    {student.parent_name && (
                      <p className="text-ninja-muted font-ninja text-sm">
                        <span className="font-semibold text-ninja-navy">Parent:</span> {student.parent_name}
                      </p>
                    )}
                    {student.parent_email && (
                      <p className="text-ninja-muted font-ninja text-sm">
                        <a href={`mailto:${student.parent_email}`} className="text-ninja-blue hover:underline">{student.parent_email}</a>
                      </p>
                    )}
                    {student.parent_phone && (
                      <p className="text-ninja-muted font-ninja text-sm">{student.parent_phone}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Pinned note */}
              <PinnedNote
                studentId={student.id}
                initialNote={student.pinned_note}
                onUpdated={(note) => setStudent((prev) => ({ ...prev, pinned_note: note }))}
              />

              {/* Special instructions */}
              {student.special_instructions && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
                  <h3 className="text-ninja-navy font-ninja font-bold text-sm mb-1.5 flex items-center gap-2">
                    <span className="text-amber-500">⚠</span> Special Instructions
                  </h3>
                  <p className="text-ninja-navy font-ninja text-sm leading-relaxed whitespace-pre-wrap">{student.special_instructions}</p>
                </div>
              )}

              {/* Deactivate */}
              {isManager && !isReadOnly && (
                <div className="bg-white rounded-2xl p-4 border border-ninja-border shadow-sm">
                  {confirmDeactivate ? (
                    <div className="flex gap-2">
                      <Button variant="danger" disabled={deactivating} onClick={handleDeactivate} size="sm">
                        {deactivating ? 'Removing...' : 'Confirm Remove'}
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirmDeactivate(false)} size="sm">Cancel</Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeactivate(true)}
                      className="w-full text-red-500 font-ninja font-semibold text-sm hover:text-red-600 transition-colors"
                    >
                      Remove Ninja
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <EditStudentModal isOpen={showEdit} onClose={() => setShowEdit(false)} student={student} onSaved={handleSaved} />
      <EnrollmentEditModal isOpen={!!editingEnrollment} onClose={() => setEditingEnrollment(null)} studentId={student.id} enrollment={editingEnrollment} onSaved={handleEnrollmentSaved} />
    </Layout>
  );
}
