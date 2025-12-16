import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, PieChart } from 'lucide-react';

const METRICS = [
  {
    icon: TrendingDown,
    metric: 'Up to 30%',
    label: 'fewer front desk calls',
    description: 'Guests self-serve bookings and get answers instantly.',
    visual: (
      <div className="flex items-end gap-1 h-16">
        <div className="w-6 h-14 rounded-t bg-muted/50" />
        <div className="w-6 h-12 rounded-t bg-muted/50" />
        <div className="w-6 h-10 rounded-t bg-primary/30" />
        <div className="w-6 h-7 rounded-t bg-primary/50" />
        <div className="w-6 h-5 rounded-t bg-primary" />
      </div>
    ),
  },
  {
    icon: TrendingUp,
    metric: 'Up to 20%',
    label: 'more pre-booked experiences',
    description: 'Pre-arrival links and in-stay suggestions drive bookings.',
    visual: (
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="h-10 w-10 rounded bg-muted/30 mb-1" />
          <span className="text-[10px] text-muted-foreground">Before</span>
        </div>
        <div className="text-muted-foreground">→</div>
        <div className="text-center">
          <div className="h-14 w-14 rounded bg-primary/50 mb-1 flex items-center justify-center">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <span className="text-[10px] text-primary">After</span>
        </div>
      </div>
    ),
  },
  {
    icon: PieChart,
    metric: 'Higher',
    label: 'activity & restaurant utilisation',
    description: 'Fill more seats with better visibility and upsell tools.',
    visual: (
      <div className="relative h-16 w-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            className="stroke-muted/30"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="15.9"
            fill="none"
            className="stroke-primary"
            strokeWidth="3"
            strokeDasharray="75, 100"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-primary">75%</span>
        </div>
      </div>
    ),
  },
];

export function PricingValueSection() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why resorts invest in Propera
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real outcomes from connected operations and better guest journeys.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-12">
          {METRICS.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-card rounded-2xl border border-border/50 p-6 text-center"
            >
              <div className="flex justify-center mb-4">
                {item.visual}
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <item.icon className="h-5 w-5 text-primary" />
                <span className="text-3xl font-bold text-foreground">{item.metric}</span>
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-muted-foreground max-w-2xl mx-auto"
        >
          Plans scale with you—from a single resort to a global portfolio—delivering better guest journeys and clearer operations at every tier.
        </motion.p>
      </div>
    </section>
  );
}
