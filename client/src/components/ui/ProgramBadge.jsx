import { PROGRAM_LOGOS } from '../../utils/beltConfig';

// Program class tags keep their OWN fixed identity colors — they do NOT follow
// the theme accent: JR = purple, Robotics + AI + CREATE = blue.
const PROGRAM_COLORS = {
  'CREATE':           { bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-300',     border: 'border-blue-500/20' },
  'Robotics Academy': { bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-300',     border: 'border-blue-500/20' },
  'AI Academy':       { bg: 'bg-blue-500/10',   text: 'text-blue-600 dark:text-blue-300',     border: 'border-blue-500/20' },
  'JR':               { bg: 'bg-purple-500/12', text: 'text-purple-600 dark:text-purple-300', border: 'border-purple-500/20' },
  'Silver':           { bg: 'bg-slate-400/12',  text: 'text-slate-600 dark:text-slate-300',   border: 'border-slate-400/25' },
  'Gold Unity':       { bg: 'bg-amber-500/12',  text: 'text-amber-600 dark:text-amber-300',   border: 'border-amber-500/25' },
  'Gold Godot':       { bg: 'bg-amber-500/12',  text: 'text-amber-600 dark:text-amber-300',   border: 'border-amber-500/25' },
};

const SIZE = {
  xs: { pad: 'text-xs px-2 py-0.5 gap-1',    img: 'w-4 h-4' },
  sm: { pad: 'text-sm px-2.5 py-1 gap-1.5',  img: 'w-5 h-5' },
  md: { pad: 'text-base px-3 py-1.5 gap-2',  img: 'w-6 h-6' },
};

const AVATAR = {
  xs: 'w-7 h-7',
  sm: 'w-11 h-11',
  md: 'w-14 h-14',
};

// Circular program photo. Falls back to a neutral "class" glyph when the
// program is unset or has no logo. Used on check-in cards (photo on the left).
export function ProgramAvatar({ program, size = 'md' }) {
  const logo = program ? PROGRAM_LOGOS[program] : null;
  const dims = AVATAR[size] || AVATAR.md;
  return (
    <div
      title={program || 'Class not set'}
      className={`${dims} rounded-full flex-shrink-0 flex items-center justify-center overflow-hidden ring-1 ring-ninja-border bg-white`}
    >
      {logo ? (
        <img src={logo} alt={program} className="w-full h-full object-contain" />
      ) : (
        <svg className="w-1/2 h-1/2 text-ninja-muted" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.42A12 12 0 0112 21a12 12 0 01-6.16-10.42L12 14z" />
        </svg>
      )}
    </div>
  );
}

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
