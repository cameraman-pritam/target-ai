/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          DEFAULT: '#FBF8EF',
          dark: '#F2EFE9',
          light: '#FFFDF9',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          muted: '#2B2B2B',
          faded: '#4A4A4A',
        },
        sepia: {
          border: '#D3CBBE',
          light: '#E6E0D4',
          dark: '#B0A798',
        },
        press: {
          red: '#A83232',
          'red-light': '#FDF2F2',
          green: '#2E6F40',
          'green-light': '#F0F7F2',
          gold: '#8C6D23',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'press': '3px 3px 0px 0px #1A1A1A',
        'press-lg': '5px 5px 0px 0px #1A1A1A',
        'press-sm': '2px 2px 0px 0px #1A1A1A',
        'press-red': '3px 3px 0px 0px #A83232',
        'press-green': '3px 3px 0px 0px #2E6F40',
      }
    },
  },
  plugins: [],
};
