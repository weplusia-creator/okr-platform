/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Neue Haas Grotesk', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Liria', 'Georgia', 'serif'],
      },
      colors: {
        // WAU Brand Colors
        wau: {
          green: '#D4FC59',
          blue: '#3100E2',
          black: '#231F1F',
          orange: '#FF4632',
          sand: '#FFFBE8',
        },
        // Primary - WAU Green (accent color)
        primary: {
          50: '#f9ffe6',
          100: '#f0ffc9',
          200: '#e2ff99',
          300: '#D4FC59', // WAU Green
          400: '#c5f03a',
          500: '#a8d91a',
          600: '#84ad10',
          700: '#648311',
          800: '#506813',
          900: '#445714',
          950: '#233006',
        },
        // Accent - WAU Blue (secondary)
        accent: {
          50: '#f0f0ff',
          100: '#e0e0ff',
          200: '#c4c0ff',
          300: '#9f94ff',
          400: '#7a5fff',
          500: '#5a2bff',
          600: '#3100E2', // WAU Blue
          700: '#2a00c4',
          800: '#2300a3',
          900: '#1e0085',
          950: '#120052',
        },
        // Success - green (same as primary for consistency)
        success: {
          50: '#f9ffe6',
          100: '#f0ffc9',
          200: '#e2ff99',
          300: '#D4FC59',
          400: '#c5f03a',
          500: '#a8d91a',
          600: '#84ad10',
          700: '#648311',
          800: '#506813',
          900: '#445714',
          950: '#233006',
        },
        // Warning - adjusted for WAU palette
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Danger - WAU Orange
        danger: {
          50: '#fff5f3',
          100: '#ffe8e4',
          200: '#ffd5ce',
          300: '#ffb5aa',
          400: '#ff8677',
          500: '#FF4632', // WAU Orange
          600: '#ed2f1a',
          700: '#c82312',
          800: '#a52112',
          900: '#882116',
          950: '#4b0c06',
        },
        // Sand background
        sand: {
          50: '#FFFBE8', // WAU Sand
          100: '#fff8d6',
          200: '#fff1ad',
          300: '#ffe97a',
          400: '#ffde47',
          500: '#ffd11a',
          600: '#e6b000',
          700: '#b38500',
          800: '#916800',
          900: '#785500',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'progress': 'progress 1s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        progress: {
          '0%': { width: '0%' },
          '100%': { width: 'var(--progress-width)' },
        },
      },
    },
  },
  plugins: [],
}
