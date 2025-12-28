import { motion } from 'framer-motion';
import { BarChart3, Smartphone, RefreshCw } from 'lucide-react';
import { memo } from 'react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';

const cards = [
  {
    icon: BarChart3,
    title: 'Operational clarity',
    description: 'Schedules, capacity, and bookings — presented with calm precision.',
  },
  {
    icon: Smartphone,
    title: 'Guest-first experience',
    description: 'Mobile flows that guests actually enjoy using.',
  },
  {
    icon: RefreshCw,
    title: 'Consistent & reliable',
    description: 'Staff and guest views stay aligned, so everyone trusts what they see.',
  },
];

const ValueCard = memo(function ValueCard({
  card,
  index,
  shouldAnimate,
}: {
  card: typeof cards[0];
  index: number;
  shouldAnimate: boolean;
}) {
  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="value-card-premium"
    >
      <div className="relative">
        <div className="icon-orb-gradient text-primary mb-6">
          <card.icon className="h-7 w-7" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">{card.title}</h3>
        <p className="text-muted-foreground leading-relaxed">{card.description}</p>
      </div>
    </motion.div>
  );
});

export function WhyProperaCards() {
  const { shouldAnimate } = useAnimationPreference();

  return (
    <section className="py-24 bg-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Designed for real resort days.
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {cards.map((card, index) => (
            <ValueCard
              key={card.title}
              card={card}
              index={index}
              shouldAnimate={shouldAnimate}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
