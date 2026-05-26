/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#EBF2FB',
          100: '#D0E2F6',
          200: '#A3C6EE',
          300: '#6EA2E0',
          400: '#4484CC',
          500: '#2869B4',   // Five Star blue — matches logo
          600: '#1E4F8C',
          700: '#163A68',
          800: '#0E2645',
          900: '#071322',
        },
        bridge: {
          50:  '#F5F3F2',
          100: '#EAE7E5',
          200: '#D4CECC',
          300: '#B8B0AC',
          400: '#968D89',
          500: '#706560',   // Bridge/PACKAGING gray — matches logo
          600: '#584E4A',
          700: '#413A37',
          800: '#2B2724',
          900: '#161312',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(40,105,180,0.12), 0 1px 3px rgba(0,0,0,0.06)',
        lift: '0 8px 24px rgba(40,105,180,0.16)',
      }
    },
  },
  plugins: [],
};
