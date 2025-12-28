import { motion } from 'framer-motion';
import { 
  Smartphone, 
  Activity, 
  UtensilsCrossed, 
  Sparkles, 
  Plane, 
  MessageSquare, 
  BarChart3 
} from 'lucide-react';
import { memo } from 'react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';

const modules = [
  { icon: Smartphone, title: 'Guest Portal', description: 'Mobile-first booking and itinerary' },
  { icon: Activity, title: 'Activities & Experiences', description: 'Sessions, capacity, and waitlists' },
  { icon: UtensilsCrossed, title: 'Dining & Reservations', description: 'Table management and special requests' },
  { icon: Sparkles, title: 'Spa & Wellness', description: 'Treatment bookings and availability' },
  { icon: Plane, title: 'Pre-arrival & Check-in', description: 'Guest preferences before arrival' },
  { icon: MessageSquare, title: 'Requests & Messaging', description: 'Guest communication in one place' },
  { icon: BarChart3, title: 'Analytics', description: 'Clear insights that improve every day' },
];

const ModuleCard = memo(function ModuleCard({
  module,
  index,
  shouldAnimate,
}: {
  module: typeof modules[0];
  index: number;
  shouldAnimate: boolean;
}) {
  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className="module-card-premium cursor-pointer"
    >
      <div className="relative flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors shrink-0">
          <module.icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground mb-1">{module.title}</h3>
          <p className="text-sm text-muted-foreground">{module.description}</p>
        </div>
      </div>
    </motion.div>
  );
});

export function PlatformModules() {
  const { shouldAnimate } = useAnimationPreference();

  return (
    <section id="platform-overview" className="py-24 bg-background relative overflow-hidden">
      <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] bg-teal-400/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Everything in one place.</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Pick what you need today. Grow into more later.</p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-w-6xl mx-auto">
          {modules.map((module, index) => (
            <ModuleCard key={module.title} module={module} index={index} shouldAnimate={shouldAnimate} />
          ))}
        </div>
      </div>
    </section>
  );
}
