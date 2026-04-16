import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Zap } from 'lucide-react';
import { MobileGuestShowcase } from '@/components/illustrations/MobileGuestShowcase';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const valueChips = [
  'Unlimited staff',
  'Multi-resort ready',
  'Real-time sync',
  'White-label',
  'Mobile-first',
];

// Framer Motion variants
const fadeRise = (y: number, delay: number) => ({
  hidden: { opacity: 0, y },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut', delay } },
});

const scaleIn = (delay: number) => ({
  hidden: { opacity: 0, scale: 0.98 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.6, ease: 'easeOut', delay } },
});

export function HomeHero() {
  const prefersReducedMotion = useReducedMotion();

  const scrollToProduct = () => {
    const el = document.getElementById('platform-overview');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const initial = prefersReducedMotion ? 'visible' : 'hidden';
  const animate = 'visible';

  return (
    <section className="relative min-h-[100svh] flex flex-col pt-[120px] pb-0 overflow-hidden bg-background">
      {/* === Background gradients === */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,hsl(var(--primary)/0.18),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_80%,hsl(175_50%_45%/0.08),transparent_50%)]" />
      </div>

      <div className="container relative mx-auto px-4 z-10 flex-1 flex flex-col">
        <div className="max-w-xl">
          {/* Label pill */}
          <motion.div
            variants={fadeRise(10, 0)}
            initial={initial}
            animate={animate}
            className="mb-7"
          >
            <span className="inline-flex items-center gap-2 bg-card border border-border/50 rounded-full px-3.5 py-1.5 text-[11.5px] font-medium text-muted-foreground uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
              Resort Operations Platform
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={fadeRise(10, 0.1)}
            initial={initial}
            animate={animate}
            style={{ willChange: 'opacity, transform' }}
            className="font-serif text-[52px] font-black leading-[1.0] tracking-[-1.5px] text-foreground mb-1.5"
          >
            Resort ops.{' '}
            <br />
            <em className="not-italic text-primary">Beautifully</em>
            <br />
            organized.
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            variants={fadeRise(8, 0.2)}
            initial={initial}
            animate={animate}
            style={{ willChange: 'opacity, transform' }}
            className="text-base font-light leading-[1.65] text-muted-foreground mt-5 mb-9 max-w-[340px]"
          >
            Guests, teams, schedules, and bookings — unified in one elegant system so service feels effortless.
          </motion.p>

          {/* CTA Row */}
          <motion.div
            variants={fadeRise(6, 0.3)}
            initial={initial}
            animate={animate}
            style={{ willChange: 'opacity, transform' }}
            className="flex flex-col gap-3 mb-10"
          >
            <Button 
              asChild 
              size="lg" 
              className="bg-primary text-primary-foreground text-[15px] px-7 h-[52px] rounded-full font-semibold glow-lime transition-all duration-200 group active:scale-[0.98] w-full sm:w-auto"
            >
              <Link to="/book-demo">
                Book a demo
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="text-[15px] px-7 h-[52px] rounded-full border-border/50 hover:border-foreground/20 group active:scale-[0.98] transition-all duration-200 w-full sm:w-auto"
              onClick={scrollToProduct}
            >
              <Zap className="mr-2 h-4 w-4 text-primary" />
              Explore the platform
            </Button>
          </motion.div>

          {/* Value Chips */}
          <motion.div
            variants={fadeRise(0, 0.4)}
            initial={initial}
            animate={animate}
            style={{ willChange: 'opacity, transform' }}
          >
            <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide mx-[-20px] px-5 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible">
              {valueChips.map((chip) => (
                <Badge key={chip} variant="secondary" className="glass-pill px-4 py-2 text-xs font-medium snap-start shrink-0 sm:shrink">
                  {chip}
                </Badge>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Phone Mockup */}
        <motion.div
          variants={scaleIn(0.5)}
          initial={initial}
          animate={animate}
          style={{ willChange: 'opacity, transform' }}
          className="flex justify-center mt-12 relative"
        >
          <div className="animate-hero-float">
            <MobileGuestShowcase />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
