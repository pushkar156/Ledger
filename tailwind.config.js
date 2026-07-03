/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ledgerBg: 'var(--color-ledgerBg)',
        ledgerSurface: 'var(--color-ledgerSurface)',
        ledgerElevated: 'var(--color-ledgerElevated)',
        ledgerBorder: 'var(--color-ledgerBorder)',
        ledgerText: 'var(--color-ledgerText)',
        ledgerMuted: 'var(--color-ledgerMuted)',
        ledgerMint: 'var(--color-ledgerMint)',
        ledgerGreen: 'var(--color-ledgerGreen)',
        ledgerCoral: 'var(--color-ledgerCoral)',
        // Category palette
        catAmber: 'var(--color-catAmber)',
        catBlue: 'var(--color-catBlue)',
        catLavender: 'var(--color-catLavender)',
        catSand: 'var(--color-catSand)',
        catSage: 'var(--color-catSage)',
        catGrey: 'var(--color-catGrey)',
        catMint: 'var(--color-catMint)',
        catCoral: 'var(--color-catCoral)',
      },
      fontFamily: {
        sans: ['-apple-system', 'Segoe UI', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
