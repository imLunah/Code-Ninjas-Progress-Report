import { getBelt } from '../../utils/beltConfig';

const sizeClasses = {
  xs: 'text-xs px-1.5 py-0.5',
  sm: 'text-sm px-2 py-0.5',
  md: 'text-base px-3 py-1',
};

export default function BeltBadge({ belt, sublevel, size = 'sm' }) {
  if (!belt) return null;

  const beltConfig = getBelt(belt);
  if (!beltConfig) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md font-ninja font-bold ${sizeClasses[size]}`}
      style={{ backgroundColor: beltConfig.color, color: beltConfig.textColor }}
    >
      {belt}
    </span>
  );
}
