/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  /* ──────────────────────────────────────────────────────────
   * Le thème est géré via des CSS custom properties (variables)
   * définies dans le ThemeProvider. Tailwind utilise ces variables
   * pour permettre un changement de thème dynamique sans rebuild.
   * ────────────────────────────────────────────────────────── */
  theme: {
    extend: {
      colors: {
        primary: "var(--color-primary)",
        "primary-light": "var(--color-primary-light)",
        "primary-dark": "var(--color-primary-dark)",
        secondary: "var(--color-secondary)",
        accent: "var(--color-accent)",
        surface: "var(--color-surface)",
        "surface-alt": "var(--color-surface-alt)",
        background: "var(--color-background)",
        "on-primary": "var(--color-on-primary)",
        "on-surface": "var(--color-on-surface)",
        "on-background": "var(--color-on-background)",
        muted: "var(--color-muted)",
        border: "var(--color-border)",
        danger: "var(--color-danger)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
