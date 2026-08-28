// CREATE's decorative belt artwork becomes a collection of earned stickers.
//
// These are DojoLink milestones, not an official one-icon-per-level mapping:
// some belts ship fewer pieces of artwork than curriculum levels. In those
// cases one sticker celebrates a small run of related levels. Progress is
// derived from the enrollment and logs already loaded by the parent portal;
// there is no second achievement record to keep in sync.

// `blurb` is the sticker's own sentence: what the ninja actually did to earn
// it, in the past tense, read off the level's poster topic and quest rather
// than invented. It is what the zoomed sticker leads with, because "Complete
// Blue Belt Level 3" tells a parent when a sticker lands and nothing about
// what their kid can now do. Where one sticker covers a run of levels the
// sentence covers the run.
const sticker = (belt, number, title, levels, blurb) => ({
  id: `${belt.toLowerCase()}-${number}`,
  belt,
  title,
  levels,
  blurb,
  src: `/belt-stickers/${belt.toLowerCase()}-${number}.png`,
});

export const CREATE_STICKERS = [
  sticker('White', 1, 'First Coder', [1],
    'Built a first project from an empty screen: a background, a splash screen, a sprite that talks, and a sound to go with it.'),
  sticker('White', 2, 'Sequence Scout', [2],
    'Put sprites and dialog in the right order, so a lost and found story played out the way it was written.'),
  sticker('White', 3, 'Event Explorer', [3],
    'Wired the controller buttons to a sprite, kept it from wandering off screen, and stacked other sprites in front of and behind it.'),
  sticker('White', 4, 'Function Maker', [4],
    'Made things happen the moment two sprites touch, using functions and sprite kinds to tell a player, a goal, and an enemy apart.'),

  sticker('Yellow', 1, 'Variable Keeper', [1],
    'Kept score, lives, and a countdown in variables, and changed them as sprites collided.'),
  sticker('Yellow', 2, 'Loop Rider', [2],
    'Used loops to keep enemies coming, then gave sprites velocity and projectiles to fire back.'),
  sticker('Yellow', 3, 'Creative Logic', [3, 4],
    'Taught a project to decide for itself with conditionals, then dressed the result in animation and music.'),

  sticker('Orange', 1, 'Tilemap Trailblazer', [1],
    'Drew a custom tilemap and sent sprites around it, with each kind of sprite reacting differently.'),
  sticker('Orange', 2, 'Lifecycle Launcher', [2],
    'Used tilemap and lifecycle events so hazard tiles cost the player and powerup tiles bought more time.'),
  sticker('Orange', 3, 'Array Organizer', [3],
    'Stored a run of values in arrays and put what the player typed back on screen.'),
  sticker('Orange', 4, 'Loop Collector', [4],
    'Ran repeat and for-element-of loops to do the same thing to every item in an array.'),
  sticker('Orange', 5, 'Function Builder', [5],
    'Wrote functions with and without parameters, then reused them across a whole tilemap project.'),

  sticker('Green', 1, 'Platform Physicist', [1],
    'Built a 2D platformer with real physics behind the jump and loops driving the movement.'),
  sticker('Green', 2, 'Boolean Brain', [2],
    'Combined conditions with Boolean statements, so something only happened when several things were true at once.'),
  sticker('Green', 3, 'Nested Loop Ninja', [3],
    'Nested one loop inside another to place a whole field of sprites on a tilemap and control how many appeared.'),
  sticker('Green', 4, 'Tilemap Engineer', [4],
    'Switched tilemaps and the player\'s point of view mid-game using tilemap locations and extension code.'),
  sticker('Green', 5, 'Extension Expert', [5],
    'Added scrolling backgrounds and status bars, pulling in extensions written outside the project.'),

  sticker('Blue', 1, 'JavaScript Starter', [1],
    'Left the blocks behind and typed a project out in real JavaScript for the first time.'),
  sticker('Blue', 2, 'Property Pro', [2],
    'Set sprite properties by hand in code and left comments explaining how it works.'),
  sticker('Blue', 3, 'Statement Builder', [3, 4],
    'Wrote block statements, then nested conditionals inside events and loops.'),
  sticker('Blue', 4, 'Operator Expert', [5],
    'Used assignment and equality operators to track number and Boolean variables through a game.'),
  sticker('Blue', 5, 'Logic Master', [6],
    'Steered a project with Boolean AND and OR and relational operators, so one project could end several ways.'),

  sticker('Purple', 1, 'Namespace Navigator', [1],
    'Found the code behind the blocks: namespaces, new sprite kinds, and the events that belong to them.'),
  sticker('Purple', 2, 'For Loop Flyer', [2],
    'Wrote for loops in JavaScript to build a whole grid of sprites in one go.'),
  sticker('Purple', 3, 'Array Architect', [3, 4],
    'Kept several arrays of different kinds of data, then reached into nested arrays with array functions.'),
  sticker('Purple', 4, 'Function Specialist', [5],
    'Used functions to change levels and spawn sprites on demand.'),
  sticker('Purple', 5, 'Creative Coder', [6],
    'Closed out JavaScript with advanced animation, music, and extensions.'),

  sticker('Brown', 1, 'Asset Adventurer', [1, 2],
    'Took charge of a project\'s own assets and called them straight from code.'),
  sticker('Brown', 2, 'Image Inventor', [3, 4],
    'Controlled conditions with Boolean variables, then edited image assets to match what the code was doing.'),
  sticker('Brown', 3, 'Pixel Artist', [5, 6],
    'Drew original pixel art and packed it into a custom sprite pack for a game to use.'),
  sticker('Brown', 4, 'Animation Architect', [7, 8],
    'Animated sprites frame by frame and built a tilemap out of tiles drawn from scratch.'),
  sticker('Brown', 5, 'Experience Designer', [9, 10],
    'Designed everything around the game: splash screen, setup scene, and the flow between them.'),

  sticker('Red', 1, 'Mini Golf Maker', [1],
    'Built Mini Golf, a game carried across several weeks from first idea to finished thing.'),
  sticker('Red', 2, 'Tower Defense Tactician', [2],
    'Built Tower Defense, a game carried across several weeks from first idea to finished thing.'),
  sticker('Black', 1, 'Capstone Creator', [1],
    'Made an original capstone project using everything learned from White belt through Red.'),
];

export const STICKER_BELTS = [...new Set(CREATE_STICKERS.map((item) => item.belt))];

export function stickersForBelt(belt) {
  return CREATE_STICKERS.filter((item) => item.belt === belt);
}

export function stickerRequirement({ belt, levels }) {
  if (levels.length === 1) return `Complete ${belt} Belt Level ${levels[0]}`;
  return `Complete ${belt} Belt Levels ${levels[0]}–${levels[levels.length - 1]}`;
}
