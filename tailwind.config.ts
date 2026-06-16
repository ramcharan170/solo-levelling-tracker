import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        system: {
          bg: "#05080d",
          card: "#0a0e14",
          panel: "#1a2332",
          border: "#2a3f5f",
          cyan: "#7dd3fc",
          cyanGlow: "#3b82f6",
          purple: "#8b5cf6",
          purpleGlow: "#a78bfa",
          muted: "#5a6b8c",
          text: "#e2e8f0",
          textMuted: "#9fb3d1",
        },
      },
      boxShadow: {
        cyan: "0 0 12px rgba(125, 211, 252, 0.4)",
        purple: "0 0 12px rgba(139, 92, 246, 0.4)",
        double: "0 0 15px rgba(125, 211, 252, 0.2), 0 0 15px rgba(139, 92, 246, 0.2)",
      },
      fontFamily: {
        sans: ["var(--font-outfit)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
