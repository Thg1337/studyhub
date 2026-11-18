/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: {
          950: '#06070d',
          900: '#0a0c16',
          800: '#101220',
          700: '#171a2e'
        },
        neon: {
          cyan: '#6fffe9',
          violet: '#a78bfa',
          pink: '#ff7ad9',
          lime: '#b6ff3c'
        }
      },
      boxShadow: {
        glow: '0 0 60px -10px rgba(111,255,233,0.45)',
        glowv: '0 0 60px -10px rgba(167,139,250,0.45)'
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite'
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-18px)' }
        }
      }
    }
  },
  plugins: []
}