import { today } from '../../utils/dateUtils';
import BeltBadge from '../ui/BeltBadge';
import ProgramBadge from '../ui/ProgramBadge';

export default function StudentCard({ student, onClick, onLogProgress }) {
  // Support both single-assignment (TodayBoard) and grouped (SenseiDashboard) views.
  // When grouped, student.assignments contains all of today's assignments for this student.
  const assignments = student.assignments || [{ program: student.program, completed: student.completed }];
  const allCompleted = assignments.every((a) => a.completed);
  const someCompleted = !allCompleted && assignments.some((a) => a.completed);
  const todayStr = today();
  const isOverdue = !allCompleted && assignments.some(
    (a) => !a.completed && a.session_date && String(a.session_date).split('T')[0] < todayStr
  );

  // For CREATE badge details, pull from the primary assignment or the student object
  const createAssignment = assignments.find((a) => a.program === 'CREATE') || {};

  return (
    <div
      className={`bg-white border rounded-xl p-4 transition-all shadow-sm ${
        allCompleted ? 'border-green-400' : isOverdue ? 'border-orange-400 bg-orange-50' : someCompleted ? 'border-yellow-300' : 'border-ninja-border'
      } ${onClick ? 'cursor-pointer hover:border-ninja-blue' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-ninja-navy font-ninja font-bold text-lg truncate">
              {student.student_name || student.full_name}
            </h3>
            {allCompleted && (
              <span className="text-green-500 text-lg" title="All done">✓</span>
            )}
            {isOverdue && (
              <span className="text-orange-600 font-ninja font-semibold text-xs px-2 py-0.5 bg-orange-100 border border-orange-300 rounded-md">Overdue</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            {assignments.map((a) => (
              <ProgramBadge key={a.program} program={a.program} size="xs" />
            ))}
            {createAssignment.belt_level && (
              <BeltBadge
                belt={createAssignment.belt_level || student.belt_level}
                sublevel={createAssignment.belt_sublevel || student.belt_sublevel}
                size="xs"
              />
            )}
          </div>

          {someCompleted && (
            <p className="text-yellow-600 font-ninja text-xs mt-1 font-semibold">
              {assignments.filter((a) => a.completed).length}/{assignments.length} programs logged
            </p>
          )}

          {student.current_project && (
            <p className="text-ninja-muted text-sm font-ninja mt-1">
              {student.current_project} — {student.project_status}
            </p>
          )}

          {student.sensei_name && (
            <p className="text-ninja-muted text-xs font-ninja mt-1">
              Sensei: {student.sensei_name}
            </p>
          )}
        </div>
        <div
          className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
            allCompleted ? 'bg-green-500' : isOverdue ? 'bg-orange-400' : someCompleted ? 'bg-yellow-400' : 'bg-ninja-border'
          }`}
        />
      </div>

      {onLogProgress && (
        <button
          onClick={(e) => { e.stopPropagation(); onLogProgress(); }}
          className="mt-3 w-full text-sm font-ninja font-bold text-ninja-blue border border-ninja-blue rounded-lg py-1.5 hover:bg-ninja-blue hover:text-white transition-colors"
        >
          Log Progress
        </button>
      )}
    </div>
  );
}
