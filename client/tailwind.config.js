/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0a0b',
        panel: '#131316',
        panelhover: '#1a1a1e',
        border: '#26262b',
        borderlight: '#323238',
        text: '#f2f2f3',
        muted: '#8b8b93',
        faint: '#5c5c64',
        green: {
          DEFAULT: '#3fb950',
          bg: 'rgba(63,185,80,0.12)',
        },
        red: {
          DEFAULT: '#f85149',
          bg: 'rgba(248,81,73,0.12)',
        },
        gray: {
          DEFAULT: '#8b8b93',
          bg: 'rgba(139,139,147,0.12)',
        },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '10px',
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
};
