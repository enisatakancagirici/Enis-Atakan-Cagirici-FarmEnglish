/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        'ultra-dark': '#0C0C0F',
        'neon-purple': '#8B00FF',
        'neon-pink': '#FF2EC8',
        'neon-orange': '#FF8A00',
      },
    },
  },
  plugins: [],
}
