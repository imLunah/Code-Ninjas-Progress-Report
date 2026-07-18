import { getBelt } from '../../utils/beltConfig';

const sizeClasses = {
  xs: 'text-xs',
  sm: 'text-sm',
  md: 'text-base',
};

// Plain text belt label (no pill, no color) — normal theme text.
export default function BeltBadge({ belt, sublevel, size = 'sm' }) {
  if (!belt) return null;

  const beltConfig = getBelt(belt);
  if (!beltConfig) return null;

  return (
    <span className={`inline-flex items-center gap-1 font-ninja font-bold text-ninja-navy ${sizeClasses[size]}`}>
      {belt}
    </span>
  );
}
