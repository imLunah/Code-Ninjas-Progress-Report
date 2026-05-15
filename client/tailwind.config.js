export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ninja: {
          bg:           'rgb(var(--ninja-bg) / <alpha-value>)',
          border:       'rgb(var(--ninja-border) / <alpha-value>)',
          blue:         'rgb(var(--ninja-blue) / <alpha-value>)',
          'blue-hover': 'rgb(var(--ninja-blue-hover) / <alpha-value>)',
          navy:         'rgb(var(--ninja-navy) / <alpha-value>)',
          muted:        'rgb(var(--ninja-muted) / <alpha-value>)',
          red:          '#e51520',
        }
      },
      fontFamily: {
        ninja: ['"Nunito"', 'sans-serif'],
      }
    }
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.no-scrollbar': {
          '-ms-overflow-style': 'none',
          'scrollbar-width': 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        },
      });
    },
  ],
}
