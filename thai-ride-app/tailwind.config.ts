import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sarabun': ['Sarabun', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        'sans': ['Sarabun', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        // MUNEEF Primary Colors
        primary: {
          DEFAULT: '#00A86B',
          50: '#E8F5EF',
          100: '#D1EBDF',
          200: '#A3D7BF',
          300: '#75C39F',
          400: '#47AF7F',
          500: '#00A86B',
          600: '#008F5B',
          700: '#007A4D',
          800: '#00653F',
          900: '#005031',
        },
        // Enhanced Gray Scale
        gray: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#EBEBEB',
          300: '#D0D0D0',
          400: '#999999',
          500: '#666666',
          600: '#4A4A4A',
          700: '#333333',
          800: '#1A1A1A',
          900: '#0D0D0D',
        },
        // Status Colors
        success: {
          DEFAULT: '#00A86B',
          50: '#E8F5EF',
          100: '#D1EBDF',
          500: '#00A86B',
          600: '#008F5B',
        },
        warning: {
          DEFAULT: '#F5A623',
          50: '#FFF3E0',
          100: '#FFE0B2',
          500: '#F5A623',
          600: '#E65100',
        },
        error: {
          DEFAULT: '#E53935',
          50: '#FFEBEE',
          100: '#FFCDD2',
          500: '#E53935',
          600: '#D32F2F',
        },
        info: {
          DEFAULT: '#1565C0',
          50: '#E3F2FD',
          100: '#BBDEFB',
          500: '#1565C0',
          600: '#1976D2',
        }
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        '3xl': '32px',
      },
      boxShadow: {
        'primary': '0 4px 12px rgba(0, 168, 107, 0.3)',
        'card': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'elevated': '0 8px 24px rgba(0, 0, 0, 0.1)',
        'soft': '0 1px 3px rgba(0, 0, 0, 0.06)',
        'medium': '0 4px 12px rgba(0, 0, 0, 0.08)',
        'strong': '0 8px 24px rgba(0, 0, 0, 0.1)',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      minHeight: {
        'touch': '44px',
        'screen-safe': '100dvh',
      },
      minWidth: {
        'touch': '44px',
      },
      maxWidth: {
        'mobile': '30rem',
        'tablet': '48rem',
        'desktop': '80rem',
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'pulse-soft': 'pulse 3s ease-in-out infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
  // Optimize for production
  corePlugins: {
    // Disable unused features for smaller bundle
    preflight: true,
    container: false,
  },
} satisfies Config