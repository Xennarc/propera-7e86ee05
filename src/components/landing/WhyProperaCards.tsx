import { motion } from 'framer-motion';
import { BarChart3, Smartphone, RefreshCw, Check, ArrowRight } from 'lucide-react';
import { memo, useState } from 'react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';

const cards = [
  {
    icon: BarChart3,
    title: 'Operational clarity',
    description: 'Schedules, capacity, and bookings — presented with calm precision.',
    features: ['Real-time capacity', 'Smart scheduling', 'Clear dashboards'],
    color: 'primary',
  },
  {
    icon: Smartphone,
    title: 'Guest-first experience',
    description: 'Mobile flows that guests actually enjoy using.',
    features: ['Intuitive booking', 'Beautiful UI', 'Fast & responsive'],
    color: 'teal',
  },
  {
    icon: RefreshCw,
    title: 'Consistent & reliable',
    description: 'Staff and guest views stay aligned, so everyone trusts what they see.',
    features: ['Live sync', 'Single source', 'No conflicts'],
    color: 'lagoon',
  },
];

const ValueCard = memo(function ValueCard({
  card,
  index,
  shouldAnimate,
  isHovered,
  onHover,
}: {
  card: typeof cards[0];
  index: number;
  shouldAnimate: boolean;
  isHovered: boolean;
  onHover: (index: number | null) => void;
}) {
  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="value-card-premium group cursor-pointer"
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="relative">
        {/* Animated icon orb */}
        <motion.div 
          className="icon-orb-gradient text-primary mb-6"
          animate={isHovered && shouldAnimate ? { 
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0]
          } : {}}
          transition={{ duration: 0.5 }}
        >
          <card.icon className="h-7 w-7" />
        </motion.div>
        
        <h3 className="text-xl font-semibold text-foreground mb-2">{card.title}</h3>
        <p className="text-muted-foreground leading-relaxed mb-4">{card.description}</p>

        {/* Feature list with staggered animation */}
        <motion.div 
          className="space-y-2"
          initial="hidden"
          animate={isHovered ? "visible" : "hidden"}
        >
          {card.features.map((feature, i) => (
            <motion.div
              key={feature}
              variants={{
                hidden: { opacity: 0.5, x: 0 },
                visible: { opacity: 1, x: 0 }
              }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-2 text-sm"
            >
              <motion.div
                animate={isHovered && shouldAnimate ? { scale: [1, 1.2, 1] } : {}}
                transition={{ delay: i * 0.1 }}
              >
                <Check className="h-3.5 w-3.5 text-success" />
              </motion.div>
              <span className="text-muted-foreground">{feature}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Learn more hint on hover */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
          transition={{ duration: 0.2 }}
          className="mt-4 flex items-center gap-1 text-xs text-primary font-medium"
        >
          <span>Learn more</span>
          <ArrowRight className="h-3 w-3" />
        </motion.div>
      </div>
    </motion.div>
  );
});

export function WhyProperaCards() {
  const { shouldAnimate } = useAnimationPreference();
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  return (
    <section className="py-24 bg-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      
      {/* Static decorative elements - no infinite animations */}
      <div className="absolute top-20 left-[15%] w-20 h-20 rounded-full bg-primary/5 blur-xl pointer-events-none" />
      <div className="absolute bottom-20 right-[20%] w-32 h-32 rounded-full bg-teal-400/5 blur-xl pointer-events-none" />

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
          <p className="text-muted-foreground max-w-xl mx-auto">
            Every feature built to make operations smoother and guests happier.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {cards.map((card, index) => (
            <ValueCard
              key={card.title}
              card={card}
              index={index}
              shouldAnimate={shouldAnimate}
              isHovered={hoveredCard === index}
              onHover={setHoveredCard}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
