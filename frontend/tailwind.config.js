/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        canvas: {
          DEFAULT: '#f4f3f0',
        },
        surface: {
          card: '#ffffff',
          muted: '#faf9f7',
          inset: '#f0eeeb',
        },
        ink: {
          primary: '#1a1a1a',
          secondary: '#4a4a4a',
          muted: '#8a8a8a',
        },
        line: {
          DEFAULT: 'rgba(0,0,0,0.06)',
          strong: 'rgba(0,0,0,0.12)',
        },
        accent: {
          DEFAULT: '#4f46e5',
          hover: '#4338ca',
          soft: 'rgba(79, 70, 229, 0.08)',
        },
        live: {
          DEFAULT: '#ef4444',
          soft: 'rgba(239, 68, 68, 0.08)',
        },
      },
      boxShadow: {
        panel: '0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)',
        float: '0 12px 40px rgba(0,0,0,0.1)',
      },
      animation: {
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
