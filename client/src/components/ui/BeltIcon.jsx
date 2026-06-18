import { getBelt } from '../../utils/beltConfig';

// Belts that ship a PNG icon (all of them now). Any belt missing an image falls
// back to a colored swatch tinted with the belt's color.
const IMAGE_BELTS = new Set(['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Red', 'Black', 'Bronze', 'Silver', 'Gold', 'Platinum']);

export default function BeltIcon({ belt, size = 40, dimmed = false, className = '', style = {} }) {
  if (!belt) return null;
  const dim = dimmed ? 'opacity-25 grayscale' : '';

  if (IMAGE_BELTS.has(belt)) {
    return (
      <img
        src={`/belts/belt-${belt.toLowerCase()}.png`}
        alt={belt}
        draggable={false}
        style={{ width: size, height: size, ...style }}
        className={`object-contain ${dim} ${className}`}
      />
    );
  }

  const cfg = getBelt(belt);
  return (
    <div
      title={belt}
      style={{ width: size, height: size, backgroundColor: cfg?.color || '#9ca3af', color: cfg?.textColor || '#fff', ...style }}
      className={`rounded-full flex items-center justify-center font-ninja font-black border border-black/10 ${dim} ${className}`}
    >
      <span style={{ fontSize: Math.round(size * 0.44), lineHeight: 1 }}>{belt[0]}</span>
    </div>
  );
}
