import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: "#c9a961",
        secondary: "#E8D7B0",
        bronze: "#6B5D4F",
        "foundation-black": "#0B0D0F",
        carbon: "#151820",
        slate: "#2A2F3A",
        "text-muted": "#8B92A8",
        "text-primary": "#E5E7EB",
      },
      animation: {
        fadeIn: "fadeIn 0.6s ease-in-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
