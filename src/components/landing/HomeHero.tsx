import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAnimationPreference } from '@/hooks/useReducedMotion';
import { InteractiveProductShowcase } from '@/components/illustrations/InteractiveProductShowcase';
  return (
    <div className="relative">
      {/* Floating decorative status chips */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
        className="absolute -top-2 -right-4 z-20 hidden lg:block"
      >
        <div className="status-chip-decorative flex items-center gap-1.5 animate-gentle-float" style={{ animationDelay: '0.5s' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-foreground">12 bookings today</span>
        </div>
      </motion.div>

      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: -20 } : { opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="absolute top-1/4 -left-6 z-20 hidden lg:block"
      >
        <div className="status-chip-decorative flex items-center gap-1.5 animate-gentle-float" style={{ animationDelay: '1s' }}>
          <Users className="h-3 w-3 text-primary" />
          <span className="text-foreground">5 guests arriving</span>
        </div>
      </motion.div>

      {/* Main premium glass frame */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, scale: 0.95, y: 20 } : { opacity: 1, scale: 1, y: 0 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className={`preview-frame-premium ${shouldAnimate ? 'animate-gentle-float' : ''}`}
      >
        {/* Mac-style top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/30">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-coral-400" />
            <div className="w-3 h-3 rounded-full bg-sunset-400" />
            <div className="w-3 h-3 rounded-full bg-success" />
          </div>
          <span className="text-xs text-muted-foreground ml-2">Propera — Preview (Illustrative)</span>
        </div>

        <div className="p-4 grid md:grid-cols-2 gap-4">
          {/* Guest Portal Preview */}
          <div className="lagoon-glass-subtle rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Guest Portal</span>
            </div>
            <div className="space-y-2">
              {[
                { name: 'Snorkel Safari', time: '09:30', spots: '4 left' },
                { name: 'Sunset Cruise', time: '17:00', spots: '2 left' },
                { name: 'Couples Massage', time: '14:00', spots: 'Available' },
              ].map((item, i) => (
                <motion.div
                  key={item.name}
                  initial={shouldAnimate ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center justify-between py-2 px-3 bg-background/60 rounded-lg border border-border/20 hover:border-primary/20 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.time}</p>
                  </div>
                  <span className="text-xs text-primary font-medium">{item.spots}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Staff Console Preview */}
          <div className="lagoon-glass-subtle rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Staff Console</span>
            </div>
            <div className="space-y-3">
              <div className="text-xs text-muted-foreground">Today (Example)</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-background/60 rounded-lg p-2 text-center border border-border/20">
                  <p className="text-lg font-bold text-foreground">24</p>
                  <p className="text-[10px] text-muted-foreground">Bookings</p>
                </div>
                <div className="bg-background/60 rounded-lg p-2 text-center border border-border/20">
                  <p className="text-lg font-bold text-foreground">8</p>
                  <p className="text-[10px] text-muted-foreground">Sessions</p>
                </div>
                <div className="bg-background/60 rounded-lg p-2 text-center border border-border/20">
                  <p className="text-lg font-bold text-foreground">3</p>
                  <p className="text-[10px] text-muted-foreground">Requests</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="relative flex h-2 w-2">
                  <span className={`${shouldAnimate ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-success opacity-75`} />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                </span>
                <span className="text-[10px] text-success font-medium">Live sync active</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating decorative element - bottom right */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 20, scale: 0.9 } : { opacity: 1, y: 0, scale: 1 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.7 }}
        className="absolute -bottom-4 -right-4 lagoon-glass rounded-xl p-3 hidden md:block"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center shadow-lg shadow-primary/20">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="text-xs font-medium text-foreground">Real-time sync</p>
            <p className="text-[10px] text-muted-foreground">Guest + Staff aligned</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
const valueChips = [
  'Unlimited staff',
  'Multi-resort ready',
  'Real-time sync',
  'White-label capable',
];

export function HomeHero() {
  const { shouldAnimate } = useAnimationPreference();

  const scrollToProduct = () => {
    const el = document.getElementById('platform-overview');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden hero-premium-bg grain-overlay atlas-texture">
      {/* Lagoon glow spotlights */}
      <div className="absolute top-1/4 right-0 w-[600px] md:w-[900px] h-[600px] md:h-[900px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] md:w-[700px] h-[400px] md:h-[700px] bg-teal-400/12 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-lagoon-500/8 rounded-full blur-[100px] pointer-events-none" />

      {/* Soft radial glow behind headline */}
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-primary/12 rounded-full blur-[100px] pointer-events-none" />

      <div className="container relative mx-auto px-4 z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 30 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl relative z-10"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
              Resort operations.{' '}
              <span className="text-gradient bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
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

            {/* Value Chips */}
            <div className="flex flex-wrap gap-2">
              {valueChips.map((chip, i) => (
                <motion.div
                  key={chip}
                  initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium bg-card/60 backdrop-blur-sm border border-border/30 hover:bg-card/80 transition-colors">
                    {chip}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>

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
