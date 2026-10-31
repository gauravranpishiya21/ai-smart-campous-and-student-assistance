/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/index.html',
    './public/admin.html',
    './public/js/**/*.js'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#2A2A2A',
          50: '#404040',
          100: '#383838',
          200: '#303030',
          300: '#2A2A2A',
          400: '#242424',
          500: '#1F1F1F',
          600: '#1A1A1A',
          700: '#161616',
          800: '#121212',
          900: '#0E0E0E',
          950: '#0A0A0A'
        },
        silver: {
          DEFAULT: '#C0C0C0',
          50: '#FAFAFA',
          100: '#F5F5F7',
          200: '#E5E5E7',
          300: '#D1D1D6',
          400: '#C0C0C0',
          500: '#A6A6AA',
          600: '#8E8E93',
          700: '#636366',
          800: '#48484A',
          900: '#3A3A3C',
          950: '#242426'
        },
        signal: {
          DEFAULT: '#E10600',
          50: '#FFF0F0',
          100: '#FFE0DF',
          200: '#FFC4C2',
          300: '#FFA09C',
          400: '#FF5E57',
          500: '#E10600',
          600: '#C40400',
          700: '#9F0300',
          800: '#7E0200',
          900: '#5C0200',
          950: '#3B0100'
        }
      },
      boxShadow: {
        'signal': '0 4px 18px rgba(225, 6, 0, 0.38)',
        'signal-lg': '0 8px 28px rgba(225, 6, 0, 0.52)',
        'charcoal': '0 12px 32px rgba(0, 0, 0, 0.65)'
      }
    }
  },
  plugins: []
};
