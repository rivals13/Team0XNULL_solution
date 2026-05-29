/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:        '#1B6B3A',
        'primary-dark': '#144d2a',
        'primary-light':'#2a8a4f',
        accent:         '#2ECC71',
        'accent-dark':  '#27ae60',
      },
      boxShadow: {
        card: '0 2px 12px rgba(0,0,0,0.08)',
        nav:  '0 -2px 16px rgba(0,0,0,0.08)',
      },
      keyframes: {
        'slide-up': {
          '0%':   { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.3s cubic-bezier(0.32,0.72,0,1)',
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.no-scrollbar::-webkit-scrollbar': { display: 'none' },
        '.no-scrollbar': { '-ms-overflow-style': 'none', 'scrollbar-width': 'none' },
      });
    },
  ],
};
