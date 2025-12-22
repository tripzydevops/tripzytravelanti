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
    screens: {
      'xs': '350px',    // Custom: 2 cards on wider mobile phones
      'sm': '640px',    // Default Tailwind
      'md': '768px',    // Default Tailwind
      'lg': '1024px',   // Default Tailwind
      'xl': '1280px',   // Default Tailwind
      '2xl': '1400px',  // 5 cards on large desktops
    },
    extend: {
      colors: {
        'brand-bg': '#001F3F', // Original Deep Ocean
        'brand-dark': '#001529', // Darker Deep Ocean (Footer/Nav)
        'brand-surface': '#003366', // Original Surface
        'brand-primary': '#D4AF37', // Soft Gold
        'brand-secondary': '#0074D9', // Azure Blue
        'brand-text-light': '#FFFFFF',
        'brand-text-muted': 'rgba(255, 255, 255, 0.7)',
        'light-surface': '#F8FAFC',
        'light-bg': '#FFFFFF',
        'light-text-muted': '#64748B',
        'gold': {
          400: '#FACC15',
          500: '#D4AF37',
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
        'shimmer': 'shimmer 2s infinite',
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
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
}
