import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand palette — Dark Green, Gold, White, Black.
        // These map to CSS variables so the CMS can override them at runtime.
        brand: {
          green: "rgb(var(--color-primary) / <alpha-value>)",
          gold: "rgb(var(--color-secondary) / <alpha-value>)",
          accent: "rgb(var(--color-accent) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          light: "rgb(var(--color-primary-light) / <alpha-value>)",
          dark: "rgb(var(--color-primary-dark) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--color-secondary) / <alpha-value>)",
          light: "rgb(var(--color-secondary-light) / <alpha-value>)",
          dark: "rgb(var(--color-secondary-dark) / <alpha-value>)",
        },
        accent: "rgb(var(--color-accent) / <alpha-value>)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      boxShadow: {
        glow: "0 0 40px -10px rgb(var(--color-secondary) / 0.4)",
        card: "0 8px 32px -8px rgb(0 0 0 / 0.25)",
      },
      backdropBlur: {
        xs: "2px",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.5s ease-out forwards",
        shimmer: "shimmer 1.5s infinite",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
