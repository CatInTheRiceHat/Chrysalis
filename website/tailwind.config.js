/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        heading: ["'Story Script'", "serif"],
        body: ["'Barlow'", "sans-serif"],
      },
      colors: {
        background:        'hsl(0 0% 98%)',
        foreground:        'hsl(220 15% 12%)',
        card:              'hsl(0 0% 100%)',
        'card-foreground': 'hsl(220 15% 12%)',
        primary:           'hsl(265 50% 60%)',
        'primary-foreground': 'hsl(0 0% 100%)',
        secondary:         'hsl(280 40% 75%)',
        'secondary-foreground': 'hsl(220 15% 12%)',
        muted:             'hsl(220 10% 94%)',
        'muted-foreground':'hsl(220 10% 45%)',
        accent:            'hsl(185 60% 75%)',
        'accent-foreground':'hsl(220 15% 12%)',
        border:            'hsl(220 10% 88%)',
        input:             'hsl(220 10% 94%)',
        ring:              'hsl(265 50% 60%)',
      },
      borderRadius: {
        'full': '9999px',
      },
      animation: {
        'float':       'float 6s ease-in-out infinite',
        'shimmer':     'shimmer 5s ease infinite',
        'mesh-shift':  'meshShift 12s ease-in-out infinite alternate',
        'count-up':    'countUp 1s ease-out forwards',
        'fade-up':     'fadeUp 0.7s ease-out forwards',
        'pulse-soft':  'pulseSoft 3s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-12px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        meshShift: {
          '0%':   { backgroundSize: '100% 100%, 100% 100%, 100% 100%, 100% 100%' },
          '100%': { backgroundSize: '110% 110%, 105% 108%, 108% 105%, 112% 110%' },
        },
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.6' },
          '50%':      { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
