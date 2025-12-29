import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Sparkles, Zap, Palette, Layers, Heart } from 'lucide-react';

const PILLARS = [
  { icon: Layers, label: 'Clarity over clutter' },
  { icon: Zap, label: 'Fast, but never rushed' },
  { icon: Palette, label: 'Beautiful defaults' },
  { icon: Sparkles, label: 'Consistency across every screen' },
  { icon: Heart, label: 'Designed for teams, loved by guests' },
];

export function DesignPhilosophy() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-card via-card to-primary/5 dark:from-card dark:via-card dark:to-card relative overflow-hidden">
      {/* Enhanced gradient overlays for light mode */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/15 dark:bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-400/12 dark:bg-teal-400/5 rounded-full blur-[100px] pointer-events-none" />
      {/* Subtle pattern for texture */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '36px 36px' }} />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Crafted like a luxury product.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every detail considered. Every interaction refined.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
          {/* Left - Pillars */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="space-y-4">
              {PILLARS.map((pillar, index) => (
                <motion.div
                  key={pillar.label}
                  initial={reducedMotion ? {} : { opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:scale-110 transition-all">
                    <pillar.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <span className="text-lg font-medium text-foreground">{pillar.label}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right - UI fragments collage */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="grid grid-cols-2 gap-4">
              {/* Guest booking confirmation */}
              <motion.div
                whileHover={reducedMotion ? {} : { y: -4, scale: 1.02 }}
                className="bg-background rounded-xl border border-border/50 p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">Booking confirmed</span>
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Sunset Cruise</p>
                <p className="text-xs text-muted-foreground">Tomorrow, 5:30 PM</p>
                <div className="mt-3 h-6 bg-primary/10 rounded-lg" />
              </motion.div>

              {/* Staff roster card */}
              <motion.div
                whileHover={reducedMotion ? {} : { y: -4, scale: 1.02 }}
                className="bg-background rounded-xl border border-border/50 p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Today's roster</span>
                </div>
                <div className="flex -space-x-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-primary/30 border-2 border-background" />
                  <div className="w-7 h-7 rounded-full bg-teal-400/30 border-2 border-background" />
                  <div className="w-7 h-7 rounded-full bg-violet-400/30 border-2 border-background" />
                </div>
                <p className="text-xs text-muted-foreground">6 staff on duty</p>
              </motion.div>

              {/* Request card */}
              <motion.div
                whileHover={reducedMotion ? {} : { y: -4, scale: 1.02 }}
                className="bg-background rounded-xl border border-amber-500/20 p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-xs text-amber-600 dark:text-amber-400">New request</span>
                </div>
                <p className="text-sm text-foreground mb-1">Room 204</p>
                <p className="text-xs text-muted-foreground">"Extra pillows, please"</p>
              </motion.div>

              {/* Branding settings card */}
              <motion.div
                whileHover={reducedMotion ? {} : { y: -4, scale: 1.02 }}
                className="bg-background rounded-xl border border-border/50 p-4 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-muted-foreground">Brand settings</span>
                </div>
                <div className="flex gap-2 mb-2">
                  <div className="w-5 h-5 rounded bg-primary" />
                  <div className="w-5 h-5 rounded bg-teal-400" />
                  <div className="w-5 h-5 rounded bg-violet-400" />
                </div>
                <div className="h-4 w-3/4 bg-muted/50 rounded" />
              </motion.div>
            </div>

            {/* Caption */}
            <p className="text-xs text-muted-foreground text-center mt-6">
              Illustrations are conceptual.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Ocean line separator */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </section>
  );
}
