import { motion } from 'framer-motion';
import { Check, Minus } from 'lucide-react';

const COMPARISON_ROWS = [
  { label: 'Guest Portal', essential: true, professional: true, elite: true },
  { label: 'Staff Console', essential: true, professional: true, elite: true },
  { label: 'Experiences & Activities', essential: true, professional: true, elite: true },
  { label: 'Dining', essential: false, professional: true, elite: true },
  { label: 'Analytics', essential: false, professional: true, elite: true },
  { label: 'White-label options', essential: false, professional: false, elite: true },
  { label: 'Priority support', essential: false, professional: false, elite: true },
];

export function PricingComparisonMatrix() {
  return (
    <section className="py-16 md:py-20 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            At a glance
          </h2>
          <p className="text-muted-foreground">
            A quick view of what's included in each plan.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/30 border-b border-border/50">
              <div className="text-sm font-medium text-muted-foreground">Feature</div>
              <div className="text-sm font-semibold text-foreground text-center">Essential</div>
              <div className="text-sm font-semibold text-primary text-center">Professional</div>
              <div className="text-sm font-semibold text-violet-500 text-center">Elite</div>
            </div>

            {/* Rows */}
            {COMPARISON_ROWS.map((row, index) => (
              <div 
                key={row.label}
                className={`grid grid-cols-4 gap-4 p-4 ${
                  index !== COMPARISON_ROWS.length - 1 ? 'border-b border-border/30' : ''
                }`}
              >
                <div className="text-sm text-foreground">{row.label}</div>
                <div className="flex justify-center">
                  {row.essential ? (
                    <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center">
                      <Check className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex justify-center">
                  {row.professional ? (
                    <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex justify-center">
                  {row.elite ? (
                    <div className="h-5 w-5 rounded-full bg-violet-500/15 flex items-center justify-center">
                      <Check className="h-3 w-3 text-violet-500" />
                    </div>
                  ) : (
                    <Minus className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Full details are in the plan cards above.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
