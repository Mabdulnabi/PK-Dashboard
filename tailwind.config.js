/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,ts,jsx,tsx}','./components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT:'#EF4444', dark:'#DC2626', light:'#FEE2E2' },
        sidebar: { bg:'#111827', border:'#1F2937', item:'#9CA3AF', active:'#1F2937' },
      },
      fontFamily: { sans: ['Inter','system-ui','sans-serif'] },
    }
  },
  plugins: [],
}
