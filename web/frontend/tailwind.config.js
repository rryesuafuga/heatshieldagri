/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'heat-low': '#22c55e',
        'heat-moderate': '#eab308',
        'heat-high': '#f97316',
        'heat-very-high': '#ef4444',
        'heat-extreme': '#7c2d12',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
