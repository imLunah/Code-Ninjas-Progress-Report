import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAccent, DEFAULT_ACCENT } from '../lib/accents';

const ThemeContext = createContext(null);

function readNumber(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = parseFloat(raw);
    return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : fallback;
  } catch {
    return fallback;
  }
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('dj-theme');
      return saved === null ? true : saved === 'dark';
    } catch { return true; }
  });

  const [accent, setAccentState] = useState(() => {
    try { return getAccent(localStorage.getItem('dj-accent')).id; } catch { return DEFAULT_ACCENT; }
  });
  const [intensity, setIntensityState] = useState(() => readNumber('dj-intensity', 0.6));
  const [glow, setGlowState] = useState(() => readNumber('dj-glow', 0.45));

  // ── Mode (light/dark) ──────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('theme-transitioning');
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('dj-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('dj-theme', 'light');
    }
    const t = setTimeout(() => root.classList.remove('theme-transitioning'), 400);
    return () => clearTimeout(t);
  }, [dark]);

  // ── Accent → override --ninja-blue / --ninja-blue-hover globally ─────
  // Inline vars on <html> beat both :root and .dark rules, so a single set
  // works in either mode. Re-runs on mode change to pick the right shade.
  useEffect(() => {
    const root = document.documentElement;
    const a = getAccent(accent);
    root.style.setProperty('--ninja-blue', dark ? a.dark : a.light);
    root.style.setProperty('--ninja-blue-hover', dark ? a.hoverDark : a.hoverLight);
    localStorage.setItem('dj-accent', a.id);
  }, [accent, dark]);

  // ── Intensity + glow → global CSS vars ──────────────────────────────
  useEffect(() => {
    document.documentElement.style.setProperty('--theme-intensity', String(intensity));
    localStorage.setItem('dj-intensity', String(intensity));
  }, [intensity]);

  useEffect(() => {
    document.documentElement.style.setProperty('--theme-glow', String(glow));
    localStorage.setItem('dj-glow', String(glow));
  }, [glow]);

  const toggle = () => setDark((d) => !d);
  const setMode = (mode) => setDark(mode === 'dark');
  const setAccent = (id) => setAccentState(getAccent(id).id);
  const clamp01 = (n) => Math.min(1, Math.max(0, n));
  const setIntensity = (n) => setIntensityState(clamp01(n));
  const setGlow = (n) => setGlowState(clamp01(n));

  const settings = useMemo(
    () => ({ mode: dark ? 'dark' : 'light', accentColor: accent, intensity, glow }),
    [dark, accent, intensity, glow]
  );

  const value = useMemo(
    () => ({ dark, toggle, setMode, accent, setAccent, intensity, setIntensity, glow, setGlow, settings }),
    [dark, accent, intensity, glow, settings]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
