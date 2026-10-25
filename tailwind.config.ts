import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#f4efe4",
        mute: "#a89e8e",
        copper: "#c46a2d",
        wax: "#e7c39a",
        plaster: "#cfc6b8",
        foundry: "#161410",
        panel: "#1f1b16",
        line: "#3a342c",
      },
      fontFamily: {
        display: ["var(--font-display)", "Palatino", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
