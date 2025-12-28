import { motion } from 'framer-motion';
import { Target, Smartphone, RefreshCw } from 'lucide-react';

const TRUST_CARDS = [
  {
    icon: Target,
    title: 'Operational clarity',
    description: 'Bookings, capacity, and schedules — presented with calm precision.',
  },
  {
    icon: Smartphone,
    title: 'Guest-first experience',
    description: 'Mobile-first flows that feel effortless for guests.',
  },
  {
    icon: RefreshCw,
    title: 'Reliable consistency',
    description: 'Staff and guest views stay aligned, so everyone trusts what they see.',
  },
];

export function PricingTrustSection() {
  return (
    <section className="py-16 md:py-20 bg-muted/20 relative overflow-hidden">
      {/* TideGlow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/4 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Designed for real resort days.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {TRUST_CARDS.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="value-card-premium text-center"
            >
              <div className="icon-orb-gradient mx-auto mb-4">
                <card.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{card.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-xs text-muted-foreground text-center mt-8"
        >
          Previews shown are illustrative.
        </motion.p>
      </div>
    </section>
  );
}
