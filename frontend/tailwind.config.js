module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#6366f1'
        }
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.04)',
      },
    },
  },
  plugins: [],
};
