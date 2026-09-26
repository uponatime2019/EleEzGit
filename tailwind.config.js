/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fluent: {
          bg: {
            light: '#f3f3f3',
            dark: '#202020',
            darker: '#181818'
          },
          card: {
            light: '#ffffff',
            dark: '#2d2d2d',
            hoverDark: '#383838',
            hoverLight: '#f5f5f5'
          },
          border: {
            light: '#e5e5e5',
            dark: '#3f3f3f'
          },
          accent: {
            DEFAULT: '#0078d4',
            hover: '#1084d8',
            active: '#006cc1',
            dark: '#60cdff'
          }
        }
      },
      fontFamily: {
        code: ['Cascadia Code', 'Consolas', 'JetBrains Mono', 'Fira Code', 'monospace']
      }
    },
  },
  plugins: [],
}
