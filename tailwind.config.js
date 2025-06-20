/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary-dark': '#0d1f2d',
        'accent-gold': '#c5a95a',
        'soft-beige': '#e8d7bd',
        'muted-purple': '#e7a4e7',
        'light-neutral': '#f0ede4',
      },
    },
  },
  plugins: [],
} 