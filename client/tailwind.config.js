export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ninja: {
          bg: '#f5f7fa',
          card: '#ffffff',
          border: '#e2e8f0',
          blue: '#006ADD',
          'blue-hover': '#0058b8',
          navy: '#1a2e4a',
          muted: '#506690',
          red: '#e51520',
        }
      },
      fontFamily: {
        ninja: ['"Nunito"', 'sans-serif'],
      }
    }
  },
  plugins: []
}
