import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('dj-theme') === 'dark'; }
    catch { return false; }
  });

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

  const toggle = () => setDark((d) => !d);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
