// One definition of the app's card surfaces.
//
// This class string was pasted inline in ~56 places and four components kept
// their own `const CARD` copy, which had already drifted: the sticky-note board
// was missing the dark ring and shadow and so sat visibly flatter than the
// cards beside it. Classes rather than a component, because most call sites
// need the surface on a motion.div, a form, a section or an anchor.
//
// The dark lift is deliberate. `ring-1 ring-transparent` is invisible in light
// mode and costs nothing; in dark mode the ring and shadow give cards enough
// separation from the deep-slate page that they stop reading as flat panels.
// The light-mode shadow is invisible on a dark background, hence the explicit
// dark variant.
export const CARD =
  'bg-white border border-ninja-border rounded-2xl shadow-sm ' +
  'dark:shadow-[0_10px_34px_rgb(0_0_0/0.32)] ring-1 ring-transparent dark:ring-white/[0.05]';

// Tighter radius, no lift. For surfaces nested inside a CARD, and for the
// denser list/form panels that predate the 2xl card.
export const PANEL = 'bg-white border border-ninja-border rounded-xl shadow-sm';
