// tailwind.config.js
module.exports = {
    content: [
      "./src/**/*.{html,ts}",
    ],
    theme: {
      extend: {
        animation: {
        'spin-slow': 'spin 2s linear infinite',
      },
      },
    },
    plugins: [],
  }
  