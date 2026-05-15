import { useCustomPrograms } from '../../context/CustomProgramsContext';

const PROGRAM_COLORS = {
  'CREATE': 'bg-blue-100 text-blue-700',
  'Robotics Academy': 'bg-purple-100 text-purple-700',
  'AI Academy': 'bg-indigo-100 text-indigo-700',
  'JR': 'bg-green-100 text-green-700',
};

export default function ProgramBadge({ program, isCustom: isCustomProp, size = 'sm' }) {
  const { isCustomProgram } = useCustomPrograms();
  if (!program) return null;

  const isCustom = isCustomProp ?? isCustomProgram(program);
  const colorClass = isCustom ? 'bg-orange-100 text-orange-700' : (PROGRAM_COLORS[program] || 'bg-gray-100 text-gray-600');

  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-sm px-2 py-0.5',
    md: 'text-base px-3 py-1',
  };

  return (
    <span className={`inline-block rounded-md font-ninja font-bold ${sizeClasses[size]} ${colorClass}`}>
      {program}
    </span>
  );
}
