export const BELTS = [
  { name: 'White', levels: 8, color: '#ffffff', textColor: '#000000' },
  { name: 'Yellow', levels: 10, color: '#fbbf24', textColor: '#000000' },
  { name: 'Orange', levels: 12, color: '#f97316', textColor: '#000000' },
  { name: 'Green', levels: 10, color: '#22c55e', textColor: '#000000' },
  { name: 'Blue', levels: 3, color: '#3b82f6', textColor: '#ffffff' },
  { name: 'Purple', levels: 11, color: '#a855f7', textColor: '#ffffff' },
  { name: 'Brown', levels: 17, color: '#92400e', textColor: '#ffffff' },
  { name: 'Red', levels: 4, color: '#cc0000', textColor: '#ffffff' },
  { name: 'Black', levels: null, color: '#111111', textColor: '#ffffff' },
];

export const PROJECTS = ['Build 1', 'Build 2', 'Build 3', 'Build 4', 'Build 5', 'Solve 1', 'Solve 2', 'Solve 3', 'Solve 4', 'Solve 5', 'Adventure'];
export const STATUSES = ['Started', 'Working On', 'Completed'];
export const PROGRAMS = ['CREATE', 'Robotics Academy', 'AI Academy', 'JR'];

// Project names for Purple+ belts — each level has the main project + optional Prove Yourself variant.
// Keyed by belt name → level number → array of project options.
export const BELT_LEVEL_PROJECTS = {
  Purple: {
    1:  ['Dropping Bombs', 'Prove Yourself - Color Drop'],
    2:  ['Scavenger Hunt', 'Prove Yourself - Particle Hunt'],
    3:  ['Meany Bird', 'Prove Yourself - Meaner Bird'],
    4:  ['Sketch Head', 'Prove Yourself - TrickHead'],
    5:  ["Don't Touch the Cubes", "Prove Yourself - Don't Touch the Chopsticks"],
    6:  ['SuperShapes', 'Prove Yourself - Super Duper Shapes'],
    7:  ['Poly Run', 'Prove Yourself - Poly Run v2'],
    8:  ['Dropping Bombs Part 2'],
    9:  ['Dropping Bombs Part 3'],
    10: ['Dropping Bombs Part 4'],
    11: ['Dropping Bombs Part 5'],
  },
  Brown: {
    1:  ['Robomania', 'Prove Yourself - Robomania'],
    2:  ['Find the Exit', 'Prove Yourself - Find the Exit'],
    3:  ['Cloud Hop', 'Prove Yourself - Cloud Hop'],
    4:  ['Jungle Escape', 'Prove Yourself - Jungle Escape'],
    5:  ['Ninja Run', 'Prove Yourself - Ninja Run'],
    6:  ['Evil Fortress of Doctor Worm', 'Prove Yourself - Evil Fortress of Dr. Worm'],
    7:  ['CyberFu Part 1', 'Prove Yourself - CyberFu Part 1'],
    8:  ['Shape Jam', 'Prove Yourself - Shape Jam'],
    9:  ['Labyrinth', 'Prove Yourself - Labyrinth'],
    10: ['CyberFu Part 2', 'Prove Yourself - CyberFu Part 2'],
    11: ['Amazing Ninja Worlds Part 1', 'Prove Yourself - Amazing Ninja Worlds Pt 1'],
    12: ['World of Color', 'Prove Yourself - World of Color'],
    13: ['Amazing Ninja Worlds Part 2', 'Prove Yourself - Amazing Ninja Worlds Pt 2'],
    14: ['Amazing Ninja Worlds Part 3', 'Prove Yourself - Amazing Ninja Worlds Pt 3'],
    15: ['Scavenger Hunt Deluxe', 'Prove Yourself - Scavenger Hunt Deluxe'],
    16: ['Food Frenzy Part 1'],
    17: ['Food Frenzy Part 2'],
  },
  Red: {
    1: ['Gravity Trails'],
    2: ['Codey Raceway'],
    3: ['Sulky Slimes'],
    4: ['Chef Codey'],
  },
};

export function getBelt(name) {
  return BELTS.find(b => b.name === name);
}

export function getMaxLevel(beltName) {
  return getBelt(beltName)?.levels ?? null;
}

export function getLevelProjects(beltName, sublevel) {
  if (!beltName || !sublevel) return null;
  return BELT_LEVEL_PROJECTS[beltName]?.[parseInt(sublevel)] ?? null;
}
