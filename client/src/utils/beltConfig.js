export const BELTS = [
  { name: 'White', levels: 8, color: '#ffffff', textColor: '#000000' },
  { name: 'Yellow', levels: 10, color: '#fbbf24', textColor: '#000000' },
  { name: 'Orange', levels: 12, color: '#f97316', textColor: '#000000' },
  { name: 'Green', levels: 10, color: '#22c55e', textColor: '#000000' },
  { name: 'Blue', levels: 3, color: '#3b82f6', textColor: '#ffffff' },
  { name: 'Purple', levels: null, color: '#a855f7', textColor: '#ffffff' },
  { name: 'Brown', levels: null, color: '#92400e', textColor: '#ffffff' },
  { name: 'Red', levels: null, color: '#cc0000', textColor: '#ffffff' },
  { name: 'Black', levels: null, color: '#111111', textColor: '#ffffff' },
];

export const PROJECTS = ['Build 1', 'Build 2', 'Build 3', 'Solve 1', 'Solve 2', 'Solve 3', 'Adventure'];
export const STATUSES = ['Started', 'Working On', 'Completed'];
export const PROGRAMS = ['CREATE', 'Robotics Academy', 'AI Academy', 'JR'];

export function getBelt(name) {
  return BELTS.find(b => b.name === name);
}

export function getMaxLevel(beltName) {
  return getBelt(beltName)?.levels ?? null;
}
