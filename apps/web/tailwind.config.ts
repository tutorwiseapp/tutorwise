import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    // This 'extend' block is where we connect the VDL to Tailwind.
    extend: {
      // We are teaching Tailwind about our custom font variables from layout.tsx
      fontFamily: {
        primary: ['var(--font-primary)'],
        secondary: ['var(--font-secondary)'],
      },
      // We are teaching Tailwind about our custom color tokens from globals.css
      colors: {
        primary: 'var(--color-primary)',
        'primary-accent': 'var(--color-primary-accent)',
        'primary-light': 'var(--color-primary-light)',
        'text-primary': 'var(--color-text-primary)',
        'text-secondary': 'var(--color-text-secondary)',
        border: 'var(--color-border)',
        'bg-page': 'var(--color-bg-page)',
        'bg-card': 'var(--color-bg-card)',
        // ...and so on for all your VDL color tokens
      },
      // We do the same for spacing, border-radius, etc.
      spacing: {
        '1': 'var(--space-1)',
        '2': 'var(--space-2)',
        '3': 'var(--space-3)',
        '4': 'var(--space-4)',
        '5': 'var(--space-5)',
        '6': 'var(--space-6)',
      },
      borderRadius: {
        sm: 'var(--border-radius-sm)',
        md: 'var(--border-radius-md)',
        lg: 'var(--border-radius-lg)',
        full: 'var(--border-radius-full)',
      }
    },
  },
  plugins: [],
};
export default config;