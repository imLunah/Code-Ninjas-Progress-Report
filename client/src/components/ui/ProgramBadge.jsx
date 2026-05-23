import { PROGRAM_LOGOS } from '../../utils/beltConfig';

const PROGRAM_COLORS = {
  'CREATE': 'bg-blue-100 text-blue-700',
  'Robotics Academy': 'bg-purple-100 text-purple-700',
  'AI Academy': 'bg-indigo-100 text-indigo-700',
  'JR': 'bg-green-100 text-green-700',
};

export default function ProgramBadge({ program, size = 'sm' }) {
  if (!program) return null;
  const colorClass = PROGRAM_COLORS[program] || 'bg-gray-100 text-gray-600';
  const logo = PROGRAM_LOGOS[program];

  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-sm px-2 py-0.5',
    md: 'text-base px-3 py-1',
  };

  const imgSize = size === 'md' ? 'w-6 h-6' : 'w-5 h-5';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md font-ninja font-bold ${sizeClasses[size]} ${colorClass}`}>
      {size !== 'xs' && logo && (
        <img src={logo} alt="" className={`${imgSize} rounded overflow-hidden object-contain flex-shrink-0`} />
      )}
      {program}
    </span>
  );
}
