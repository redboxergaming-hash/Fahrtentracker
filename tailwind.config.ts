import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f8fafc',
          500: '#0ea5e9',
          700: '#0369a1',
          900: '#0f172a'
        }
      }
    }
  },
  plugins: []
} satisfies Config;
