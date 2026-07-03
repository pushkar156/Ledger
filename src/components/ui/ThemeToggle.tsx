import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * ThemeToggle component toggles between light and dark modes.
 * By default, it initializes from the system/device theme preferences if not set in localStorage.
 * Styled with sleek outline elements.
 */
export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      
      // Default fallback: Check device system preferences
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Listen to system changes if no manual user selection has been saved yet
  useEffect(() => {
    if (localStorage.getItem('theme')) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };

    mediaQuery.addEventListener('change', handleSystemChange);
    return () => mediaQuery.removeEventListener('change', handleSystemChange);
  }, []);

  // Apply theme class to html root
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const toggle = () => setIsDark((prev) => !prev);

  return (
    <button
      onClick={toggle}
      className="p-2.5 rounded-xl border border-ledgerBorder bg-ledgerElevated text-ledgerMuted hover:text-ledgerMint transition-all duration-300 focus:outline-none flex items-center justify-center shadow-sm"
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        <Sun className="h-4.5 w-4.5 text-amber-400 animate-spin-slow" />
      ) : (
        <Moon className="h-4.5 w-4.5 text-indigo-500" />
      )}
    </button>
  );
};

export default ThemeToggle;
