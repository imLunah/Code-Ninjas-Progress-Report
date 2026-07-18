import { getBelt } from '../../utils/beltConfig';

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
};

// Plain colored text (no pill). Colors are theme-safe per belt — the raw belt
// colors don't work as text everywhere (white on light bg, black on dark bg,
// platinum too faint on white), so each belt gets a light/dark-aware class.
const TEXT_CLASSES = {
  White:    'text-gray-400 dark:text-white',
  Yellow:   'text-yellow-500 dark:text-yellow-400',
  Orange:   'text-orange-500 dark:text-orange-400',
  Green:    'text-green-600 dark:text-green-400',
  Blue:     'text-blue-500 dark:text-blue-400',
  Purple:   'text-purple-500 dark:text-purple-400',
  Brown:    'text-amber-800 dark:text-amber-600',
  Red:      'text-red-600 dark:text-red-400',
  Black:    'text-ninja-navy',
  Bronze:   'text-[#cd7f32]',
  Silver:   'text-slate-400 dark:text-slate-300',
  Platinum: 'text-slate-400 dark:text-slate-200',
  Gold:     'text-[#d4af37]',
};

export default function BeltBadge({ belt, sublevel, size = 'sm' }) {
  if (!belt) return null;

  const beltConfig = getBelt(belt);
  if (!beltConfig) return null;

  return (
    <span className={`inline-flex items-center gap-1 font-ninja font-bold ${sizeClasses[size]} ${TEXT_CLASSES[belt] || 'text-ninja-navy'}`}>
      {belt}
    </span>
  );
}
