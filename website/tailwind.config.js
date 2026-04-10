/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Instrument Serif'", "serif"],
        body: ["'Barlow'", "sans-serif"],
      },
      colors: {
        background: 'hsl(213 45% 67%)',
        foreground: 'hsl(0 0% 100%)',
        card: 'hsl(213 45% 62%)',
        'card-foreground': 'hsl(0 0% 100%)',
        primary: 'hsl(0 0% 100%)',
        'primary-foreground': 'hsl(213 45% 67%)',
        secondary: 'hsl(213 45% 72%)',
        'secondary-foreground': 'hsl(0 0% 100%)',
        muted: 'hsl(213 35% 60%)',
        'muted-foreground': 'hsl(0 0% 100% / 0.7)',
        accent: 'hsl(213 45% 72%)',
        'accent-foreground': 'hsl(0 0% 100%)',
        destructive: 'hsl(0 84.2% 60.2%)',
        border: 'hsl(0 0% 100% / 0.2)',
        input: 'hsl(0 0% 100% / 0.2)',
        ring: 'hsl(0 0% 100% / 0.3)',
      },
      borderRadius: {
        'full': '9999px',
      },
    },
  },
  plugins: [],
}
