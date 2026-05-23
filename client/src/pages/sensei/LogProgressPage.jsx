import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import BeltBadge from '../../components/ui/BeltBadge';
import ProgramBadge from '../../components/ui/ProgramBadge';
import Card from '../../components/ui/Card';
import LogEntryForm from '../../components/sensei/LogEntryForm';
import PinnedNote from '../../components/shared/PinnedNote';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatDate } from '../../utils/dateUtils';
import { PROGRAM_LOGOS } from '../../utils/beltConfig';

export default function LogProgressPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isReadOnly } = useAuth();
  const dashboardPath = ['manager', 'admin'].includes(user?.role) ? '/manager/dashboard' : '/sensei/dashboard';
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');

  // ?program=X pre-selects a single program; ?programs=X,Y lists programs available today
  // ?done=X,Y lists programs already fully logged; ?dates=P:YYYY-MM-DD,...; ?counts=P:N,...
  const singleProgramParam = searchParams.get('program');
  const programsParam = searchParams.get('programs');
  const doneParam = searchParams.get('done');
  const datesParam = searchParams.get('dates');
  const countsParam = searchParams.get('counts');
  const todayPrograms = programsParam ? programsParam.split(',') : null;
  const donePrograms = new Set(doneParam ? doneParam.split(',') : []);

  // Parse per-program session date and pending count from URL (set by dashboard)
  const programDates = datesParam
    ? Object.fromEntries(datesParam.split(',').map(s => { const i = s.lastIndexOf(':'); return [s.slice(0, i), s.slice(i + 1)]; }))
    : {};
  const programCounts = countsParam
    ? Object.fromEntries(countsParam.split(',').map(s => { const i = s.lastIndexOf(':'); return [s.slice(0, i), parseInt(s.slice(i + 1))]; }))
    : {};

  useEffect(() => {
    api.get(`/students/${id}`)
      .then((data) => {
        setStudent(data);
        if (singleProgramParam) {
          setSelectedProgram(singleProgramParam);
        } else if (todayPrograms) {
          const available = (data.programs || []).filter((p) => todayPrograms.includes(p.program));
          // Auto-select the first un-done program, or just the only program
          const pending = available.filter((p) => !donePrograms.has(p.program));
          if (pending.length === 1) setSelectedProgram(pending[0].program);
          else if (available.length === 1) setSelectedProgram(available[0].program);
        } else if (data.programs?.length === 1) {
          setSelectedProgram(data.programs[0].program);
        }
      })
      .catch(() => setError('Failed to load ninja'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLogged = (newLog) => {
    navigate(dashboardPath);
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

  // Show only today's programs if we came from the board; otherwise all enrolled
  const availablePrograms = todayPrograms
    ? (student.programs || []).filter((p) => todayPrograms.includes(p.program))
    : (student.programs || []);

  const enrollment = availablePrograms.find((p) => p.program === selectedProgram);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto lg:max-w-none">
        <button
          onClick={() => navigate(dashboardPath)}
          className="text-ninja-muted hover:text-ninja-blue font-ninja text-sm flex items-center gap-1 transition-colors mb-6"
        >
          ← Back to Dashboard
        </button>

        <div className="lg:flex lg:gap-8 lg:items-start space-y-6 lg:space-y-0">
          {/* Left panel: student info + program selector + pinned note */}
          <div className="lg:w-80 lg:flex-shrink-0 space-y-4">
            <Card>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex-1">
                  <h1 className="text-2xl font-bold font-ninja text-ninja-navy">{student.full_name}</h1>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    {availablePrograms.map((p) => (
                      <ProgramBadge key={p.program} program={p.program} />
                    ))}
                    {enrollment?.program === 'CREATE' && enrollment.belt_level && (
                      <BeltBadge belt={enrollment.belt_level} sublevel={enrollment.belt_sublevel} />
                    )}
                    {enrollment?.current_project && (
                      <span className="text-ninja-muted font-ninja text-sm">
                        {enrollment.current_project}{enrollment.project_status ? ` — ${enrollment.project_status}` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {availablePrograms.length > 1 && (
                <div className="mt-4 pt-4 border-t border-ninja-border">
                  <label className="block text-ninja-muted text-xs font-ninja font-semibold uppercase tracking-wide mb-2">
                    Which program are you logging?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availablePrograms.map((p) => {
                      const isDone = donePrograms.has(p.program);
                      const isSelected = selectedProgram === p.program;
                      return (
                        <button
                          key={p.program}
                          onClick={() => setSelectedProgram(p.program)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-ninja font-semibold transition-colors flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-ninja-blue text-white'
                              : isDone
                              ? 'bg-green-50 border border-green-300 text-green-700 hover:border-green-500'
                              : 'bg-ninja-bg border border-ninja-border text-ninja-navy hover:border-ninja-blue'
                          }`}
                        >
                          {isDone && !isSelected && <span className="text-green-600">✓</span>}
                          {PROGRAM_LOGOS[p.program] && (
                            <img src={PROGRAM_LOGOS[p.program]} alt="" className="w-5 h-5 rounded overflow-hidden object-contain flex-shrink-0" />
                          )}
                          {p.program}
                          {isDone && !isSelected && <span className="text-xs font-normal opacity-75">logged</span>}
                        </button>
                      );
                    })}
                  </div>
                  {donePrograms.size > 0 && donePrograms.size < availablePrograms.length && (
                    <p className="text-ninja-muted font-ninja text-xs mt-2">
                      {donePrograms.size}/{availablePrograms.length} programs already logged today.
                    </p>
                  )}
                </div>
              )}
            </Card>

            <PinnedNote
              studentId={student.id}
              initialNote={student.pinned_note}
              onUpdated={(note) => setStudent((prev) => ({ ...prev, pinned_note: note }))}
            />
            {student.special_instructions && (
              <div className="rounded-2xl overflow-hidden" style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe' }}>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">📌</span>
                    <h2 className="font-ninja font-bold text-sm uppercase tracking-wide" style={{ color: '#1e3a5f' }}>Note from Parent</h2>
                  </div>
                  <p className="font-ninja text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#1e40af' }}>
                    {student.special_instructions}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right panel: log form */}
          <div className="lg:flex-1 min-w-0">
            {isReadOnly ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm text-center">
                <p className="text-amber-700 font-ninja font-semibold">
                  You can only log progress at your home center.
                </p>
              </div>
            ) : selectedProgram ? (
              <div className="bg-white border border-ninja-border rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-bold font-ninja text-ninja-navy mb-4">
                  Log Today's <span className="text-ninja-blue">Session</span>
                </h2>
                {(programCounts[selectedProgram] || 0) > 1 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm font-ninja text-amber-700">
                    <strong>{programCounts[selectedProgram]} sessions to log.</strong> Starting with the oldest
                    {programDates[selectedProgram] ? ` (${formatDate(programDates[selectedProgram])})` : ''}. They'll still show up for today after.
                  </div>
                )}
                <LogEntryForm
                  student={student}
                  program={selectedProgram}
                  enrollment={enrollment}
                  onLogged={handleLogged}
                  sessionDate={programDates[selectedProgram] || student.pending_checkin_date || undefined}
                />
              </div>
            ) : (
              <div className="bg-white border border-ninja-border rounded-xl p-6 shadow-sm text-center">
                <p className="text-ninja-muted font-ninja">Select a program above to log a session.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
