import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1400px",
      },
    },
    screens: {
      'xs': '375px',  // iPhone SE and up
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        // Core brand colors
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Modern Professional Palette
        midnight: {
          950: "hsl(var(--midnight-950))",
          900: "hsl(var(--midnight-900))",
          800: "hsl(var(--midnight-800))",
          700: "hsl(var(--midnight-700))",
          600: "hsl(var(--midnight-600))",
          500: "hsl(var(--midnight-500))",
        },
        lime: {
          600: "hsl(var(--lime-600))",
          500: "hsl(var(--lime-500))",
          400: "hsl(var(--lime-400))",
          300: "hsl(var(--lime-300))",
          200: "hsl(var(--lime-200))",
          DEFAULT: "hsl(var(--lime-400))",
        },
        blurple: {
          600: "hsl(var(--blurple-600))",
          500: "hsl(var(--blurple-500))",
          400: "hsl(var(--blurple-400))",
          300: "hsl(var(--blurple-300))",
          DEFAULT: "hsl(var(--blurple-500))",
        },

        // Legacy brand color scales (backwards compatibility)
        navy: {
          950: "hsl(var(--navy-950))",
          900: "hsl(var(--navy-900))",
          800: "hsl(var(--navy-800))",
          700: "hsl(var(--navy-700))",
          600: "hsl(var(--navy-600))",
          500: "hsl(var(--navy-500))",
        },
        teal: {
          600: "hsl(var(--teal-600))",
          500: "hsl(var(--teal-500))",
          400: "hsl(var(--teal-400))",
          300: "hsl(var(--teal-300))",
        },
        sand: {
          600: "hsl(var(--sand-600))",
          500: "hsl(var(--sand-500))",
          400: "hsl(var(--sand-400))",
          300: "hsl(var(--sand-300))",
          200: "hsl(var(--sand-200))",
          DEFAULT: "hsl(var(--sand-400))",
        },

        // Extended accent palette
        coral: {
          600: "hsl(var(--coral-600))",
          500: "hsl(var(--coral-500))",
          400: "hsl(var(--coral-400))",
          300: "hsl(var(--coral-300))",
          DEFAULT: "hsl(var(--coral-500))",
        },
        lagoon: {
          600: "hsl(var(--lagoon-600))",
          500: "hsl(var(--lagoon-500))",
          400: "hsl(var(--lagoon-400))",
          300: "hsl(var(--lagoon-300))",
          DEFAULT: "hsl(var(--lagoon-500))",
        },
        sunset: {
          600: "hsl(var(--sunset-600))",
          500: "hsl(var(--sunset-500))",
          400: "hsl(var(--sunset-400))",
          300: "hsl(var(--sunset-300))",
          DEFAULT: "hsl(var(--sunset-500))",
        },
        orchid: {
          600: "hsl(var(--orchid-600))",
          500: "hsl(var(--orchid-500))",
          400: "hsl(var(--orchid-400))",
          300: "hsl(var(--orchid-300))",
          DEFAULT: "hsl(var(--orchid-500))",
        },

        // Category colors
        category: {
          dive: "hsl(var(--category-dive))",
          watersport: "hsl(var(--category-watersport))",
          excursion: "hsl(var(--category-excursion))",
          spa: "hsl(var(--category-spa))",
          dining: "hsl(var(--category-dining))",
          bar: "hsl(var(--category-bar))",
          fitness: "hsl(var(--category-fitness))",
          kids: "hsl(var(--category-kids))",
          snorkeling: "hsl(var(--category-snorkeling))",
          transfer: "hsl(var(--category-transfer))",
          other: "hsl(var(--category-other))",
        },

        // Sidebar colors
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },

        // Status colors
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },

        // Chart colors
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
          "6": "hsl(var(--chart-6))",
        },
      },
      borderRadius: {
        // Modern Professional radii - larger and softer
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
        "3xl": "1.5rem", // 24px for cards
        "4xl": "2rem",
        "pill": "9999px",
      },
      boxShadow: {
        "soft": "0 2px 8px -2px rgba(0, 0, 0, 0.08), 0 4px 12px -4px rgba(0, 0, 0, 0.04)",
        "medium": "0 4px 16px -4px rgba(0, 0, 0, 0.12), 0 8px 24px -8px rgba(0, 0, 0, 0.06)",
        "elevated": "0 8px 32px -8px rgba(0, 0, 0, 0.14), 0 16px 48px -16px rgba(0, 0, 0, 0.08)",
        "card": "0 1px 3px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)",
        "card-hover": "0 4px 16px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.04)",
        "inner-glow": "inset 0 1px 2px rgba(255, 255, 255, 0.08)",
        // Lime glow shadows
        "glow": "0 0 24px rgba(184, 226, 158, 0.25)",
        "glow-lime": "0 0 20px rgba(184, 226, 158, 0.35)",
        "glow-lime-lg": "0 0 40px rgba(184, 226, 158, 0.45)",
        "glow-sprig": "0 0 20px rgba(184, 226, 158, 0.35)",
        "glow-sprig-lg": "0 0 40px rgba(184, 226, 158, 0.45)",
        "glow-ember": "0 0 24px rgba(233, 79, 42, 0.30)",
        "glow-blurple": "0 0 24px rgba(88, 101, 242, 0.25)",
        // Legacy
        "glow-coral": "0 0 24px rgba(var(--coral-500), 0.2)",
        "glow-lagoon": "0 0 24px rgba(var(--lagoon-500), 0.2)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(8px)" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
        "shimmer": {
          "100%": { transform: "translateX(100%)" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "glow-pulse": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(195, 255, 46, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(195, 255, 46, 0.5)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "shimmer": "shimmer 2s infinite",
        "float": "float 6s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
      },
      fontFamily: {
        sans: ['DM Sans', 'Plus Jakarta Sans', 'Sora', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      },
      letterSpacing: {
        'heading': '0.02em',
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
        "xs": ["0.75rem", { lineHeight: "1rem" }],
        "sm": ["0.875rem", { lineHeight: "1.25rem" }],
        "base": ["1rem", { lineHeight: "1.5rem" }],
        "lg": ["1.125rem", { lineHeight: "1.75rem" }],
        "xl": ["1.25rem", { lineHeight: "1.75rem" }],
        "2xl": ["1.5rem", { lineHeight: "2rem" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem" }],
        "4xl": ["2.25rem", { lineHeight: "2.5rem", letterSpacing: "-0.02em" }],
        "display": ["3rem", { lineHeight: "1.15", letterSpacing: "0.02em" }],
        "headline": ["2rem", { lineHeight: "1.25", letterSpacing: "0.02em" }],
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "26": "6.5rem",
        "30": "7.5rem",
      },
      transitionTimingFunction: {
        "smooth": "cubic-bezier(0.16, 1, 0.3, 1)",
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
