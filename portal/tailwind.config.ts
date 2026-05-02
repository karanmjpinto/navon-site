import type { Config } from "tailwindcss";

// Brand tokens mirrored from /Users/kp/Navon/assets/shared.css.
// Keep in sync if the marketing site palette evolves.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#000000",
        "ink-2": "#07080A",
        charcoal: "#3F4157",
        slate: "#6F7287",
        mid: "#9E9F9B",
        light: "#E2E3DE",
        vlight: "#F3F4F4",
        paper: "#FFFFFF",
        signal: "#E7FF00",
      },
      fontFamily: {
        display: ["'Space Grotesk'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      transitionTimingFunction: {
        navon: "cubic-bezier(0.65, 0, 0.35, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
