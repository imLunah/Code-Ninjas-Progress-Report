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

export function getAccent(id) {
  return ACCENTS.find((a) => a.id === id) || ACCENTS.find((a) => a.id === DEFAULT_ACCENT);
}
