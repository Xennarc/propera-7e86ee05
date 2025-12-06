import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
  	container: {
  		center: true,
  		padding: '1.5rem',
  		screens: {
  			'2xl': '1400px'
  		}
  	},
  	extend: {
  		colors: {
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			navy: {
  				'500': 'hsl(var(--navy-500))',
  				'600': 'hsl(var(--navy-600))',
  				'700': 'hsl(var(--navy-700))',
  				'800': 'hsl(var(--navy-800))',
  				'900': 'hsl(var(--navy-900))',
  				'950': 'hsl(var(--navy-950))'
  			},
  			teal: {
  				'300': 'hsl(var(--teal-300))',
  				'400': 'hsl(var(--teal-400))',
  				'500': 'hsl(var(--teal-500))',
  				'600': 'hsl(var(--teal-600))'
  			},
  			sand: {
  				'200': 'hsl(var(--sand-200))',
  				'300': 'hsl(var(--sand-300))',
  				'400': 'hsl(var(--sand-400))',
  				'500': 'hsl(var(--sand-500))',
  				'600': 'hsl(var(--sand-600))',
  				DEFAULT: 'hsl(var(--sand-400))'
  			},
  			coral: {
  				'300': 'hsl(var(--coral-300))',
  				'400': 'hsl(var(--coral-400))',
  				'500': 'hsl(var(--coral-500))',
  				'600': 'hsl(var(--coral-600))',
  				DEFAULT: 'hsl(var(--coral-500))'
  			},
  			lagoon: {
  				'300': 'hsl(var(--lagoon-300))',
  				'400': 'hsl(var(--lagoon-400))',
  				'500': 'hsl(var(--lagoon-500))',
  				'600': 'hsl(var(--lagoon-600))',
  				DEFAULT: 'hsl(var(--lagoon-500))'
  			},
  			sunset: {
  				'300': 'hsl(var(--sunset-300))',
  				'400': 'hsl(var(--sunset-400))',
  				'500': 'hsl(var(--sunset-500))',
  				'600': 'hsl(var(--sunset-600))',
  				DEFAULT: 'hsl(var(--sunset-500))'
  			},
  			orchid: {
  				'300': 'hsl(var(--orchid-300))',
  				'400': 'hsl(var(--orchid-400))',
  				'500': 'hsl(var(--orchid-500))',
  				'600': 'hsl(var(--orchid-600))',
  				DEFAULT: 'hsl(var(--orchid-500))'
  			},
  			category: {
  				dive: 'hsl(var(--category-dive))',
  				watersport: 'hsl(var(--category-watersport))',
  				excursion: 'hsl(var(--category-excursion))',
  				spa: 'hsl(var(--category-spa))',
  				dining: 'hsl(var(--category-dining))',
  				bar: 'hsl(var(--category-bar))',
  				fitness: 'hsl(var(--category-fitness))',
  				kids: 'hsl(var(--category-kids))',
  				snorkeling: 'hsl(var(--category-snorkeling))',
  				transfer: 'hsl(var(--category-transfer))',
  				other: 'hsl(var(--category-other))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			success: {
  				DEFAULT: 'hsl(var(--success))',
  				foreground: 'hsl(var(--success-foreground))'
  			},
  			warning: {
  				DEFAULT: 'hsl(var(--warning))',
  				foreground: 'hsl(var(--warning-foreground))'
  			},
  			info: {
  				DEFAULT: 'hsl(var(--info))',
  				foreground: 'hsl(var(--info-foreground))'
  			},
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))',
  				'6': 'hsl(var(--chart-6))'
  			}
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)',
  			xl: 'calc(var(--radius) + 4px)',
  			'2xl': 'calc(var(--radius) + 8px)',
  			'3xl': 'calc(var(--radius) + 16px)'
  		},
  		boxShadow: {
  			'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.08), 0 4px 12px -4px rgba(0, 0, 0, 0.04)',
  			'medium': '0 4px 16px -4px rgba(0, 0, 0, 0.12), 0 8px 24px -8px rgba(0, 0, 0, 0.06)',
  			'elevated': '0 8px 32px -8px rgba(0, 0, 0, 0.14), 0 16px 48px -16px rgba(0, 0, 0, 0.08)',
  			'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)',
  			'card-hover': '0 4px 16px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.04)',
  			'inner-glow': 'inset 0 1px 2px rgba(255, 255, 255, 0.08)',
  			'glow': '0 0 24px rgba(var(--primary), 0.12)',
  			'glow-coral': '0 0 24px rgba(var(--coral-500), 0.2)',
  			'glow-lagoon': '0 0 24px rgba(var(--lagoon-500), 0.2)',
  			'2xs': 'var(--shadow-2xs)',
  			xs: 'var(--shadow-xs)',
  			sm: 'var(--shadow-sm)',
  			md: 'var(--shadow-md)',
  			lg: 'var(--shadow-lg)',
  			xl: 'var(--shadow-xl)',
  			'2xl': 'var(--shadow-2xl)'
  		},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0',
  					opacity: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)',
  					opacity: '1'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)',
  					opacity: '1'
  				},
  				to: {
  					height: '0',
  					opacity: '0'
  				}
  			},
  			'fade-in': {
  				'0%': {
  					opacity: '0',
  					transform: 'translateY(8px)'
  				},
  				'100%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				}
  			},
  			'fade-out': {
  				'0%': {
  					opacity: '1',
  					transform: 'translateY(0)'
  				},
  				'100%': {
  					opacity: '0',
  					transform: 'translateY(8px)'
  				}
  			},
  			'scale-in': {
  				'0%': {
  					transform: 'scale(0.96)',
  					opacity: '0'
  				},
  				'100%': {
  					transform: 'scale(1)',
  					opacity: '1'
  				}
  			},
  			'slide-in-right': {
  				'0%': {
  					transform: 'translateX(100%)'
  				},
  				'100%': {
  					transform: 'translateX(0)'
  				}
  			},
  			'slide-out-right': {
  				'0%': {
  					transform: 'translateX(0)'
  				},
  				'100%': {
  					transform: 'translateX(100%)'
  				}
  			},
  			'shimmer': {
  				'100%': {
  					transform: 'translateX(100%)'
  				}
  			},
  			'float': {
  				'0%, 100%': {
  					transform: 'translateY(0)'
  				},
  				'50%': {
  					transform: 'translateY(-8px)'
  				}
  			},
  			'pulse-soft': {
  				'0%, 100%': {
  					opacity: '1'
  				},
  				'50%': {
  					opacity: '0.7'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out',
  			'fade-in': 'fade-in 0.3s ease-out',
  			'fade-out': 'fade-out 0.3s ease-out',
  			'scale-in': 'scale-in 0.2s ease-out',
  			'slide-in-right': 'slide-in-right 0.3s ease-out',
  			'slide-out-right': 'slide-out-right 0.3s ease-out',
  			'shimmer': 'shimmer 2s infinite',
  			'float': 'float 6s ease-in-out infinite',
  			'pulse-soft': 'pulse-soft 2s ease-in-out infinite'
  		},
  		fontFamily: {
  			sans: [
  				'Space Grotesk',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'Noto Sans',
  				'sans-serif'
  			],
  			mono: [
  				'Space Mono',
  				'ui-monospace',
  				'SFMono-Regular',
  				'Menlo',
  				'Monaco',
  				'Consolas',
  				'Liberation Mono',
  				'Courier New',
  				'monospace'
  			]
  		},
  		fontSize: {
  			'2xs': [
  				'0.625rem',
  				{
  					lineHeight: '0.875rem'
  				}
  			],
  			'xs': [
  				'0.75rem',
  				{
  					lineHeight: '1rem'
  				}
  			],
  			'sm': [
  				'0.875rem',
  				{
  					lineHeight: '1.25rem'
  				}
  			],
  			'base': [
  				'1rem',
  				{
  					lineHeight: '1.5rem'
  				}
  			],
  			'lg': [
  				'1.125rem',
  				{
  					lineHeight: '1.75rem'
  				}
  			],
  			'xl': [
  				'1.25rem',
  				{
  					lineHeight: '1.75rem'
  				}
  			],
  			'2xl': [
  				'1.5rem',
  				{
  					lineHeight: '2rem'
  				}
  			],
  			'3xl': [
  				'1.875rem',
  				{
  					lineHeight: '2.25rem'
  				}
  			],
  			'4xl': [
  				'2.25rem',
  				{
  					lineHeight: '2.5rem',
  					letterSpacing: '-0.02em'
  				}
  			],
  			'display': [
  				'3rem',
  				{
  					lineHeight: '1.15',
  					letterSpacing: '-0.02em'
  				}
  			],
  			'headline': [
  				'2rem',
  				{
  					lineHeight: '1.25',
  					letterSpacing: '-0.01em'
  				}
  			]
  		},
  		spacing: {
  			'18': '4.5rem',
  			'22': '5.5rem',
  			'26': '6.5rem',
  			'30': '7.5rem'
  		},
  		transitionTimingFunction: {
  			'smooth': 'cubic-bezier(0.16, 1, 0.3, 1)',
  			'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)'
  		},
  		backdropBlur: {
  			xs: '2px'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
