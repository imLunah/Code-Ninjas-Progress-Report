import { PROGRAM_LOGOS } from '../../utils/beltConfig';

// Colors follow the project convention: JR = purple, Robotics + AI + CREATE use
// the brand accent (ninja-blue) so they track the user's theme color.
const PROGRAM_COLORS = {
  'CREATE':           { bg: 'bg-ninja-blue/10', text: 'text-ninja-blue',                      ring: 'ring-ninja-blue/25' },
  'Robotics Academy': { bg: 'bg-ninja-blue/10', text: 'text-ninja-blue',                      ring: 'ring-ninja-blue/25' },
  'AI Academy':       { bg: 'bg-ninja-blue/10', text: 'text-ninja-blue',                      ring: 'ring-ninja-blue/25' },
  'JR':               { bg: 'bg-purple-500/12', text: 'text-purple-600 dark:text-purple-300', ring: 'ring-purple-500/25' },
};

const SIZE = {
  xs: { pad: 'text-xs px-2 py-0.5 gap-1',    img: 'w-4 h-4' },
  sm: { pad: 'text-sm px-2.5 py-1 gap-1.5',  img: 'w-5 h-5' },
  md: { pad: 'text-base px-3 py-1.5 gap-2',  img: 'w-6 h-6' },
};

export default function ProgramBadge({ program, size = 'sm' }) {
  if (!program) return null;
  const c = PROGRAM_COLORS[program] || { bg: 'bg-ninja-border/20', text: 'text-ninja-muted', ring: 'ring-ninja-border' };
  const logo = PROGRAM_LOGOS[program];
  const s = SIZE[size] || SIZE.sm;

  return (
    <span className={`inline-flex items-center rounded-full font-ninja font-bold ring-1 ${s.pad} ${c.bg} ${c.text} ${c.ring}`}>
      {logo && <img src={logo} alt="" className={`${s.img} rounded-full object-contain flex-shrink-0`} />}
      {program}
    </span>
  );
}
