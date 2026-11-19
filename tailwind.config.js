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
          950: '#08090a',
          900: '#0c0e0f',
          800: '#121415',
          700: '#1a1d1e'
        },
        neon: {
          cyan: '#d4f558',
          violet: '#f2f0e9',
          pink: '#ff9e64',
          lime: '#b6f36a'
        }
      },
      boxShadow: {
        glow: '0 10px 40px -18px rgba(212,245,88,0.55)',
        glowv: '0 18px 50px -30px rgba(0,0,0,0.9)'
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