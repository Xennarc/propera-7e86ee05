import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { AlertCircle, Check, ArrowRight } from 'lucide-react';

export function OriginSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="product-story" className="py-24 md:py-32 bg-gradient-to-b from-card via-card to-primary/5 dark:from-card dark:via-card dark:to-card relative overflow-hidden">
      {/* Enhanced gradient overlays for light mode */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-teal-400/10 dark:bg-teal-400/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/10 dark:bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      </div>
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.04] dark:opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)',
          backgroundSize: '32px 32px'
        }} />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
            Resort days are beautiful.<br />
            <span className="text-muted-foreground">Operations aren't always.</span>
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center max-w-6xl mx-auto">
          {/* Left - Copy blocks */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <p className="text-lg text-foreground leading-relaxed">
              A resort runs on moments — but behind those moments is a complex web of schedules, capacity, and requests.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              When systems feel fragmented, the guest feels it.
            </p>
            <p className="text-xl font-medium text-primary leading-relaxed">
              Propera brings it back to one calm place.
            </p>
          </motion.div>

          {/* Right - Before/After cards */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="grid gap-4">
              {/* Before card */}
              <div className="bg-background rounded-2xl border border-border/50 p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-destructive/50" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Before</span>
                </div>
                <div className="space-y-3 opacity-60">
                  <div className="flex gap-2">
                    <div className="h-6 w-20 bg-muted/50 rounded blur-[0.5px]" />
                    <div className="h-6 w-14 bg-muted/50 rounded blur-[0.5px]" />
                    <div className="h-6 w-8 bg-amber-500/20 rounded blur-[0.5px]" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-5 w-16 bg-muted/40 rounded" />
                    <div className="h-5 w-24 bg-muted/40 rounded" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Scattered lists, missed notes</p>
                </div>
              </div>

              {/* Arrow connector */}
              <div className="flex justify-center py-2">
                <motion.div
                  initial={reducedMotion ? {} : { scale: 0.8, opacity: 0 }}
                  whileInView={{ scale: 1, opacity: 1 }}
                  viewport={{ once: true }}
                  className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
                >
                  <ArrowRight className="h-5 w-5 text-primary rotate-90" />
                </motion.div>
              </div>

              {/* After card */}
              <div className="bg-background rounded-2xl border border-primary/20 p-6 relative overflow-hidden shadow-lg shadow-primary/5">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-primary uppercase tracking-wide">With Propera</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-card rounded-lg border border-border/50 p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-muted-foreground">Live Timeline</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="h-5 bg-primary/20 rounded" />
                      <div className="h-5 bg-primary/15 rounded" />
                      <div className="h-5 bg-primary/10 rounded" />
                    </div>
                  </div>
                  <p className="text-xs text-foreground">One view, clear statuses</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Ocean line separator */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
    </section>
  );
}
