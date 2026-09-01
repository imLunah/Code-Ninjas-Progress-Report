// The parent portal's ninja art: nine belts, two poses, three skin tones.
//
// Files are built by `scripts/build-ninjas.mjs` from the franchise source and
// live in `client/public/ninjas` as `<belt>-<pose>-<tone>.png`. Tone names must
// match the `students.ninja_skin_tone` CHECK and NINJA_TONES in
// server/routes/students.js.

export const NINJA_TONES = ['light', 'medium', 'dark'];

// What a ninja with no tone set gets. It is the tone the app shipped when
// there was only one, so an untouched roster looks exactly as it did.
export const DEFAULT_TONE = 'medium';

export const NINJA_TONE_LABELS = {
  light: 'Light',
  medium: 'Medium',
  dark: 'Dark',
};

// Only the nine CREATE belts were ever drawn. A ninja past Black (the four
// Degrees belts) keeps the Black ninja rather than losing their art, and no
// enrolment at all gets White, which is where everyone starts.
const NINJA_BELTS = new Set(['White', 'Yellow', 'Orange', 'Green', 'Blue', 'Purple', 'Brown', 'Red', 'Black']);

export function ninjaBelt(belt) {
  if (NINJA_BELTS.has(belt)) return belt;
  return belt ? 'Black' : 'White';
}

export function ninjaTone(tone) {
  return NINJA_TONES.includes(tone) ? tone : DEFAULT_TONE;
}

export function ninjaSrc(belt, pose, tone) {
  return `/ninjas/${ninjaBelt(belt).toLowerCase()}-${pose}-${ninjaTone(tone)}.png`;
}
