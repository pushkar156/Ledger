import React, { useEffect, useState } from 'react';

/**
 * ThemeToggle component toggles between light and dark modes.
 * It persists the selected theme in `localStorage` and updates the `class`
 * on the `html` element (Tailwind's dark mode works via the `dark` class).
 */
export const ThemeToggle: React.FC = () => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // Initialize from localStorage or system preference
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      // fallback to media query
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Apply theme class to html element whenever it changes
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
      className="p-2 rounded-full transition-colors duration-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none"
      aria-label="Toggle dark mode"
    >
      {isDark ? (
        // Moon icon (simple SVG)
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-yellow-300"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10 2a8 8 0 000 16 8 8 0 010-16z" />
        </svg>
      ) : (
        // Sun icon
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-yellow-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M10 5a1 1 0 011 1v1a1 1 0 11-2 0V6a1 1 0 011-1zm0 8a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zm5-3a1 1 0 010 2h-1a1 1 0 110-2h1zM6 10a1 1 0 010 2H5a1 1 0 110-2h1zm7.657-4.657a1 1 0 010 1.414L12.414 7a1 1 0 11-1.414-1.414l1.243-1.242a1 1 0 011.414 0zm-7.07 7.07a1 1 0 010 1.414L5.343 13a1 1 0 11-1.414-1.414l1.242-1.242a1 1 0 011.414 0zM10 3a1 1 0 011-1h0a1 1 0 110 2h0a1 1 0 01-1-1zM10 17a1 1 0 011-1h0a1 1 0 110 2h0a1 1 0 01-1-1z" />
        </svg>
      )}
    </button>
  );
};

export default ThemeToggle;
