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

  const sorted = [...assignments].sort((a, b) => {
    if (a.completed === b.completed) return 0;
    return a.completed ? 1 : -1;
  });

  const completedCount = assignments.filter((a) => a.completed).length;

  return (
    <div className="space-y-3">
      {/* Legend + count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 font-ninja text-sm text-ninja-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
            Logged
          </span>
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
          {completedCount} / {assignments.length}
        </span>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
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
            {/* Name row */}
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

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <ProgramBadge program={a.program} size="xs" />
              {a.belt_level && (
                <BeltBadge belt={a.belt_level} sublevel={a.belt_sublevel} size="xs" />
              )}
            </div>

            {/* Project · Status */}
            {a.current_project && (
              <p className="text-ninja-muted font-ninja text-sm leading-snug">
                {a.current_project}{a.project_status ? ` · ${a.project_status}` : ''}
              </p>
            )}

            {/* Sensei */}
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
  );
}
