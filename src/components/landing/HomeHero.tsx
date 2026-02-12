import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Zap } from 'lucide-react';
import { MobileGuestShowcase } from '@/components/illustrations/MobileGuestShowcase';
import { useReducedMotion } from '@/hooks/useReducedMotion';

// Lazy load desktop-only showcase (hidden on mobile, reduces initial bundle)
const InteractiveProductShowcase = lazy(() => 
  import('@/components/illustrations/InteractiveProductShowcase').then(m => ({ default: m.InteractiveProductShowcase }))
);

const valueChips = [
  'Unlimited staff',
  'Multi-resort ready',
  'Real-time sync',
  'White-label capable',
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

  // When reduced motion is on, show everything instantly
  const initial = prefersReducedMotion ? 'visible' : 'hidden';
  const animate = 'visible';

  return (
    <section className="relative min-h-[90vh] md:min-h-screen flex items-center pt-16 md:pt-20 pb-12 md:pb-16 overflow-hidden bg-background">
      {/* Midnight gradient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-midnight-900/50 dark:to-midnight-950" />
      
      {/* === Ocean Glow Blobs (visible on mobile) === */}
      <div className="ocean-blob ocean-blob-1 absolute top-[15%] right-[-10%] md:right-[-5%] w-[280px] h-[280px] sm:w-[400px] sm:h-[400px] md:w-[800px] md:h-[800px] rounded-full blur-[80px] md:blur-[150px] bg-teal-400/10 dark:bg-teal-400/12" />
      <div className="ocean-blob ocean-blob-2 absolute bottom-[5%] left-[-10%] w-[240px] h-[240px] sm:w-[300px] sm:h-[300px] md:w-[600px] md:h-[600px] rounded-full blur-[70px] md:blur-[120px] bg-blurple-500/8 dark:bg-blurple-500/10" />
      <div className="ocean-blob ocean-blob-3 absolute top-[45%] left-[25%] w-[160px] h-[160px] sm:w-[200px] sm:h-[200px] md:w-[300px] md:h-[300px] rounded-full blur-[50px] md:blur-[100px] bg-lime-400/5 dark:bg-lime-400/7" />

      <div className="container relative mx-auto px-4 z-10">
        <div className="flex flex-col md:grid md:grid-cols-2 md:gap-12 lg:gap-16 items-center text-center md:text-left">
          {/* Left: Copy */}
          <div className="max-w-xl mx-auto md:mx-0 relative z-10">
            <motion.h1
              variants={fadeRise(10, 0)}
              initial={initial}
              animate={animate}
              className="text-[1.75rem] xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-3 md:mb-6 leading-[1.1] tracking-tight"
            >
              Resort operations.{' '}
              <span className="text-gradient bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent">
                Beautifully organized.
              </span>
            </motion.h1>

            <motion.p
              variants={fadeRise(8, 0.1)}
              initial={initial}
              animate={animate}
              className="text-base md:text-lg lg:text-xl text-foreground/70 mb-5 md:mb-8 leading-relaxed"
            >
              Propera brings guests, teams, schedules, and bookings into one elegant system — so service feels effortless.
            </motion.p>

            {/* CTA Row */}
            <motion.div
              variants={fadeRise(6, 0.2)}
              initial={initial}
              animate={animate}
              className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 md:mb-8 sm:justify-center md:justify-start"
            >
              <Button 
                asChild 
                size="lg" 
                className="bg-primary text-primary-foreground text-base px-6 sm:px-8 h-12 sm:h-14 rounded-full font-semibold glow-lime cta-breathe-once transition-all duration-200 group hover:-translate-y-0.5 active:scale-[0.97] w-full sm:w-auto"
              >
                <Link to="/book-demo">
                  Book a demo
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-6 sm:px-8 h-12 sm:h-14 rounded-full border-border/50 hover:border-primary/30 hover:bg-midnight-800/50 group active:scale-[0.97] transition-all duration-200 w-full sm:w-auto"
                onClick={scrollToProduct}
              >
                <Zap className="mr-2 h-4 w-4 text-primary" />
                Explore the platform
              </Button>
            </motion.div>

            {/* Value Chips - horizontal scroll on mobile, wrap on sm+ */}
            <motion.div
              variants={fadeRise(0, 0.3)}
              initial={initial}
              animate={animate}
              className="relative"
            >
              <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-hide scroll-fade-right sm:flex-wrap sm:overflow-visible sm:justify-center md:justify-start sm:[mask-image:none]">
                {valueChips.map((chip) => (
                  <Badge key={chip} variant="secondary" className="glass-pill px-3 py-1.5 text-xs font-medium hover:bg-white/10 dark:hover:bg-white/10 transition-colors snap-start shrink-0 sm:shrink">
                    {chip}
                  </Badge>
                ))}
              </div>
            </motion.div>

            {/* Phone Mockup - Below CTAs on mobile only */}
            <motion.div
              variants={scaleIn(0.4)}
              initial={initial}
              animate={animate}
              className="flex justify-center mt-6 md:hidden"
            >
              <div className="animate-hero-float">
                <MobileGuestShowcase />
              </div>
            </motion.div>
          </div>

          {/* Right: Phone Mockup for tablet (md to lg) */}
          <motion.div
            variants={scaleIn(0.4)}
            initial={initial}
            animate={animate}
            className="hidden md:flex lg:hidden items-center justify-center"
          >
            <div className="animate-hero-float">
              <MobileGuestShowcase />
            </div>
          </motion.div>

          {/* Right: Interactive Product Showcase (Desktop only - lazy loaded) */}
          <div className="relative lg:pl-8 hidden lg:block" style={{ minHeight: '500px' }}>
            <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>}>
              <InteractiveProductShowcase />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
