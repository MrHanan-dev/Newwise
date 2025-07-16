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
        background: '#f5f7fa', // Light gray background
        foreground: '#1b2536', // Deep navy text
        card: {
          DEFAULT: '#e5eaf2', // Card background
          foreground: '#1b2536',
        },
        popover: {
          DEFAULT: '#fff',
          foreground: '#1b2536',
        },
        primary: {
          DEFAULT: '#0061ff', // Samsung blue
          foreground: '#fff',
        },
        secondary: {
          DEFAULT: '#f5f7fa', // Light gray
          foreground: '#1b2536',
        },
        accent: {
          DEFAULT: '#1b2536', // Deep navy
          foreground: '#fff',
        },
        border: '#d1d9e6', // Subtle border
        input: '#e5eaf2',
        ring: '#0061ff',
        glass: 'rgba(255,255,255,0.12)',
        glassDark: 'rgba(27,37,54,0.32)',
        chart: {
          '1': '#0061ff',
          '2': '#1b2536',
          '3': '#e5eaf2',
          '4': '#f5f7fa',
          '5': '#bfc9d9',
        },
        sidebar: {
          DEFAULT: '#1b2536',
          foreground: '#fff',
          primary: '#0061ff',
          'primary-foreground': '#fff',
          accent: '#e5eaf2',
          'accent-foreground': '#1b2536',
          border: '#23304a',
          ring: '#0061ff',
        },
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-glass': 'linear-gradient(120deg, rgba(59,232,255,0.25) 0%, rgba(162,89,247,0.18) 100%)',
        'gradient-glass-dark': 'linear-gradient(120deg, rgba(26,26,64,0.7) 0%, rgba(59,232,255,0.12) 100%)',
        'gradient-funky': 'linear-gradient(90deg, #3be8ff, #a259f7, #ff3be7, #d0ff3b, #ffd700, #00f7c7, #3be8ff)',
        'gradient-blue': 'linear-gradient(120deg, #0061ff 0%, #60aaff 100%)',
        'gradient-blue-dark': 'linear-gradient(120deg, #1b2536 0%, #23304a 100%)',
      },
      boxShadow: {
        'glow-blue': '0 0 16px 2px #3be8ff99',
        'glow-purple': '0 0 16px 2px #a259f799',
        'glow-pink': '0 0 16px 2px #ff3be799',
        'glow-gold': '0 0 16px 2px #ffd70099',
        'soft': '0 4px 24px 0 rgba(27,37,54,0.08)',
        'glass': '0 8px 32px 0 rgba(27,37,54,0.12)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
        // 🔽 Added custom keyframes for animated button
        speen: {
          '0%': { transform: 'rotate(10deg)' },
          '50%': { transform: 'rotate(190deg)' },
          '100%': { transform: 'rotate(370deg)' },
        },
        woah: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.75)' },
        },
        'glow': {
          '0%, 100%': { boxShadow: '0 0 16px 2px #3be8ff99' },
          '50%': { boxShadow: '0 0 32px 8px #a259f799' },
        },
        'bounce-funky': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-12px) scale(1.08)' },
        },
        'gradient-move': {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        // 🔽 Added custom animations for button
        speen: 'speen 8s cubic-bezier(0.56, 0.15, 0.28, 0.86) infinite',
        woah: 'woah 4s infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'bounce-funky': 'bounce-funky 1.8s infinite',
        'gradient-move': 'gradient-move 8s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
