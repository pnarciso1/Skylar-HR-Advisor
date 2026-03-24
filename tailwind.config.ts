import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#2563eb",
          dark: "#1e40af",
        },
        secondary: "#64748b",
        background: "#f8fafc",
        surface: "#ffffff",
      },
    },
  },
  plugins: [],
};
export default config;
