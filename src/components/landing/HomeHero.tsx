import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Zap } from 'lucide-react';
import { InteractiveProductShowcase } from '@/components/illustrations/InteractiveProductShowcase';

const valueChips = [
  'Unlimited staff',
  'Multi-resort ready',
  'Real-time sync',
  'White-label capable',
];

export function HomeHero() {
  const scrollToProduct = () => {
    const el = document.getElementById('platform-overview');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden hero-premium-bg grain-overlay atlas-texture">
      {/* Lagoon glow spotlights - enhanced for light mode */}
      <div className="absolute top-1/4 right-0 w-[600px] md:w-[900px] h-[600px] md:h-[900px] bg-primary/15 dark:bg-primary/12 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] md:w-[700px] h-[400px] md:h-[700px] bg-teal-400/15 dark:bg-teal-400/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-lagoon-500/10 dark:bg-lagoon-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Soft radial glow behind headline */}
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-primary/12 dark:bg-primary/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="container relative mx-auto px-4 z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy - instant load for fast FCP */}
          <div className="max-w-xl relative z-10">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
              Resort operations.{' '}
              <span className="text-gradient bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent">
                Beautifully organized.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              Propera brings guests, teams, schedules, and bookings into one elegant system — so service feels effortless.
            </p>

            {/* CTA Row */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button 
                asChild 
                size="lg" 
                className="btn-cta-premium text-base px-8 h-14 rounded-xl text-primary-foreground transition-all duration-200 group"
              >
                <Link to="/book-demo">
                  Book a demo
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="btn-ghost-premium text-base px-8 h-14 rounded-xl group"
                onClick={scrollToProduct}
              >
                <Zap className="mr-2 h-4 w-4 text-primary" />
                Explore the platform
              </Button>
            </div>

            {/* Value Chips - static for instant load */}
            <div className="flex flex-wrap gap-2">
              {valueChips.map((chip) => (
                <Badge key={chip} variant="secondary" className="px-3 py-1.5 text-xs font-medium bg-card/60 backdrop-blur-sm border border-border/30 hover:bg-card/80 transition-colors">
                  {chip}
                </Badge>
              ))}
            </div>
          </div>

          {/* Right: Interactive Product Showcase */}
          <div className="relative lg:pl-8" style={{ minHeight: '400px' }}>
            <InteractiveProductShowcase />
          </div>
        </div>
      </div>

      {/* Premium ribbon divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <svg 
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-4 opacity-60"
          viewBox="0 0 128 16" 
          fill="none"
        >
          <path 
            d="M0 8 Q32 2, 64 8 T128 8" 
            stroke="url(#hero-ribbon)" 
            strokeWidth="1.5" 
            fill="none"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="hero-ribbon" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(175 50% 45%)" stopOpacity="0" />
              <stop offset="30%" stopColor="hsl(175 50% 45%)" stopOpacity="0.6" />
              <stop offset="50%" stopColor="hsl(175 50% 55%)" stopOpacity="0.8" />
              <stop offset="70%" stopColor="hsl(175 50% 45%)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(175 50% 45%)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </section>
  );
}
