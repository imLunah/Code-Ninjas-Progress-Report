import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import BeltBadge from '../ui/BeltBadge';
import ProgramBadge from '../ui/ProgramBadge';
import Button from '../ui/Button';

export default function TodayBoard({ assignments, onRemove }) {
  const { isReadOnly } = useAuth();
  const navigate = useNavigate();
  const [confirmId, setConfirmId] = useState(null);

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
        <p className="text-lg">No students added for today yet.</p>
        <p className="text-sm mt-1">Use the "Add Student" button to get started.</p>
      </div>
    );
  }

  const renderRow = (a) => (
    <div
      key={a.id}
      className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border ${
        a.completed ? 'bg-green-50 border-green-300' : 'bg-ninja-bg border-ninja-border'
      }`}
    >
      {/* Completion indicator */}
      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${a.completed ? 'bg-green-500' : 'bg-ninja-border'}`} />

      {/* Name */}
      <div className="flex-1 min-w-[150px]">
        <button
          onClick={() => navigate(`/manager/students/${a.student_id}`)}
          className="text-ninja-navy font-ninja font-bold hover:text-ninja-blue transition-colors text-left"
        >
          {a.student_name}
        </button>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <ProgramBadge program={a.program} size="xs" />
        {a.program === 'CREATE' && a.belt_level && (
          <BeltBadge belt={a.belt_level} sublevel={a.belt_sublevel} size="xs" />
        )}
        {a.current_project && (
          <span className="text-xs text-ninja-muted font-ninja bg-white border border-ninja-border px-2 py-0.5 rounded-md">
            {a.current_project}
          </span>
        )}
      </div>

      {/* Completed badge */}
      {a.completed ? (
        <span className="text-green-600 font-ninja font-semibold text-sm">✓ Done</span>
      ) : (
        <span className="text-ninja-muted font-ninja text-sm">Pending</span>
      )}

      {/* Remove */}
      {!isReadOnly && (
        confirmId === a.id ? (
          <div className="flex items-center gap-1">
            <Button variant="danger" size="sm" onClick={() => handleRemove(a.id)}>
              Confirm
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="danger" size="sm" onClick={() => setConfirmId(a.id)}>
            ✕
          </Button>
        )
      )}
    </div>
  );

  return (
    <div className="space-y-2">
      {assignments.map(renderRow)}
    </div>
  );
}
