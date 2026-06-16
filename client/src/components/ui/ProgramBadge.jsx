import { PROGRAM_LOGOS } from '../../utils/beltConfig';

// Program class tags keep their OWN fixed identity colors — they do NOT follow
// the theme accent: JR = purple, Robotics + AI + CREATE = blue.
const PROGRAM_COLORS = {
  'CREATE':           { bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-300',     border: 'border-blue-500/20' },
  'Robotics Academy': { bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-300',     border: 'border-blue-500/20' },
  'AI Academy':       { bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-300',     border: 'border-blue-500/20' },
  'JR':               { bg: 'bg-purple-500/12', text: 'text-purple-600 dark:text-purple-300', border: 'border-purple-500/20' },
};

const SIZE = {
  xs: { pad: 'text-xs px-2 py-0.5 gap-1',    img: 'w-4 h-4' },
  sm: { pad: 'text-sm px-2.5 py-1 gap-1.5',  img: 'w-5 h-5' },
  md: { pad: 'text-base px-3 py-1.5 gap-2',  img: 'w-6 h-6' },
};

export default function ProgramBadge({ program, size = 'sm' }) {
  if (!program) return null;
  const c = PROGRAM_COLORS[program] || { bg: 'bg-ninja-border/20', text: 'text-ninja-muted', border: 'border-ninja-border' };
  const logo = PROGRAM_LOGOS[program];
  const s = SIZE[size] || SIZE.sm;

  return (
    <span className={`inline-flex items-center rounded-md border font-ninja font-bold ${s.pad} ${c.bg} ${c.text} ${c.border}`}>
      {logo && <img src={logo} alt="" className={`${s.img} rounded-full object-contain flex-shrink-0`} />}
      {program}
    </span>
  );
}
