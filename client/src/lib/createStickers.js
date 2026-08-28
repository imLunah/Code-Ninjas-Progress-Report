// CREATE's decorative belt artwork becomes a collection of earned stickers.
//
// These are DojoLink milestones, not an official one-icon-per-level mapping:
// some belts ship fewer pieces of artwork than curriculum levels. In those
// cases one sticker celebrates a small run of related levels. Progress is
// derived from the enrollment and logs already loaded by the parent portal;
// there is no second achievement record to keep in sync.

const sticker = (belt, number, title, levels) => ({
  id: `${belt.toLowerCase()}-${number}`,
  belt,
  title,
  levels,
  src: `/belt-stickers/${belt.toLowerCase()}-${number}.png`,
});

export const CREATE_STICKERS = [
  sticker('White', 1, 'First Coder', [1]),
  sticker('White', 2, 'Sequence Scout', [2]),
  sticker('White', 3, 'Event Explorer', [3]),
  sticker('White', 4, 'Function Maker', [4]),

  sticker('Yellow', 1, 'Variable Keeper', [1]),
  sticker('Yellow', 2, 'Loop Rider', [2]),
  sticker('Yellow', 3, 'Creative Logic', [3, 4]),

  sticker('Orange', 1, 'Tilemap Trailblazer', [1]),
  sticker('Orange', 2, 'Lifecycle Launcher', [2]),
  sticker('Orange', 3, 'Array Organizer', [3]),
  sticker('Orange', 4, 'Loop Collector', [4]),
  sticker('Orange', 5, 'Function Builder', [5]),

  sticker('Green', 1, 'Platform Physicist', [1]),
  sticker('Green', 2, 'Boolean Brain', [2]),
  sticker('Green', 3, 'Nested Loop Ninja', [3]),
  sticker('Green', 4, 'Tilemap Engineer', [4]),
  sticker('Green', 5, 'Extension Expert', [5]),

  sticker('Blue', 1, 'JavaScript Starter', [1]),
  sticker('Blue', 2, 'Property Pro', [2]),
  sticker('Blue', 3, 'Statement Builder', [3, 4]),
  sticker('Blue', 4, 'Operator Expert', [5]),
  sticker('Blue', 5, 'Logic Master', [6]),

  sticker('Purple', 1, 'Namespace Navigator', [1]),
  sticker('Purple', 2, 'For Loop Flyer', [2]),
  sticker('Purple', 3, 'Array Architect', [3, 4]),
  sticker('Purple', 4, 'Function Specialist', [5]),
  sticker('Purple', 5, 'Creative Coder', [6]),

  sticker('Brown', 1, 'Asset Adventurer', [1, 2]),
  sticker('Brown', 2, 'Image Inventor', [3, 4]),
  sticker('Brown', 3, 'Pixel Artist', [5, 6]),
  sticker('Brown', 4, 'Animation Architect', [7, 8]),
  sticker('Brown', 5, 'Experience Designer', [9, 10]),

  sticker('Red', 1, 'Mini Golf Maker', [1]),
  sticker('Red', 2, 'Tower Defense Tactician', [2]),
  sticker('Black', 1, 'Capstone Creator', [1]),
];

export const STICKER_BELTS = [...new Set(CREATE_STICKERS.map((item) => item.belt))];

export function stickersForBelt(belt) {
  return CREATE_STICKERS.filter((item) => item.belt === belt);
}

export function stickerRequirement({ belt, levels }) {
  if (levels.length === 1) return `Complete ${belt} Belt Level ${levels[0]}`;
  return `Complete ${belt} Belt Levels ${levels[0]}–${levels[levels.length - 1]}`;
}
