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
    <section className="relative min-h-[85vh] md:min-h-screen flex items-center pt-20 md:pt-24 pb-12 md:pb-16 overflow-hidden bg-background">
      {/* Midnight gradient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-midnight-900/50 dark:to-midnight-950" />
      
      {/* Lime glow spotlight - hidden on mobile for performance */}
      <div className="absolute top-1/4 right-0 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-lime-400/8 dark:bg-lime-400/10 rounded-full blur-[100px] md:blur-[150px] pointer-events-none hidden sm:block" />
      
      {/* Blurple glow - hidden on mobile */}
      <div className="absolute bottom-0 left-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-blurple-500/6 dark:bg-blurple-500/8 rounded-full blur-[80px] md:blur-[120px] pointer-events-none hidden sm:block" />
      
      {/* Teal accent glow - hidden on mobile */}
      <div className="absolute top-1/2 left-1/3 w-[200px] md:w-[300px] h-[200px] md:h-[300px] bg-teal-400/5 dark:bg-teal-400/8 rounded-full blur-[60px] md:blur-[100px] pointer-events-none hidden sm:block" />

      <div className="container relative mx-auto px-4 z-10">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-16 items-center text-center lg:text-left">
          {/* Left: Copy - instant load for fast FCP */}
          <div className="max-w-xl mx-auto lg:mx-0 relative z-10">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6 leading-[1.1] tracking-tight">
              Resort operations.{' '}
              <span className="text-gradient bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent">
                Beautifully organized.
              </span>
            </h1>

            <p className="text-base md:text-lg lg:text-xl text-muted-foreground mb-6 md:mb-8 leading-relaxed">
              Propera brings guests, teams, schedules, and bookings into one elegant system — so service feels effortless.
            </p>

            {/* CTA Row */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 md:mb-8 sm:justify-center lg:justify-start">
              <Button 
                asChild 
                size="lg" 
                className="bg-primary text-primary-foreground text-base px-6 sm:px-8 h-12 sm:h-14 rounded-full font-semibold glow-lime transition-all duration-200 group hover:-translate-y-0.5 w-full sm:w-auto"
              >
                <Link to="/book-demo">
                  Book a demo
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-6 sm:px-8 h-12 sm:h-14 rounded-full border-border/50 hover:border-primary/30 hover:bg-midnight-800/50 group w-full sm:w-auto"
                onClick={scrollToProduct}
              >
                <Zap className="mr-2 h-4 w-4 text-primary" />
                Explore the platform
              </Button>
            </div>

            {/* Value Chips - glassmorphism style */}
            <div className="flex flex-wrap gap-2 justify-center lg:justify-start">
              {valueChips.map((chip) => (
                <Badge key={chip} variant="secondary" className="glass-pill px-3 py-1.5 text-xs font-medium hover:bg-white/10 dark:hover:bg-white/10 transition-colors">
                  {chip}
                </Badge>
              ))}
            </div>
          </div>

          {/* Right: Interactive Product Showcase - hidden on mobile */}
          <div className="relative lg:pl-8 hidden lg:block" style={{ minHeight: '400px' }}>
            <InteractiveProductShowcase />
          </div>
        </div>
      </div>

    </section>
  );
}
