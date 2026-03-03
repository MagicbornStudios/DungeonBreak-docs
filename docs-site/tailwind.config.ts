import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./app/**/*.{md,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
