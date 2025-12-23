import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Smartphone, Monitor, Users, UtensilsCrossed, Calendar, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { memo } from 'react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';

// Glass frame product preview - lightweight, illustrative
const ProductPreview = memo(function ProductPreview({ shouldAnimate }: { shouldAnimate: boolean }) {
  return (
    <div className="relative">
      {/* Main glass frame */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-card/80 backdrop-blur-xl rounded-2xl border border-border/50 shadow-elevated overflow-hidden"
      >
        {/* Mac-style top bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30 bg-muted/30">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-coral-400" />
            <div className="w-3 h-3 rounded-full bg-sunset-400" />
            <div className="w-3 h-3 rounded-full bg-success" />
          </div>
          <span className="text-xs text-muted-foreground ml-2">Propera — Preview (illustrative)</span>
        </div>

        <div className="p-4 grid md:grid-cols-2 gap-4">
          {/* Guest Portal Preview */}
          <div className="bg-muted/20 rounded-xl p-4 border border-border/30">
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
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex items-center justify-between py-2 px-3 bg-background/60 rounded-lg border border-border/20"
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
          <div className="bg-muted/20 rounded-xl p-4 border border-border/30">
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

      {/* Floating decorative element */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute -bottom-4 -right-4 bg-card/90 backdrop-blur-xl rounded-xl border border-border/50 shadow-lg p-3 hidden md:block"
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center">
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
});

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
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
      {/* Background layers */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute top-1/4 right-0 w-[600px] md:w-[800px] h-[600px] md:h-[800px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-teal-400/10 rounded-full blur-[100px] pointer-events-none" />
      </div>

      {/* Soft radial glow behind headline */}
      <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-primary/15 rounded-full blur-[80px] pointer-events-none" />

      <div className="container relative mx-auto px-4">
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
              <Button asChild size="lg" className="text-base px-8 h-14 rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all group">
                <Link to="/auth">
                  Book a demo
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 h-14 rounded-xl group hover:bg-primary/5"
                onClick={scrollToProduct}
              >
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
                  <Badge variant="secondary" className="px-3 py-1.5 text-xs font-medium">
                    {chip}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right: Product Preview */}
          <div className="relative lg:pl-8" style={{ minHeight: '400px' }}>
            <ProductPreview shouldAnimate={shouldAnimate} />
          </div>
        </div>
      </div>

      {/* Ocean line divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
    </section>
  );
}
