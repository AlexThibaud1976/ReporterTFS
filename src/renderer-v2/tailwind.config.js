/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        crust:    '#11111b',
        mantle:   '#181825',
        base:     '#1e1e2e',
        surface0: '#313244',
        surface1: '#45475a',
        surface2: '#585b70',
        overlay0: '#6c7086',
        overlay1: '#7f849c',
        overlay2: '#9399b2',
        subtext0: '#a6adc8',
        subtext1: '#bac2de',
        text:     '#cdd6f4',
        lavender: '#b4befe',
        blue:     '#89b4fa',
        sapphire: '#74c7ec',
        sky:      '#89dceb',
        teal:     '#94e2d5',
        green:    '#a6e3a1',
        yellow:   '#f9e2af',
        peach:    '#fab387',
        maroon:   '#eba0ac',
        red:      '#f38ba8',
        mauve:    '#cba6f7',
        pink:     '#f5c2e7',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: 'translateY(4px)' }, to: { opacity: 1, transform: 'none' } },
      },
    },
  },
  plugins: [],
}
