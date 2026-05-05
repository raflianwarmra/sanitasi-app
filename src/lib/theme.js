import { useEffect, useState } from 'react';

function currentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

export function useTheme() {
  const [theme, setTheme] = useState(currentTheme);
  const [hasOverride, setHasOverride] = useState(() => {
    try { return !!localStorage.getItem('theme'); } catch { return false; }
  });

  // Follow system changes only when user hasn't set an override.
  useEffect(() => {
    if (hasOverride) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const next = mq.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      setTheme(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [hasOverride]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch {}
    setHasOverride(true);
    setTheme(next);
  };

  return { theme, toggle };
}
