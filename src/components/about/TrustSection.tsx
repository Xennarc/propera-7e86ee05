import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Eye, Smartphone, RefreshCw } from 'lucide-react';

const TRUST_CARDS = [
  {
    icon: Eye,
    title: 'Clear operations',
    description: 'Schedules, capacity, and requests — in one view.',
  },
  {
    icon: Smartphone,
    title: 'Guest-friendly',
    description: 'Mobile-first flows that reduce front desk friction.',
  },
  {
    icon: RefreshCw,
    title: 'Consistent sync',
    description: 'Staff and guest views stay aligned.',
  },
];

export function TrustSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="py-24 md:py-32 bg-card relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/3 rounded-full blur-[200px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Reliable by design.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for the complexity of real resort days.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {TRUST_CARDS.map((card, index) => (
            <motion.div
              key={card.title}
              initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={reducedMotion ? {} : { y: -4 }}
              className="group"
            >
              <div className="bg-background rounded-2xl border border-border/50 p-8 text-center h-full transition-all duration-300 hover:shadow-lg hover:border-primary/30">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:scale-110 transition-all">
                  <card.icon className="h-7 w-7 text-primary group-hover:text-primary-foreground transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">{card.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{card.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Disclaimer */}
        <motion.p
          initial={reducedMotion ? {} : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground mt-12"
        >
          Illustrations are conceptual.
        </motion.p>
      </div>
    </section>
  );
}
