import BeltBadge from '../ui/BeltBadge';
import ProgramBadge from '../ui/ProgramBadge';

export default function StudentCard({ student, onClick, onLogProgress }) {
  const isCompleted = !!student.completed;

  return (
    <div
      className={`bg-white border rounded-xl p-4 transition-all shadow-sm ${
        isCompleted ? 'border-green-400' : 'border-ninja-border'
      } ${onClick ? 'cursor-pointer hover:border-ninja-blue' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-ninja-navy font-ninja font-bold text-lg truncate">
              {student.student_name || student.full_name}
            </h3>
            {isCompleted && (
              <span className="text-green-500 text-lg" title="Completed">✓</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <ProgramBadge program={student.program} size="xs" />
            {student.program === 'CREATE' && student.belt_level && (
              <BeltBadge belt={student.belt_level} sublevel={student.belt_sublevel} size="xs" />
            )}
          </div>
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
        <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${isCompleted ? 'bg-green-500' : 'bg-ninja-border'}`} />
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
