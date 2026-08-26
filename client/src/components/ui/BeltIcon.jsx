import { getBelt } from '../../utils/beltConfig';

// Belts that ship a PNG icon (all of them now). Any belt missing an image falls
// back to a colored swatch tinted with the belt's color.
const IMAGE_BELTS = new Set(['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Red', 'Black', 'Bronze', 'Silver', 'Gold', 'Platinum']);

// Belts that ALSO ship a 768px copy, for the handful of places one is painted
// far bigger than an icon (the course banner's art, the profile hero). The
// everyday files stay 256px because the belt road draws all thirteen at 26px
// and has no business fetching a megabyte to do it. Only these nine exist:
// the metallic four have no transparent source art yet, and `large` quietly
// falls back to the small file for them rather than requesting a 404.
const LARGE_BELTS = new Set(['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Red', 'Black']);

export function hasLargeBelt(belt) {
  return LARGE_BELTS.has(belt);
}

export default function BeltIcon({ belt, size = 40, dimmed = false, large = false, className = '', style = {} }) {
  if (!belt) return null;
  const dim = dimmed ? 'opacity-25 grayscale' : '';

  if (IMAGE_BELTS.has(belt)) {
    const file = `belt-${belt.toLowerCase()}${large && LARGE_BELTS.has(belt) ? '-lg' : ''}.png`;
    return (
      <img
        src={`/belts/${file}`}
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
