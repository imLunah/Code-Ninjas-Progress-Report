import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { today } from '../../utils/dateUtils';
import BeltBadge from '../ui/BeltBadge';
import ProgramBadge from '../ui/ProgramBadge';

export default function TodayBoard({ assignments, onRemove }) {
  const { isReadOnly } = useAuth();
  const navigate = useNavigate();
  const [confirmId, setConfirmId] = useState(null);
  const todayStr = today();

  const handleRemove = async (id) => {
    try {
      await api.delete(`/daily/${id}`);
      onRemove && onRemove(id);
    } catch (err) {
      console.error('Failed to remove:', err);
    } finally {
      setConfirmId(null);
    }
  };

  if (assignments.length === 0) {
    return (
      <div className="text-center py-12 text-ninja-muted font-ninja">
        <img src="/CodeNinjasLaptop.png" alt="Code Ninjas" className="h-24 mx-auto mb-3" />
        <p className="text-lg">No ninjas added for today yet.</p>
        <p className="text-sm mt-1">Use the "+ Check In Ninja" button to get started.</p>
      </div>
    );
  }

  const completedCount = assignments.filter((a) => a.completed).length;
  // Only show pending/overdue — completed ninjas are tracked in the stat strip above
  const sorted = [...assignments]
    .filter((a) => !a.completed)
    .sort((a, b) => {
      const aOver = a.session_date && String(a.session_date).split('T')[0] < todayStr;
      const bOver = b.session_date && String(b.session_date).split('T')[0] < todayStr;
      if (aOver === bOver) return 0;
      return aOver ? -1 : 1; // overdue first
    });

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12 text-ninja-muted font-ninja">
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-lg font-bold text-ninja-navy">All {completedCount} ninja{completedCount !== 1 ? 's' : ''} logged!</p>
        <p className="text-sm mt-1">Great session today.</p>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile layout (new compact design) ── */}
      <div className="sm:hidden space-y-3">
        {/* Legend + count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 font-ninja text-sm text-ninja-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" />
              Pending
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
              Overdue
            </span>
          </div>
          <span className="font-ninja font-bold text-sm text-ninja-navy">
            {completedCount} / {assignments.length} logged
          </span>
        </div>

        <div className="space-y-3">
          {sorted.map((a) => {
            const isOverdue = !a.completed && a.session_date &&
              new Date(a.session_date).toISOString().split('T')[0] < todayStr;
            const borderColor = a.completed ? '#4ade80' : isOverdue ? '#f87171' : '#fde047';
            const dotClass = a.completed ? 'bg-green-500' : isOverdue ? 'bg-red-400' : 'bg-yellow-400';

            return (
              <div
                key={a.id}
                className="bg-white rounded-2xl p-4 cursor-pointer"
                style={{ border: `2px solid ${borderColor}` }}
                onClick={() => navigate(`/manager/students/${a.student_id}`)}
              >
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-ninja-navy font-ninja font-bold text-lg leading-tight">
                      {a.student_name}
                    </span>
                    {isOverdue && (
                      <span className="text-xs font-ninja font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">
                        Overdue
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${dotClass}`} />
                    {!isReadOnly && (
                      confirmId === a.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleRemove(a.id)}
                            className="text-xs font-ninja font-semibold text-white bg-red-500 px-2 py-0.5 rounded-lg"
                          >
                            Remove
                          </button>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-xs font-ninja font-semibold text-ninja-muted bg-ninja-bg border border-ninja-border px-2 py-0.5 rounded-lg"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmId(a.id); }}
                          className="text-ninja-muted hover:text-red-400 transition-colors text-sm leading-none"
                          title="Remove from board"
                        >
                          ✕
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <ProgramBadge program={a.program} size="xs" />
                  {a.belt_level && (
                    <BeltBadge belt={a.belt_level} sublevel={a.belt_sublevel} size="xs" />
                  )}
                </div>
                {a.current_project && (
                  <p className="text-ninja-muted font-ninja text-sm leading-snug">
                    {a.current_project}{a.project_status ? ` · ${a.project_status}` : ''}
                  </p>
                )}
                {a.sensei_name && (
                  <p className="text-ninja-muted font-ninja text-xs mt-1">
                    Sensei: {a.sensei_name}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Tablet + Desktop layout (sm+): card grid ── */}
      <div className="hidden sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((a) => {
          const isOverdue = !a.completed && a.session_date &&
            String(a.session_date).split('T')[0] < todayStr;
          const borderClass = a.completed ? 'border-green-400' : isOverdue ? 'border-red-400' : 'border-yellow-300';
          const dotClass = a.completed ? 'bg-green-500' : isOverdue ? 'bg-red-400' : 'bg-yellow-400';

          return (
            <div
              key={a.id}
              className={`bg-white border-2 ${borderClass} rounded-2xl p-4 shadow-sm flex flex-col gap-3`}
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => navigate(`/manager/students/${a.student_id}`)}
                  className="text-ninja-navy font-ninja font-bold text-lg leading-tight hover:text-ninja-blue transition-colors text-left"
                >
                  {a.student_name}
                </button>
                <div className="flex items-center gap-2 flex-shrink-0 mt-1">
                  <div className={`w-3 h-3 rounded-full ${dotClass}`} />
                  {!isReadOnly && (
                    confirmId === a.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleRemove(a.id)} className="text-xs font-ninja font-semibold text-white bg-red-500 px-2 py-0.5 rounded-lg">Remove</button>
                        <button onClick={() => setConfirmId(null)} className="text-xs font-ninja font-semibold text-ninja-muted bg-ninja-bg border border-ninja-border px-2 py-0.5 rounded-lg">Cancel</button>
                      </div>
                    ) : (
                      <button onClick={() => setConfirmId(a.id)} className="text-ninja-muted hover:text-red-400 transition-colors text-sm leading-none">✕</button>
                    )
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ProgramBadge program={a.program} size="xs" />
                {a.program === 'CREATE' && a.belt_level && <BeltBadge belt={a.belt_level} sublevel={a.belt_sublevel} size="xs" />}
              </div>
              {a.current_project && (
                <p className="text-ninja-muted font-ninja text-sm">{a.current_project}{a.project_status ? ` — ${a.project_status}` : ''}</p>
              )}
              {a.completed ? (
                <p className="text-green-600 font-ninja font-semibold text-xs">✓ Done</p>
              ) : isOverdue ? (
                <p className="text-red-600 font-ninja font-semibold text-xs">Overdue</p>
              ) : (
                <p className="text-yellow-700 font-ninja font-semibold text-xs">Not logged yet</p>
              )}
              {!a.completed && !isReadOnly && (
                <button
                  onClick={() => navigate(`/sensei/student/${a.student_id}?programs=${encodeURIComponent(a.program)}`)}
                  className="mt-auto w-full text-sm font-ninja font-bold text-ninja-blue border-2 border-ninja-blue rounded-xl py-2 hover:bg-ninja-blue hover:text-white transition-colors"
                >
                  Log Progress
                </button>
              )}
            </div>
          );
        })}
      </div>

    </>
  );
}
