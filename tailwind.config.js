/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ledgerBg: '#0F1B1E',
        ledgerSurface: '#16262A',
        ledgerElevated: '#1C2E32',
        ledgerBorder: 'rgba(234,242,240,0.08)',
        ledgerText: '#EAF2F0',
        ledgerMuted: '#8FA8A3',
        ledgerMint: '#7FE7C4',
        ledgerCoral: '#E8615A',
        // Category palette
        catAmber: '#E8A94C',
        catBlue: '#6FA8DC',
        catLavender: '#C792EA',
        catSand: '#F2D06B',
        catSage: '#6FD1A0',
        catGrey: '#9AA8A5',
        catMint: '#7FE7C4',
        catCoral: '#E8615A',
      },
      fontFamily: {
        sans: ['-apple-system', 'Segoe UI', 'Inter', 'sans-serif'],
        mono: ['ui-monospace', 'SF Mono', 'Roboto Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
