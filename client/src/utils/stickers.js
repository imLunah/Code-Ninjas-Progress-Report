// Code.AI (Code.org) login sticker set. Images self-hosted in /public/stickers
// (200×200 PNGs). Names must match the students.codeorg_sticker DB CHECK list
// and CODEORG_STICKERS in server/routes/students.js.
export const CODEORG_STICKERS = [
  'alien', 'bat', 'bird', 'cat', 'dinosaur', 'dog', 'dragon', 'ghost', 'knight',
  'monster', 'ninja', 'ninja2', 'octopus', 'penguin', 'pirate', 'princess',
  'robot', 'spacebot', 'squirrel', 'unicorn', 'witch', 'wizard', 'zombie',
];

export function stickerUrl(name) {
  return CODEORG_STICKERS.includes(name) ? `/stickers/${name}.png` : null;
}

export function stickerLabel(name) {
  if (name === 'ninja2') return 'Ninja 2';
  return name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
}
