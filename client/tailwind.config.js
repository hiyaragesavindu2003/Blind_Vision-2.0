/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          bg: "#06070a",
          surface: "#0e1014",
          card: "#11141a",
          "card-2": "#171b23",
          "card-3": "#1f2430",
          border: "#262b36",
          "border-strong": "#384055",
        },
        accent: {
          DEFAULT: "#00ff95",
          dim: "#00d97a",
          deep: "#00b366",
          ink: "#001b0f",
          glow: "rgba(0, 255, 149, 0.35)",
        },
        secondary: {
          DEFAULT: "#7c8cff",
          dim: "#5d6fdb",
          glow: "rgba(124, 140, 255, 0.35)",
        },
        warning: {
          DEFAULT: "#ff8a3c",
          dim: "#e57124",
          glow: "rgba(255, 138, 60, 0.35)",
        },
        emergency: {
          DEFAULT: "#ff3535",
          dim: "#d11f1f",
          glow: "rgba(255, 53, 53, 0.45)",
        },
        text: {
          DEFAULT: "#f7f8fb",
          muted: "#aab1c0",
          subtle: "#727884",
        },
      },
      fontFamily: {
        sans: [
          "'Atkinson Hyperlegible'",
          "Inter",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "'JetBrains Mono'",
          "'SF Mono'",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        base: ["1.125rem", { lineHeight: "1.7" }],
      },
      backgroundImage: {
        "ambient-glow":
          "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,255,149,0.18), transparent 70%), radial-gradient(ellipse 60% 50% at 100% 10%, rgba(124,140,255,0.12), transparent 65%), radial-gradient(ellipse 70% 50% at 0% 100%, rgba(0,255,149,0.06), transparent 70%)",
        "card-gradient":
          "linear-gradient(140deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
        "accent-gradient":
          "linear-gradient(135deg, #00ff95 0%, #00b366 100%)",
        "emergency-gradient":
          "linear-gradient(135deg, #ff5050 0%, #c41616 100%)",
        "dot-grid":
          "radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(0,255,149,0.25), 0 8px 32px -8px rgba(0,255,149,0.35)",
        "glow-emergency":
          "0 0 0 1px rgba(255,53,53,0.45), 0 10px 40px -8px rgba(255,53,53,0.5)",
        elevated:
          "0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 40px -16px rgba(0,0,0,0.7)",
      },
      keyframes: {
        pulseGlow: {
          "0%, 100%": {
            boxShadow:
              "0 0 0 0 rgba(0,255,149,0.55), 0 0 0 1px rgba(0,255,149,0.6)",
          },
          "50%": {
            boxShadow:
              "0 0 0 14px rgba(0,255,149,0), 0 0 0 1px rgba(0,255,149,0.6)",
          },
        },
        slowBlink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        breath: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.85" },
          "50%": { transform: "scale(1.04)", opacity: "1" },
        },
        waveform: {
          "0%, 100%": { transform: "scaleY(0.35)" },
          "50%": { transform: "scaleY(1)" },
        },
        sweep: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "slow-blink": "slowBlink 2s ease-in-out infinite",
        breath: "breath 2.4s ease-in-out infinite",
        "waveform-1": "waveform 0.9s ease-in-out infinite",
        "waveform-2": "waveform 1.1s ease-in-out infinite 0.15s",
        "waveform-3": "waveform 0.75s ease-in-out infinite 0.3s",
        "waveform-4": "waveform 1.0s ease-in-out infinite 0.45s",
        "waveform-5": "waveform 0.85s ease-in-out infinite 0.6s",
        sweep: "sweep 2.5s ease-in-out infinite",
        "fade-in": "fadeIn 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};
