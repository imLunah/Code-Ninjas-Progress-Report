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

// In-panel color palette — a spread of hues × shades the user taps directly
// (no native OS picker). Each value is a hex stored straight as the accent.
export const SWATCH_GRID = [
  '#64748b', '#6b7280', '#ef4444', '#dc2626', '#f97316', '#ea580c', '#f59e0b', '#eab308',
  '#84cc16', '#22c55e', '#16a34a', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6',
  '#2563eb', '#6366f1', '#4f46e5', '#8b5cf6', '#a855f7', '#9333ea', '#d946ef', '#ec4899',
  '#db2777', '#f43f5e',
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

// ── Theme tinting ──────────────────────────────────────────────────────────
// An accent doesn't just recolor buttons — it retints the whole UI. We blend a
// small amount of the accent hue into the neutral surface/text tokens so the
// entire app shifts toward the chosen color while staying legible.

const parse = (s) => s.split(' ').map(Number);
const rgbStr = (arr) => arr.join(' ');
// mix(accent, neutral, t): t = how much accent to blend into the neutral.
const mix = (a, b, t) => a.map((v, i) => Math.round(v * t + b[i] * (1 - t)));

// Stock DojoLink neutrals (from index.css) used as the blend base per mode.
const NEUTRAL = {
  dark:  { bg: [28, 33, 50],   border: [44, 55, 82],   navy: [208, 218, 234], muted: [138, 155, 184] },
  light: { bg: [245, 247, 250], border: [226, 232, 240], navy: [26, 46, 74],   muted: [80, 102, 144] },
};

// Accent blend strengths — subtle on big surfaces, stronger on borders/muted.
const BLEND = { bg: 0.08, border: 0.22, navy: 0.10, muted: 0.24 };

/**
 * Build the full CSS-variable token set for an accent in a given mode.
 * Returns space-separated RGB strings ready for style.setProperty.
 */
// Build tokens from an accent's pre-tuned shades (presets) OR from a raw base.
function tokensFrom(base, hover, dark) {
  const n = dark ? NEUTRAL.dark : NEUTRAL.light;
  return {
    '--ninja-bg':         rgbStr(mix(base, n.bg, BLEND.bg)),
    '--ninja-border':     rgbStr(mix(base, n.border, BLEND.border)),
    '--ninja-navy':       rgbStr(mix(base, n.navy, BLEND.navy)),
    '--ninja-muted':      rgbStr(mix(base, n.muted, BLEND.muted)),
    '--ninja-blue':       rgbStr(base),
    '--ninja-blue-hover': rgbStr(hover),
  };
}

export function buildAccentTokens(accent, dark) {
  const a = getAccent(accent.id ? accent.id : accent);
  return tokensFrom(parse(dark ? a.dark : a.light), parse(dark ? a.hoverDark : a.hoverLight), dark);
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

/** Tokens for an arbitrary hex color: use it directly in light mode, brighten
 *  it for dark mode so it stays legible on the deep slate background. */
export function buildCustomTokens(hex, dark) {
  const picked = hexToRgb(hex);
  const base = dark ? mix(picked, [255, 255, 255], 0.72) : picked; // 28% toward white in dark
  const hover = dark ? mix(base, [0, 0, 0], 0.88) : mix(base, [0, 0, 0], 0.85);
  return tokensFrom(base, hover, dark);
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
