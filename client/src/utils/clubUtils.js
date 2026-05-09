// Static fallback list — runtime list comes from GET /api/clubs/definitions
export const CLUBS = ['3D Design Club', 'Minecraft Club', 'Roblox Club'];

export const CLUB_SLUG_TO_NAME = {
  'minecraft':  'Minecraft Club',
  'roblox':     'Roblox Club',
  '3d-design':  '3D Design Club',
};

export const CLUB_NAME_TO_SLUG = {
  'Minecraft Club':  'minecraft',
  'Roblox Club':     'roblox',
  '3D Design Club':  '3d-design',
};

// Color sets keyed by color_key stored in club_definitions
export const COLOR_SETS = {
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', solid: '#7c3aed' },
  green:  { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-200',  solid: '#15803d' },
  red:    { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-200',    solid: '#b91c1c' },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-200',   solid: '#1d4ed8' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', solid: '#c2410c' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', solid: '#a16207' },
  teal:   { bg: 'bg-teal-100',   text: 'text-teal-700',   border: 'border-teal-200',   solid: '#0f766e' },
  pink:   { bg: 'bg-pink-100',   text: 'text-pink-700',   border: 'border-pink-200',   solid: '#be185d' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200', solid: '#4338ca' },
};

// Legacy map keyed by club name (for components not yet migrated to color_key)
export const CLUB_COLORS = {
  '3D Design Club': COLOR_SETS.purple,
  'Minecraft Club':  COLOR_SETS.green,
  'Roblox Club':     COLOR_SETS.red,
};

export const CLUB_DESCRIPTIONS = {
  '3D Design Club': 'Learn 3D modeling, design thinking, and creative spatial reasoning.',
  'Minecraft Club':  'Build, explore, and code in the world of Minecraft.',
  'Roblox Club':     'Design games and experiences in Roblox Studio.',
};

export function toSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function getClubColors(clubDef) {
  return COLOR_SETS[clubDef?.color_key] || COLOR_SETS.blue;
}
