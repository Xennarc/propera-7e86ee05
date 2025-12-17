import { motion, useReducedMotion } from 'framer-motion';
import { Check, Smartphone, Monitor, BarChart3 } from 'lucide-react';

const BUILD_PRINCIPLES = [
  'Designed with teams who run real resorts',
  'Feature flags and plan tiers for flexibility',
  'Built for capacity, timing, and multi-resort logic',
  'Obsessed with real-world operations',
];

const QUALITY_BAR = [
  { label: 'Real-time updates', icon: '⚡' },
  { label: 'Per-resort customization', icon: '🎨' },
  { label: 'Multi-tenant safety', icon: '🔒' },
  { label: 'Mobile-first guest experience', icon: '📱' },
];

export function AboutProductSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-400/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How we build Propera
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Deep product craft, not just marketing. Built by people who understand resort operations.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left - Principles */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold text-foreground mb-6">Built with resort teams</h3>
            <div className="space-y-4 mb-8">
              {BUILD_PRINCIPLES.map((principle, index) => (
                <motion.div
                  key={index}
                  initial={reducedMotion ? {} : { opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-start gap-3"
                >
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-foreground">{principle}</span>
                </motion.div>
              ))}
            </div>

            {/* Quality bar */}
            <div className="bg-card rounded-xl border border-border/50 p-4">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Quality bar</p>
              <div className="grid grid-cols-2 gap-3">
                {QUALITY_BAR.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span>{item.icon}</span>
                    <span className="text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right - Stack Diagram with glow */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative max-w-sm mx-auto lg:mx-0">
              {/* Vertical glow connector */}
              <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/50 via-primary/50 to-violet-500/50 rounded-full" />
                {!reducedMotion && (
                  <motion.div
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-b from-emerald-500 via-primary to-violet-500 rounded-full blur-md"
                  />
                )}
              </div>

              <div className="space-y-4">
                {/* Guest App Layer */}
                <motion.div
                  initial={reducedMotion ? {} : { opacity: 0, y: -10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  whileHover={reducedMotion ? {} : { scale: 1.02, y: -2 }}
                  className="relative"
                >
                  <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-xl border border-emerald-500/20 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                        <Smartphone className="h-6 w-6 text-emerald-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">Guest Experience</p>
                        <p className="text-xs text-muted-foreground">Pre-arrival • In-stay bookings • Itinerary • Loyalty</p>
                      </div>
                    </div>
                    {/* Mini UI preview */}
                    <div className="mt-3 grid grid-cols-3 gap-2">
                      <div className="h-3 rounded bg-emerald-500/20" />
                      <div className="h-3 rounded bg-emerald-500/15" />
                      <div className="h-3 rounded bg-emerald-500/10" />
                    </div>
                  </div>
                </motion.div>

                {/* Staff Console Layer */}
                <motion.div
                  initial={reducedMotion ? {} : { opacity: 0, y: -10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 }}
                  whileHover={reducedMotion ? {} : { scale: 1.02, y: -2 }}
                  className="relative"
                >
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Monitor className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">Staff Operations</p>
                        <p className="text-xs text-muted-foreground">Activities • Dining • Pre-arrival • Branding</p>
                      </div>
                    </div>
                    {/* Mini UI preview */}
                    <div className="mt-3 flex gap-2">
                      <div className="flex-1 h-8 rounded bg-primary/10 border border-primary/10" />
                      <div className="flex-1 h-8 rounded bg-primary/10 border border-primary/10" />
                    </div>
                  </div>
                </motion.div>

                {/* Admin Layer */}
                <motion.div
                  initial={reducedMotion ? {} : { opacity: 0, y: -10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.4 }}
                  whileHover={reducedMotion ? {} : { scale: 1.02, y: -2 }}
                >
                  <div className="bg-gradient-to-r from-violet-500/10 to-violet-500/5 rounded-xl border border-violet-500/20 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <BarChart3 className="h-6 w-6 text-violet-500" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">Portfolio Insights</p>
                        <p className="text-xs text-muted-foreground">Multi-resort • Feature flags • Advanced analytics</p>
                      </div>
                    </div>
                    {/* Mini chart preview */}
                    <div className="mt-3 flex items-end gap-1 h-6">
                      <div className="flex-1 h-3 rounded-t bg-violet-500/30" />
                      <div className="flex-1 h-4 rounded-t bg-violet-500/40" />
                      <div className="flex-1 h-5 rounded-t bg-violet-500/50" />
                      <div className="flex-1 h-6 rounded-t bg-violet-500" />
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Connection label */}
              <motion.div
                initial={reducedMotion ? {} : { opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="text-center mt-6"
              >
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-card px-4 py-2 rounded-full border border-border/50">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  All connected
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
