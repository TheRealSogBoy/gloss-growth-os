/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'gloss-burgundy': '#8C2536',
        'gloss-pink': '#FDA4AF',
        'gloss-inverted': '#F2ECC2',
        'gloss-black': '#352925',
      },
      fontFamily: {
        zodiak: ['Zodiak', 'serif'],
        'jakarta': ['"Plus Jakarta Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
