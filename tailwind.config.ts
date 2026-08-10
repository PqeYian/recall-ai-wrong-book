import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "PingFang SC",
          "DingTalk JinBuTi",
          "SF Pro",
          "system-ui",
          "sans-serif"
        ]
      },
      colors: {
        background: "var(--color-bg-page)",
        card: "var(--color-card)",
        border: "var(--color-border)",
        foreground: "var(--color-text-primary)",
        muted: {
          foreground: "var(--color-text-secondary)"
        },
        primary: {
          DEFAULT: "var(--color-primary)",
          foreground: "#FFFFFF",
          hover: "var(--color-primary-hover)"
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        error: "var(--color-error)",
        stem: "var(--color-stem)",
        analysis: "var(--color-analysis)"
      },
      borderRadius: {
        md: "8px",
        lg: "12px",
        sm: "6px"
      },
      boxShadow: {
        none: "none",
        focus: "0 0 0 3px color-mix(in srgb, var(--color-primary) 22%, transparent)"
      },
      animation: {
        caret: "caret 1s steps(1) infinite",
        "fade-in": "fade-in 0.3s ease-out"
      },
      keyframes: {
        caret: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" }
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        }
      }
    }
  },
  plugins: []
};

export default config;
