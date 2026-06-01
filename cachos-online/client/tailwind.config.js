/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          900: '#0c1f17',
          800: '#0f2a1e',
          700: '#143a2a',
          600: '#1b4d38',
        },
        amber: {
          glow: '#f4b840',
        },
        bone: '#f3ecdf',
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        body: ['"Outfit"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        cup: '0 18px 40px -12px rgba(0,0,0,0.55)',
        die: '0 4px 10px -2px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.6)',
      },
      keyframes: {
        roll: {
          '0%': { transform: 'rotate(0deg) scale(0.6)', opacity: '0' },
          '60%': { transform: 'rotate(380deg) scale(1.1)', opacity: '1' },
          '100%': { transform: 'rotate(360deg) scale(1)', opacity: '1' },
        },
        pop: {
          '0%': { transform: 'scale(0.85)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        roll: 'roll 0.5s ease-out',
        pop: 'pop 0.25s ease-out',
      },
    },
  },
  plugins: [],
};
