import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './themeContext';

export function ThemeProvider({ children }) {
  const [preference, setPreference] = useState(() => {
    const saved = localStorage.getItem('syncboard-theme')
      || (localStorage.getItem('ts-theme') === 'light' || localStorage.getItem('ts-theme') === 'dark' ? localStorage.getItem('ts-theme') : null);
    return ['system', 'light', 'dark'].includes(saved) ? saved : 'system';
  });
  const [systemTheme, setSystemTheme] = useState(() => (
    window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  ));
  const theme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    localStorage.setItem('syncboard-theme', preference);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
  }, [preference, theme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e) => {
      setSystemTheme(e.matches ? 'light' : 'dark');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggle = useCallback(() => setPreference(theme === 'dark' ? 'light' : 'dark'), [theme]);
  const value = useMemo(() => ({
    theme,
    preference,
    setTheme: setPreference,
    toggle
  }), [preference, theme, toggle]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}
