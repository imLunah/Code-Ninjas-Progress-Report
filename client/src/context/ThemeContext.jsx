import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAccent, buildAccentTokens, isDefaultAccent } from '../lib/accents';

const ThemeContext = createContext(null);

const ACCENT_VARS = ['--ninja-bg', '--ninja-border', '--ninja-navy', '--ninja-muted', '--ninja-blue', '--ninja-blue-hover'];

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('dj-theme');
      return saved === null ? true : saved === 'dark';
    } catch { return true; }
  });

  // 'default' = original DojoLink theme (no accent tint). Otherwise an accent id.
  const [accent, setAccentState] = useState(() => {
    try { return localStorage.getItem('dj-accent') || 'default'; } catch { return 'default'; }
  });

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

  // ── Accent → retint the whole theme, or clear for Default ───────────
  // Inline vars on <html> beat both :root and .dark rules. For 'default' we
  // remove them so the stock index.css values rule again.
  useEffect(() => {
    const root = document.documentElement;
    if (isDefaultAccent(accent)) {
      ACCENT_VARS.forEach((v) => root.style.removeProperty(v));
      localStorage.setItem('dj-accent', 'default');
      return;
    }
    const tokens = buildAccentTokens(getAccent(accent), dark);
    for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
    localStorage.setItem('dj-accent', accent);
  }, [accent, dark]);

  const toggle = () => setDark((d) => !d);
  const setMode = (mode) => setDark(mode === 'dark');
  const setAccent = (id) => setAccentState(isDefaultAccent(id) ? 'default' : getAccent(id).id);

  const settings = useMemo(
    () => ({ mode: dark ? 'dark' : 'light', accentColor: accent }),
    [dark, accent]
  );

  const value = useMemo(
    () => ({ dark, toggle, setMode, accent, setAccent, settings }),
    [dark, accent, settings]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
