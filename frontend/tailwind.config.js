/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        fg: 'rgb(var(--fg) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-fg': 'rgb(var(--primary-fg) / <alpha-value>)',
        glass: 'rgb(var(--glass) / <alpha-value>)',
        'glass-border': 'rgb(var(--glass-border) / <alpha-value>)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        glass: '0 12px 40px rgb(0 0 0 / 0.22)',
      },
    },
  },
  plugins: [],
}

