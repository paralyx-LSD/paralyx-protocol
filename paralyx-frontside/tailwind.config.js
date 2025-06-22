/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'title': ['Unbounded', 'sans-serif'],
        'body': ['Inconsolata', 'monospace'],
      },
      colors: {
        // Paralyx Brand Colors
        'paralyx': {
          'bg-start': '#ffd6e6',
          'bg-end': '#dbadf1',
          'primary': '#FFB6C1',
          'accent': '#E6E6FA',
          'text': '#4B4242',
          'safe': '#22C55E', // Green with stroke effects
          'safe-light': '#4ADE80', // Light green
          'safe-dark': '#16A34A', // Dark green
          'warning': '#FFA07A',
        },
        // Extended color palette
        'glass': {
          'light': 'rgba(255, 255, 255, 0.1)',
          'medium': 'rgba(255, 255, 255, 0.2)',
          'dark': 'rgba(255, 255, 255, 0.05)',
        }
      },
      backgroundImage: {
        'paralyx-gradient': 'linear-gradient(135deg, #ffd6e6 0%, #dbadf1 100%)',
        'glass-gradient': 'linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
      },
      backdropBlur: {
        'xs': '2px',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(255, 182, 193, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(255, 182, 193, 0.8)' },
        }
      }
    },
  },
  plugins: [],
};