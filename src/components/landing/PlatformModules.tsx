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
  { icon: Smartphone, title: 'Guest Portal', description: 'Mobile-first booking and itinerary', category: 'Guest', spotlight: true },
  { icon: Activity, title: 'Activities & Experiences', description: 'Sessions, capacity, and waitlists', category: 'Ops', spotlight: true },
  { icon: UtensilsCrossed, title: 'Dining & Reservations', description: 'Table management and special requests', category: 'Ops' },
  { icon: Sparkles, title: 'Spa & Wellness', description: 'Treatment bookings and availability', category: 'Ops' },
  { icon: Plane, title: 'Pre-arrival & Check-in', description: 'Guest preferences before arrival', category: 'Guest' },
  { icon: MessageSquare, title: 'Requests & Messaging', description: 'Guest communication in one place', category: 'Guest' },
  { icon: BarChart3, title: 'Analytics', description: 'Clear insights that improve every day', category: 'Analytics', spotlight: true },
];

const categoryColors: Record<string, string> = {
  Guest: 'bg-primary/10 text-primary border-primary/20',
  Ops: 'bg-teal-400/10 text-teal-500 border-teal-400/20',
  Analytics: 'bg-lagoon-500/10 text-lagoon-500 border-lagoon-500/20',
};

const ModuleCard = memo(function ModuleCard({
  module,
  index,
  shouldAnimate,
}: {
  module: typeof modules[0];
  index: number;
  shouldAnimate: boolean;
}) {
  const isSpotlight = module.spotlight;
  
  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className={`module-card-premium cursor-pointer group ${isSpotlight ? 'lg:col-span-1 ring-1 ring-primary/10' : ''}`}
    >
      <div className="relative flex items-start gap-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
          isSpotlight 
            ? 'bg-gradient-to-br from-primary/15 to-teal-400/10 group-hover:from-primary/25 group-hover:to-teal-400/20' 
            : 'bg-muted/50 group-hover:bg-primary/10'
        }`}>
          <module.icon className={`h-5 w-5 transition-colors ${isSpotlight ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{module.title}</h3>
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${categoryColors[module.category]}`}>
              {module.category}
            </span>
          </div>
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
      {/* TideGlow background */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/6 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-400/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-lagoon-500/4 rounded-full blur-[100px] pointer-events-none" />

      <div className="container relative mx-auto px-4 z-10">
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
