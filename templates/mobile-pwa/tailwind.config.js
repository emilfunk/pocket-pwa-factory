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
        background: '#09090b',
        foreground: '#fafafa',
        card: '#18181b',
        'card-foreground': '#fafafa',
        primary: '#3b82f6',
        'primary-foreground': '#ffffff',
        muted: '#27272a',
        'muted-foreground': '#a1a1aa',
        border: '#27272a'
      }
    },
  },
  plugins: [],
}
