import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Layout from '../../components/layout/Layout';
import { api } from '../../api/client';

const MONTH_LABEL = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

function BeltBar({ belt, sublevel, percent }) {
  const BELT_COLORS = {
    White: '#e2e8f0', Yellow: '#facc15', Orange: '#f97316',
    Green: '#22c55e', Blue: '#3b82f6', Purple: '#a855f7',
    Brown: '#92400e', Red: '#ef4444', Black: '#1a1a1a',
  };
  const color = BELT_COLORS[belt] || '#e2e8f0';
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
        <span>{belt} Belt{sublevel ? ` · Level ${sublevel}` : ''}</span>
        {percent != null && <span>{percent}%</span>}
      </div>
      {percent != null && (
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
          <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
        </div>
      )}
    </div>
  );
}

function ProgramPill({ label, count }) {
  const COLORS = {
    CREATE: 'bg-blue-100 text-blue-800 border-blue-200',
    JR: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Robotics Academy': 'bg-purple-100 text-purple-800 border-purple-200',
    'AI Academy': 'bg-green-100 text-green-800 border-green-200',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold border ${COLORS[label] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
      {label}
      <span className="font-normal opacity-70">· {count} session{count !== 1 ? 's' : ''}</span>
    </span>
  );
}

function EmailCard({ student }) {
  const {
    full_name, parent_name, parent_email,
    create_belt, create_belt_sublevel, create_belt_percent,
    create_current_project, create_project_status, create_sessions_this_month, create_last_session_date,
    jr_last_sub_program, jr_last_module, jr_last_lesson, jr_sessions_this_month, jr_last_session_date,
    robotics_last_sub_program, robotics_last_module, robotics_last_lesson, robotics_sessions_this_month, robotics_last_session_date,
    ai_last_sub_program, ai_last_module, ai_last_lesson, ai_sessions_this_month, ai_last_session_date,
    total_sessions_this_month, clubs_attended_this_month, club_sessions_this_month,
  } = student;

  const hasCREATE  = parseInt(create_sessions_this_month) > 0;
  const hasJR      = parseInt(jr_sessions_this_month) > 0;
  const hasRobotics = parseInt(robotics_sessions_this_month) > 0;
  const hasAI      = parseInt(ai_sessions_this_month) > 0;
  const hasClubs   = parseInt(club_sessions_this_month) > 0;

  return (
    <div className="bg-white border border-ninja-border rounded-2xl shadow-sm overflow-hidden">
      {/* Email header bar */}
      <div className="bg-ninja-blue px-5 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/CodeNinjasIcon.svg" alt="" className="w-6 h-6 opacity-90" />
          <span className="text-white font-ninja font-bold text-sm">DojoLink Monthly Progress Report</span>
        </div>
        <span className="text-blue-200 font-ninja text-xs">{MONTH_LABEL}</span>
      </div>

      <div className="p-5 space-y-4">
        {/* To / subject line */}
        <div className="text-xs text-ninja-muted font-ninja space-y-0.5 border-b border-ninja-border pb-3">
          <p><span className="font-semibold text-ninja-navy">To:</span> {parent_name} &lt;{parent_email}&gt;</p>
          <p><span className="font-semibold text-ninja-navy">Subject:</span> {full_name}'s Progress Report — {MONTH_LABEL}</p>
        </div>

        {/* Greeting */}
        <p className="font-ninja text-ninja-navy text-sm">
          Hi {parent_name?.split(' ')[0] || 'there'},
        </p>
        <p className="font-ninja text-ninja-muted text-sm">
          Here's a summary of <strong className="text-ninja-navy">{full_name}</strong>'s activity this month at Code Ninjas.
          They completed <strong className="text-ninja-navy">{total_sessions_this_month} coding session{total_sessions_this_month !== 1 ? 's' : ''}</strong>
          {hasClubs ? ` and attended ${club_sessions_this_month} club session${club_sessions_this_month !== 1 ? 's' : ''}` : ''}.
        </p>

        {/* Program blocks */}
        <div className="space-y-3">
          {hasCREATE && (
            <div className="rounded-xl border border-ninja-border bg-ninja-bg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ProgramPill label="CREATE" count={parseInt(create_sessions_this_month)} />
              </div>
              {create_belt && (
                <BeltBar belt={create_belt} sublevel={create_belt_sublevel} percent={create_belt_percent} />
              )}
              {create_current_project && (
                <p className="text-xs text-ninja-muted font-ninja mt-1.5">
                  Project: <span className="font-semibold text-ninja-navy">{create_current_project}</span>
                  {create_project_status && (
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-xs font-semibold ${
                      create_project_status === 'Completed' ? 'bg-green-100 text-green-700'
                      : create_project_status === 'Working On' ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'
                    }`}>{create_project_status}</span>
                  )}
                </p>
              )}
            </div>
          )}

          {hasJR && (
            <div className="rounded-xl border border-ninja-border bg-ninja-bg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ProgramPill label="JR" count={parseInt(jr_sessions_this_month)} />
              </div>
              {(jr_last_sub_program || jr_last_module || jr_last_lesson) && (
                <p className="text-xs text-ninja-muted font-ninja">
                  Last worked on:{' '}
                  <span className="text-ninja-navy font-semibold">
                    {[jr_last_sub_program, jr_last_module, jr_last_lesson].filter(Boolean).join(' · ')}
                  </span>
                </p>
              )}
            </div>
          )}

          {hasRobotics && (
            <div className="rounded-xl border border-ninja-border bg-ninja-bg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ProgramPill label="Robotics Academy" count={parseInt(robotics_sessions_this_month)} />
              </div>
              {(robotics_last_sub_program || robotics_last_module || robotics_last_lesson) && (
                <p className="text-xs text-ninja-muted font-ninja">
                  Last worked on:{' '}
                  <span className="text-ninja-navy font-semibold">
                    {[robotics_last_sub_program, robotics_last_module, robotics_last_lesson].filter(Boolean).join(' · ')}
                  </span>
                </p>
              )}
            </div>
          )}

          {hasAI && (
            <div className="rounded-xl border border-ninja-border bg-ninja-bg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ProgramPill label="AI Academy" count={parseInt(ai_sessions_this_month)} />
              </div>
              {(ai_last_sub_program || ai_last_module || ai_last_lesson) && (
                <p className="text-xs text-ninja-muted font-ninja">
                  Last worked on:{' '}
                  <span className="text-ninja-navy font-semibold">
                    {[ai_last_sub_program, ai_last_module, ai_last_lesson].filter(Boolean).join(' · ')}
                  </span>
                </p>
              )}
            </div>
          )}

          {hasClubs && (
            <div className="rounded-xl border border-ninja-border bg-ninja-bg p-4">
              <p className="text-xs font-ninja font-semibold text-ninja-navy mb-1">
                Clubs · {club_sessions_this_month} session{club_sessions_this_month !== 1 ? 's' : ''}
              </p>
              <p className="text-xs text-ninja-muted font-ninja">{clubs_attended_this_month}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-ninja-muted font-ninja border-t border-ninja-border pt-3">
          Keep up the great work! See you at the dojo. 🥷
        </p>
      </div>
    </div>
  );
}

export default function EmailPreviewPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/email-preview')
      .then((data) => {
        setStudents(data);
        if (data.length > 0) setSelected(data[0].student_id);
      })
      .catch(() => setError('Could not load preview data.'))
      .finally(() => setLoading(false));
  }, []);

  const student = students.find((s) => s.student_id === selected);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold font-ninja text-ninja-navy">Email Preview</h1>
          <p className="text-ninja-muted font-ninja text-sm mt-1">
            Preview the monthly progress email parents will receive via Zapier.
          </p>
        </div>

        {loading && <p className="text-ninja-muted font-ninja text-sm">Loading...</p>}
        {error && <p className="text-ninja-red font-ninja text-sm">{error}</p>}

        {!loading && !error && students.length === 0 && (
          <div className="bg-white border border-ninja-border rounded-2xl p-8 text-center">
            <p className="text-ninja-muted font-ninja text-sm">
              No students with activity this month yet.
            </p>
          </div>
        )}

        {students.length > 0 && (
          <>
            <div className="flex items-center gap-3">
              <label className="font-ninja text-sm font-semibold text-ninja-navy whitespace-nowrap">
                Preview for:
              </label>
              <select
                value={selected || ''}
                onChange={(e) => setSelected(parseInt(e.target.value))}
                className="flex-1 bg-white border border-ninja-border rounded-xl px-3 py-2 font-ninja text-sm text-ninja-navy focus:outline-none focus:border-ninja-blue"
              >
                {students.map((s) => (
                  <option key={s.student_id} value={s.student_id}>{s.full_name}</option>
                ))}
              </select>
            </div>

            <div className="text-xs text-ninja-muted font-ninja bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
              This is a live preview using real data from this month. The Zapier email will use the same fields from the <code className="font-mono text-xs">student_monthly_summary</code> view.
            </div>

            {student && <EmailCard student={student} />}
          </>
        )}
      </div>
    </Layout>
  );
}
