import { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { getAccent, buildAccentTokens, buildCustomTokens, isDefaultAccent, isCustomAccent } from '../lib/accents';

const ThemeContext = createContext(null);

const ACCENT_VARS = ['--ninja-bg', '--ninja-border', '--ninja-navy', '--ninja-muted', '--ninja-blue', '--ninja-blue-hover'];

// Write the accent CSS vars straight to <html>. Pure DOM — no React, no
// storage — so it's cheap enough to call on every drag frame.
function writeAccentVars(accent, dark) {
  const root = document.documentElement;
  if (isDefaultAccent(accent)) {
    ACCENT_VARS.forEach((v) => root.style.removeProperty(v));
    return;
  }
  const tokens = isCustomAccent(accent) ? buildCustomTokens(accent, dark) : buildAccentTokens(getAccent(accent), dark);
  for (const [k, v] of Object.entries(tokens)) root.style.setProperty(k, v);
}

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
    writeAccentVars(accent, dark);
    localStorage.setItem('dj-accent', isDefaultAccent(accent) ? 'default' : accent);
  }, [accent, dark]);

  // Live, throwaway accent application for dragging — paints the CSS vars
  // without touching React state or localStorage (no app-wide re-render).
  const previewAccent = useCallback((hex) => writeAccentVars(hex, dark), [dark]);

  const toggle = () => setDark((d) => !d);
  const setMode = (mode) => setDark(mode === 'dark');
  const setAccent = (id) => {
    if (isDefaultAccent(id)) return setAccentState('default');
    if (isCustomAccent(id)) return setAccentState(id);
    setAccentState(getAccent(id).id);
  };

  const settings = useMemo(
    () => ({ mode: dark ? 'dark' : 'light', accentColor: accent }),
    [dark, accent]
  );

  const value = useMemo(
    () => ({ dark, toggle, setMode, accent, setAccent, previewAccent, settings }),
    [dark, accent, settings, previewAccent]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
