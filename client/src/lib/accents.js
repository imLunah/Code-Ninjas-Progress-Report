// Accent palette for the Theme Customizer. Values are space-separated RGB
// channels (e.g. '168 85 247') so they drop straight into the --ninja-blue
// CSS variable, which Tailwind consumes as rgb(var(--ninja-blue) / <alpha>).
//
// Each accent carries a light + dark shade (dark is brighter so it reads on the
// deep slate background) and a matching hover shade. `Blue` mirrors the stock
// DojoLink defaults from index.css. `White` is intentionally a soft slate
// neutral — a literal white accent would make white-on-white buttons unreadable.

export const ACCENTS = [
  { id: 'white',  label: 'White',  swatch: '#e7ecf3', light: '100 116 139', dark: '148 163 184', hoverLight: '71 85 105',   hoverDark: '203 213 225' },
  { id: 'pink',   label: 'Pink',   swatch: '#ec4899', light: '219 39 119',  dark: '244 114 182', hoverLight: '190 24 93',   hoverDark: '236 72 153'  },
  { id: 'purple', label: 'Purple', swatch: '#a855f7', light: '147 51 234',  dark: '192 132 252', hoverLight: '126 34 206',  hoverDark: '168 85 247'  },
  { id: 'red',    label: 'Red',    swatch: '#ef4444', light: '220 38 38',   dark: '248 113 113', hoverLight: '185 28 28',   hoverDark: '239 68 68'   },
  { id: 'orange', label: 'Orange', swatch: '#f97316', light: '234 88 12',   dark: '251 146 60',  hoverLight: '194 65 12',   hoverDark: '249 115 22'  },
  { id: 'yellow', label: 'Yellow', swatch: '#eab308', light: '202 138 4',   dark: '250 204 21',  hoverLight: '161 98 7',    hoverDark: '234 179 8'   },
  { id: 'green',  label: 'Green',  swatch: '#22c55e', light: '22 163 74',   dark: '74 222 128',  hoverLight: '21 128 61',   hoverDark: '34 197 94'   },
  { id: 'blue',   label: 'Blue',   swatch: '#3b82f6', light: '0 106 221',   dark: '56 161 255',  hoverLight: '0 88 184',    hoverDark: '28 138 255'  },
  { id: 'indigo', label: 'Indigo', swatch: '#6366f1', light: '79 70 229',   dark: '129 140 248', hoverLight: '67 56 202',   hoverDark: '99 102 241'  },
];

export const DEFAULT_ACCENT = 'blue';

// A small, clean set of preset accents the user taps directly. Fine-tuning is
// done in the color map above; these are just quick picks.
export const SWATCH_GRID = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
];

// The "Default" choice — restores the original DojoLink light/dark theme with
// no accent tinting (ThemeContext clears the inline CSS vars when selected).
export const DEFAULT_OPTION = { id: 'default', label: 'Default', swatch: '#64748b' };

export function isDefaultAccent(id) {
  return !id || id === 'default';
}

export function getAccent(id) {
  return ACCENTS.find((a) => a.id === id) || ACCENTS.find((a) => a.id === DEFAULT_ACCENT);
}

// ── Accent tokens ───────────────────────────────────────────────────────────
// An accent only swaps the brand color (--ninja-blue / -hover) — exactly like
// the stock blue. Neutral surfaces stay slate; we never tint the background.

const rgbStr = (arr) => arr.join(' ');
// mix(a, b, t): t = how much of `a` to blend with `b`.
const mix = (a, b, t) => a.map((v, i) => Math.round(v * t + b[i] * (1 - t)));

/**
 * Build the full CSS-variable token set for an accent in a given mode.
 * Returns space-separated RGB strings ready for style.setProperty.
 */
// Accent only swaps the brand color tokens — same logic as the default blue:
// the dark slate background / borders / text stay neutral, just like the stock
// theme. We do NOT tint the neutral surfaces (that looked muddy).
// ── Readable accent ink ─────────────────────────────────────────────────────
// Accent text on an accent tint (the active nav item, the selected reaction)
// is the one place the brand color has to carry meaning at 14px or smaller, and
// the stock blue lands at 4.44:1 light / 4.35:1 dark — just under WCAG AA. A
// fixed replacement hex would only fix blue: the accent is any hue the user
// picks, and yellow on a yellow tint is far worse. So the ink is solved for.

const relLum = (c) => {
  const s = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
};
const contrast = (a, b) => {
  const [l1, l2] = [relLum(a), relLum(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

// The surface under the tint: white in light, the dark card in dark.
const SURFACE = { light: [255, 255, 255], dark: [37, 44, 62] };
const TINT_ALPHA = 0.1;

/**
 * Darken (light mode) or lighten (dark mode) the accent until it clears 4.5:1
 * against its own 10% tint. Returns the accent untouched when it already does.
 */
export function accentInk(rgb, dark) {
  const surface = dark ? SURFACE.dark : SURFACE.light;
  const pill = mix(rgb, surface, TINT_ALPHA);
  const toward = dark ? [255, 255, 255] : [0, 0, 0];
  let ink = rgb;
  for (let step = 0; step <= 20 && contrast(ink, pill) < 4.5; step++) {
    ink = mix(rgb, toward, 1 - step * 0.05);
  }
  return ink;
}

export function buildAccentTokens(accent, dark) {
  const a = getAccent(accent.id ? accent.id : accent);
  const base = (dark ? a.dark : a.light).split(' ').map(Number);
  return {
    '--ninja-blue':       dark ? a.dark : a.light,
    '--ninja-blue-hover': dark ? a.hoverDark : a.hoverLight,
    '--ninja-blue-ink':   rgbStr(accentInk(base, dark)),
  };
}

// ── Custom (any-hue) accents ────────────────────────────────────────────────
const HEX = /^#([0-9a-fA-F]{6})$/;
export function isCustomAccent(id) {
  return typeof id === 'string' && HEX.test(id);
}
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Accent tokens for an arbitrary hex: use it directly in light mode, brighten
 *  it for dark mode so it stays legible on the deep slate background. */
export function buildCustomTokens(hex, dark) {
  const picked = hexToRgb(hex);
  const base = dark ? mix(picked, [255, 255, 255], 0.72) : picked; // 28% toward white in dark
  const hover = dark ? mix(base, [0, 0, 0], 0.88) : mix(base, [0, 0, 0], 0.85);
  return {
    '--ninja-blue':       rgbStr(base),
    '--ninja-blue-hover': rgbStr(hover),
    '--ninja-blue-ink':   rgbStr(accentInk(base, dark)),
  };
}

/** Swatch color to display for any accent value (default / preset / custom). */
export function swatchFor(id) {
  if (isDefaultAccent(id)) return DEFAULT_OPTION.swatch;
  if (isCustomAccent(id)) return id;
  return getAccent(id).swatch;
}

/** Human label for any accent value. */
export function labelFor(id) {
  if (isDefaultAccent(id)) return DEFAULT_OPTION.label;
  if (isCustomAccent(id)) return 'Custom';
  return getAccent(id).label;
}
