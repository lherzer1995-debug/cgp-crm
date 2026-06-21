import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Accent — Porsche Miami Blue inspired
        accent: {
          50: "#eef9ff",
          100: "#d9f2ff",
          200: "#bae8ff",
          300: "#8ad8ff",
          400: "#53bfff",
          500: "#2b9fff",
          600: "#1480e4",
          700: "#0d68bb",
          800: "#115897",
          900: "#144a7d",
          950: "#0f2f4e",
        },
        // Surface layers — matte black glass hierarchy
        surface: {
          base: "#0a0a0f",
          raised: "#111118",
          overlay: "#18181f",
          hover: "#1e1e28",
          muted: "#272730",
          border: "rgba(255,255,255,0.06)",
        },
        // Semantic
        success: {
          DEFAULT: "#2dd4bf",
          muted: "rgba(45,212,191,0.10)",
        },
        warning: {
          DEFAULT: "#fbbf24",
          muted: "rgba(251,191,36,0.10)",
        },
        danger: {
          DEFAULT: "#f87171",
          muted: "rgba(248,113,113,0.10)",
        },
        muted: "#8b8b9e",
      },
      fontFamily: {
        sans: ["Inter", "SF Pro Display", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      fontSize: {
        display: ["2.25rem", { lineHeight: "2.5rem", fontWeight: "600", letterSpacing: "-0.04em" }],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "fade-up": "fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-in": "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        aurora: "aurora 8s ease-in-out infinite alternate",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        "pulse-subtle": "pulseSubtle 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        fadeUp: { "0%": { opacity: "0", transform: "translateY(12px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        scaleIn: { "0%": { opacity: "0", transform: "scale(0.95)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        aurora: { "0%": { backgroundPosition: "0% 50%" }, "100%": { backgroundPosition: "100% 50%" } },
        float: { "0%,100%": { transform: "translateY(0px)" }, "50%": { transform: "translateY(-10px)" } },
        shimmer: { "0%": { backgroundPosition: "200% 0" }, "100%": { backgroundPosition: "-200% 0" } },
        pulseSubtle: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0.85" } },
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(43,159,255,0.15)",
        "glow-sm": "0 0 20px -5px rgba(43,159,255,0.12)",
        card: "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03)",
        "card-hover": "0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "aurora-radial": "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(43,159,255,0.08), transparent 60%), radial-gradient(ellipse 50% 50% at 80% 80%, rgba(139,92,246,0.05), transparent 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
