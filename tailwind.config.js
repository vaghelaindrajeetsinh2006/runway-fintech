/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: { glow: '0 12px 50px rgba(113, 86, 255, 0.18)' },
      keyframes: {
        'soft-pulse': { '0%, 100%': { opacity: '1' }, '50%': { opacity: '.72' } },
      },
      animation: { 'soft-pulse': 'soft-pulse 2.4s ease-in-out infinite' },
    },
  },
  plugins: [],
};
