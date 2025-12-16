import { motion } from 'framer-motion';
import { Check, Smartphone, Monitor, BarChart3 } from 'lucide-react';

const BUILD_PRINCIPLES = [
  'Co-design with resort teams',
  'Feature flags and plan tiers for flexibility',
  'Obsession with real-world operations',
  'Capacity, timing, multi-resort—we think in resort terms',
];

export function AboutProductSection() {
  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Inside the product
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Deep product craft, not just marketing. Built by people who understand resort operations.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          {/* Left - How we build */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h3 className="text-2xl font-bold text-foreground mb-6">How we build Propera</h3>
            <div className="space-y-4">
              {BUILD_PRINCIPLES.map((principle, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
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
          </motion.div>

          {/* Right - Stack Diagram */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="space-y-4">
              {/* Guest App Layer */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-xl border border-emerald-500/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Guest App</p>
                      <p className="text-xs text-muted-foreground">Pre-arrival • In-stay bookings • Itinerary • Loyalty</p>
                    </div>
                  </div>
                </div>
                {/* Connector */}
                <div className="absolute left-1/2 -bottom-4 w-0.5 h-4 bg-border" />
              </motion.div>

              {/* Staff Console Layer */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="relative"
              >
                <div className="bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-xl border border-blue-500/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <Monitor className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Staff Console</p>
                      <p className="text-xs text-muted-foreground">Operations • Activities • Dining • Pre-arrival • Loyalty</p>
                    </div>
                  </div>
                </div>
                {/* Connector */}
                <div className="absolute left-1/2 -bottom-4 w-0.5 h-4 bg-border" />
              </motion.div>

              {/* Admin Layer */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <div className="bg-gradient-to-r from-violet-500/10 to-violet-500/5 rounded-xl border border-violet-500/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Admin & Analytics</p>
                      <p className="text-xs text-muted-foreground">Portfolio control • Feature flags • Advanced reporting</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Connection label */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
              className="absolute -right-4 top-1/2 -translate-y-1/2 bg-primary/10 text-primary text-xs font-medium px-3 py-1.5 rounded-full border border-primary/20"
            >
              All connected
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
