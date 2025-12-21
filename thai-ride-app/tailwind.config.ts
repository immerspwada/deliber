import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sarabun', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        // MUNEEF Style Colors
        primary: {
          DEFAULT: '#00A86B',
          50: '#E8F5EF',
          100: '#D1EBDF',
          200: '#A3D7BF',
          300: '#75C39F',
          400: '#47AF7F',
          500: '#00A86B',
          600: '#008F5B',
          700: '#00764B',
          800: '#005D3B',
          900: '#00442B',
        },
        gray: {
          50: '#F5F5F5',
          100: '#F0F0F0',
          200: '#E8E8E8',
          300: '#D1D1D1',
          400: '#B4B4B4',
          500: '#999999',
          600: '#666666',
          700: '#4D4D4D',
          800: '#333333',
          900: '#1A1A1A',
        },
        success: '#00A86B',
        warning: '#F5A623',
        error: '#E53935',
        'location-marker': '#E53935',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      zIndex: {
        '9999': '9999',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
} satisfies Config