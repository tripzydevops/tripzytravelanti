/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./contexts/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-bg': '#001F3F', // Deep Ocean Blue (Top)
        'brand-surface': '#003366', // Slightly lighter for cards/surfaces
        'brand-primary': '#D4AF37', // Soft Gold
        'brand-secondary': '#0074D9', // Azure Blue (Bottom)
        'brand-text-light': '#FFFFFF',
        'brand-text-muted': 'rgba(255, 255, 255, 0.7)',
        'gold': {
          400: '#FACC15',
          500: '#D4AF37', // Updated to match spec
          600: '#B8860B',
        },
      },
      fontFamily: {
        'heading': ['Outfit', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
        'serif': ['Playfair Display', 'serif'], // Or another premium serif
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'zoom': 'zoom 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        zoom: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
