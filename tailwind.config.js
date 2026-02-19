/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#2563eb',
        },
      },
      screens: {
        'xs': '320px',
      },
      animation: {
        'shake': 'shake 0.4s ease-in-out',
        'fade-in': 'fadeIn 0.5s ease-out both',
        'fade-in-up': 'fadeInUp 0.5s ease-out both',
        'slide-down': 'slideDown 0.2s ease-out both',
        'spin-once': 'spinOnce 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
