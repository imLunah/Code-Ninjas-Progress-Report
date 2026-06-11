import { useEffect, useRef, useState } from 'react';
import { isCustomAccent } from '../../lib/accents';

const clamp = (n, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, n));

// ── HSV <-> hex ─────────────────────────────────────────────────────────────
function hsvToHex(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const hex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}
function hexToHsv(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}

/**
 * Draggable hue/shade color map: a 2D saturation–value square with a movable
 * handle plus a hue slider. HSV is the single source of truth here — the hue
 * is never derived back from the emitted hex, so dragging to the grayscale
 * edges can't snap the hue. During a drag we only `onPreview` (cheap DOM paint)
 * and commit once via `onChange` on release, so the app doesn't re-render mid-drag.
 */
export default function ColorMap({ value, onChange, onPreview }) {
  const [hsv, setHsv] = useState(() => (isCustomAccent(value) ? hexToHsv(value) : { h: 213, s: 0.75, v: 0.96 }));
  const svRef = useRef(null);
  const hueRef = useRef(null);
  const ownHex = useRef(isCustomAccent(value) ? value.toLowerCase() : null);

  // Sync from an OUTSIDE change (preset swatch / default) — never from our own
  // commits (ownHex guards that), so the round-trip can't disturb the hue.
  useEffect(() => {
    if (!isCustomAccent(value)) return;
    if (value.toLowerCase() === ownHex.current) return;
    setHsv(hexToHsv(value));
    ownHex.current = value.toLowerCase();
  }, [value]);

  const apply = (next, commit) => {
    setHsv(next);
    const hex = hsvToHex(next.h, next.s, next.v);
    ownHex.current = hex.toLowerCase();
    if (commit) onChange(hex);
    else onPreview?.(hex);
  };

  const svFromPointer = (clientX, clientY) => {
    const r = svRef.current.getBoundingClientRect();
    apply({ ...hsv, s: clamp((clientX - r.left) / r.width), v: clamp(1 - (clientY - r.top) / r.height) }, false);
  };
  const hueFromPointer = (clientX) => {
    const r = hueRef.current.getBoundingClientRect();
    apply({ ...hsv, h: clamp((clientX - r.left) / r.width) * 360 }, false);
  };

  // Commit the current color to React state / storage on release.
  const commit = () => onChange(hsvToHex(hsv.h, hsv.s, hsv.v));

  const drag = (handler) => ({
    onPointerDown: (e) => { e.currentTarget.setPointerCapture(e.pointerId); handler(e); },
    onPointerMove: (e) => { if (e.buttons) handler(e); },
    onPointerUp: commit,
    onLostPointerCapture: commit,
  });

  const svKey = (e) => {
    const step = e.shiftKey ? 0.1 : 0.02;
    let { s, v } = hsv;
    if (e.key === 'ArrowRight') s = clamp(s + step);
    else if (e.key === 'ArrowLeft') s = clamp(s - step);
    else if (e.key === 'ArrowUp') v = clamp(v + step);
    else if (e.key === 'ArrowDown') v = clamp(v - step);
    else return;
    e.preventDefault();
    apply({ ...hsv, s, v }, true);
  };
  const hueKey = (e) => {
    const step = e.shiftKey ? 24 : 6;
    let h = hsv.h;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') h = (h + step) % 360;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') h = (h - step + 360) % 360;
    else return;
    e.preventDefault();
    apply({ ...hsv, h }, true);
  };

  const hueColor = hsvToHex(hsv.h, 1, 1);
  const current = hsvToHex(hsv.h, hsv.s, hsv.v);

  return (
    <div className="select-none">
      {/* SV square */}
      <div
        ref={svRef}
        role="application"
        aria-label="Saturation and brightness. Arrow keys to adjust."
        tabIndex={0}
        {...drag((e) => svFromPointer(e.clientX, e.clientY))}
        onKeyDown={svKey}
        className="relative w-full h-40 rounded-2xl overflow-hidden cursor-crosshair touch-none
                   border border-ninja-border outline-none focus-visible:ring-2 focus-visible:ring-ninja-blue/50"
        style={{ backgroundColor: hueColor }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, #fff, transparent)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, #000, transparent)' }} />
        <div
          className="absolute w-5 h-5 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: current }}
        />
      </div>

      {/* hue slider */}
      <div
        ref={hueRef}
        role="slider"
        aria-label="Hue"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        tabIndex={0}
        {...drag((e) => hueFromPointer(e.clientX))}
        onKeyDown={hueKey}
        className="relative h-4 mt-3 rounded-full cursor-pointer touch-none outline-none
                   focus-visible:ring-2 focus-visible:ring-ninja-blue/50"
        style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}
      >
        <div
          className="absolute top-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: hueColor }}
        />
      </div>
    </div>
  );
}
