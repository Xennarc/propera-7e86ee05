import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, 
  Activity, 
  UtensilsCrossed, 
  Sparkles, 
  Plane, 
  MessageSquare, 
  BarChart3,
  Calendar,
  Users,
  Bell
} from 'lucide-react';
import { memo, useState } from 'react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';

const modules = [
  { 
    icon: Smartphone, 
    title: 'Guest Portal', 
    description: 'Mobile-first booking and itinerary', 
    category: 'Guest', 
    spotlight: true,
    preview: ['Browse activities', 'Book instantly', 'View schedule']
  },
  { 
    icon: Activity, 
    title: 'Activities & Experiences', 
    description: 'Sessions, capacity, and waitlists', 
    category: 'Ops', 
    spotlight: true,
    preview: ['Manage sessions', 'Track capacity', 'Handle waitlists']
  },
  { 
    icon: UtensilsCrossed, 
    title: 'Dining & Reservations', 
    description: 'Table management and special requests', 
    category: 'Ops',
    preview: ['Table layout', 'Time slots', 'Dietary notes']
  },
  { 
    icon: Sparkles, 
    title: 'Spa & Wellness', 
    description: 'Treatment bookings and availability', 
    category: 'Ops',
    preview: ['Therapist assign', 'Room booking', 'Packages']
  },
  { 
    icon: Plane, 
    title: 'Pre-arrival & Check-in', 
    description: 'Guest preferences before arrival', 
    category: 'Guest',
    preview: ['Preferences form', 'Arrival details', 'Special requests']
  },
  { 
    icon: MessageSquare, 
    title: 'Requests & Messaging', 
    description: 'Guest communication in one place', 
    category: 'Guest',
    preview: ['In-app chat', 'Request tracking', 'Notifications']
  },
  { 
    icon: BarChart3, 
    title: 'Analytics', 
    description: 'Clear insights that improve every day', 
    category: 'Analytics', 
    spotlight: true,
    preview: ['Booking trends', 'Revenue reports', 'Guest insights']
  },
];

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  Guest: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  Ops: { bg: 'bg-teal-400/10', text: 'text-teal-500', border: 'border-teal-400/20' },
  Analytics: { bg: 'bg-lagoon-500/10', text: 'text-lagoon-500', border: 'border-lagoon-500/20' },
};

const ModuleCard = memo(function ModuleCard({
  module,
  index,
  shouldAnimate,
  isHovered,
  onHover,
}: {
  module: typeof modules[0];
  index: number;
  shouldAnimate: boolean;
  isHovered: boolean;
  onHover: (index: number | null) => void;
}) {
  const isSpotlight = module.spotlight;
  const colors = categoryColors[module.category];
  
  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.05 }}
      className={`module-card-premium cursor-pointer group ${isSpotlight ? 'lg:col-span-1 ring-1 ring-primary/10' : ''}`}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="relative flex items-start gap-4">
        <motion.div 
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 ${
            isSpotlight 
              ? 'bg-gradient-to-br from-primary/15 to-teal-400/10 group-hover:from-primary/25 group-hover:to-teal-400/20' 
              : 'bg-muted/50 group-hover:bg-primary/10'
          }`}
          animate={isHovered && shouldAnimate ? { rotate: [0, -5, 5, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <module.icon className={`h-5 w-5 transition-colors ${isSpotlight ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
        </motion.div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{module.title}</h3>
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
              {module.category}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{module.description}</p>
          
          {/* Preview items on hover */}
          <AnimatePresence>
            {isHovered && module.preview && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 overflow-hidden"
              >
                <div className="flex flex-wrap gap-1.5">
                  {module.preview.map((item, i) => (
                    <motion.span
                      key={item}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="text-[10px] px-2 py-1 rounded-full bg-background/80 border border-border/40 text-muted-foreground"
                    >
                      {item}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});

// Floating UI fragments - static positioning, no infinite animation
function FloatingFragments() {
  const fragments = [
    { icon: Calendar, label: 'Today: 8 sessions', position: 'top-20 -left-4' },
    { icon: Users, label: '24 guests', position: 'top-1/3 -right-8' },
    { icon: Bell, label: '3 new requests', position: 'bottom-1/4 -left-6' },
  ];

  return (
    <>
      {fragments.map((fragment) => (
        <div
          key={fragment.label}
          className={`absolute ${fragment.position} hidden xl:flex items-center gap-2 px-3 py-2 rounded-lg bg-card/90 backdrop-blur-sm border border-border/40 shadow-lg z-10`}
        >
          <fragment.icon className="h-3.5 w-3.5 text-primary" />
          <span className="text-[10px] font-medium text-foreground">{fragment.label}</span>
        </div>
      ))}
    </>
  );
}

export function PlatformModules() {
  const { shouldAnimate } = useAnimationPreference();
  const [hoveredModule, setHoveredModule] = useState<number | null>(null);

  return (
    <section id="platform-overview" className="py-24 bg-background relative overflow-hidden">
      {/* TideGlow background */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/6 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-teal-400/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-lagoon-500/4 rounded-full blur-[100px] pointer-events-none" />

      <div className="container relative mx-auto px-4 z-10">
        <FloatingFragments />
        
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
            <ModuleCard 
              key={module.title} 
              module={module} 
              index={index} 
              shouldAnimate={shouldAnimate}
              isHovered={hoveredModule === index}
              onHover={setHoveredModule}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
