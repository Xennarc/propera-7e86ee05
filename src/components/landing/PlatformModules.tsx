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
import { memo } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { NotificationStreamShowcase } from '@/components/illustrations/NotificationStreamShowcase';

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
  staggerIndex,
}: {
  module: typeof modules[0];
  staggerIndex: number;
}) {
  const isSpotlight = module.spotlight;
  const colors = categoryColors[module.category];
  
  return (
    <div
      className={`module-card-premium cursor-pointer group hover-lift-card stagger-${staggerIndex} ${isSpotlight ? 'lg:col-span-1 ring-1 ring-primary/10' : ''}`}
    >
      <div className="relative flex items-start gap-4">
        <div 
          className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 icon-orb-hover ${
            isSpotlight 
              ? 'bg-gradient-to-br from-primary/15 to-teal-400/10 group-hover:from-primary/25 group-hover:to-teal-400/20' 
              : 'bg-muted/50 group-hover:bg-primary/10'
          }`}
        >
          <module.icon className={`h-5 w-5 transition-colors ${isSpotlight ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-foreground">{module.title}</h3>
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${colors.bg} ${colors.text} ${colors.border}`}>
              {module.category}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{module.description}</p>
          
          {/* Preview items with CSS hover reveal */}
          {module.preview && (
            <div className="preview-reveal mt-3">
              <div className="flex flex-wrap gap-1.5">
                {module.preview.map((item, i) => (
                  <span
                    key={item}
                    className={`text-[10px] px-2 py-1 rounded-full bg-background/80 border border-border/40 text-muted-foreground preview-item-${i + 1}`}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

// Floating UI fragments - static
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
  const { ref, revealed } = useScrollReveal();

  return (
    <section id="platform-overview" className="py-16 md:py-24 relative overflow-hidden">
      <div className="container relative mx-auto px-4 z-10">
        <FloatingFragments />
        
        <div
          ref={ref}
          className={`section-reveal ${revealed ? 'section-revealed' : ''}`}
        >
          <div className="text-center mb-10 md:mb-16 stagger-1">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">Everything in one place.</h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">Pick what you need today. Grow into more later.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 max-w-6xl mx-auto">
            {/* Module cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {modules.map((module, index) => (
                <ModuleCard 
                  key={module.title} 
                  module={module} 
                  staggerIndex={Math.min(index + 2, 7)}
                />
              ))}
            </div>

            {/* Notification Stream Showcase - Desktop only (no mobile duplicate) */}
            <div className="hidden lg:flex items-start justify-center pt-4 stagger-8">
              <NotificationStreamShowcase />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PlatformModules;
