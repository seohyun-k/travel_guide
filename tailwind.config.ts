import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: { DEFAULT: "#FBF8F2", 50: "#FDFCF9", 100: "#FBF8F2", 200: "#F3EEE4" },
        ink: { DEFAULT: "#1F2430", soft: "#4A5162", mute: "#8A90A0" },
        sky: { 50: "#F1F6FD", 100: "#E2EDFB", 200: "#C6DBF7", 300: "#9FC2F0", 400: "#74A5E6", 500: "#5089D8", 600: "#3B6FBC", 700: "#2F5895" },
      },
      fontFamily: {
        sans: ["Pretendard", "-apple-system", "BlinkMacSystemFont", "Apple SD Gothic Neo", "Noto Sans KR", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 2px 10px rgba(31,36,48,0.06), 0 1px 2px rgba(31,36,48,0.04)",
        lift: "0 10px 30px rgba(31,36,48,0.12)",
      },
      borderRadius: { "2xl": "1.1rem", "3xl": "1.5rem" },
    },
  },
  plugins: [],
};
export default config;
