/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Anton', 'Arial Narrow', 'sans-serif'],
        sans: ['Space Grotesk', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      colors: {
        pink: {
          DEFAULT: 'var(--pink)',
          dim: 'var(--pink-dim)',
          glow: 'var(--pink-glow)',
        },
        orange: {
          DEFAULT: 'var(--orange)',
          dim: 'var(--orange-dim)',
        },
        green: {
          DEFAULT: 'var(--green)',
          dim: 'var(--green-dim)',
        },
        cyan: {
          DEFAULT: 'var(--cyan)',
          dim: 'var(--cyan-dim)',
        },
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
          hover: 'var(--surface-hover)',
        },
      },
    },
  },
  plugins: [],
};
