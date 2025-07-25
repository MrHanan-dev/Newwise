import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        body: ['PT Sans', 'sans-serif'],
        headline: ['PT Sans', 'sans-serif'],
        code: ['monospace'],
      },
      colors: {
        // Core Colours
        core: {
          bright: '#00B6F0', // Bright Blue
          corporate: '#0056A6', // Corporate Blue
          mid: '#0077C8', // Mid Blue
          white: '#FFFFFF',
        },
        // Secondary Colours
        secondary: {
          pink: '#F96EB6',
          green: '#8CD211',
          orange: '#FF8200',
          yellow: '#FFD100',
          red: '#E4002B',
          purple: '#C1A7E2',
        },
        // Neutral Colours
        neutral: {
          black: '#000000',
          dark: '#333333',
          medium: '#666666',
          light: '#CCCCCC',
          verylight: '#F5F5F5',
          white: '#FFFFFF',
        },
        // For backgrounds, cards, popovers, etc.
        background: '#F5F5F5',
        foreground: '#1b2536',
        card: {
          DEFAULT: '#FFFFFF',
          foreground: '#1b2536',
        },
        popover: {
          DEFAULT: '#FFFFFF',
          foreground: '#1b2536',
        },
        border: '#CCCCCC',
        input: '#FFFFFF',
        ring: '#00B6F0',
      },
      backgroundImage: {},
      boxShadow: {},
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
      },
      keyframes: {},
      animation: {},
    },
  },
  plugins: [],
} satisfies Config;
