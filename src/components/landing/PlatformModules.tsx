import { 
  Smartphone, 
  Activity, 
  UtensilsCrossed, 
  MessageSquare, 
  Car,
  Navigation,
  Award,
  Calendar,
  Users,
  Bell
} from 'lucide-react';
import { memo } from 'react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';
import { NotificationStreamShowcase } from '@/components/illustrations/NotificationStreamShowcase';

const modules = [
  { 
    icon: Smartphone, 
    title: 'Guest Portal', 
    description: 'Room-based login, personalized dashboard, and one place for every booking and request — built for thumb-first use.', 
    category: 'Guest', 
    spotlight: true,
    preview: ['Pre-arrival wizard', 'My Bookings hub', 'In-app notifications']
  },
  { 
    icon: Activity, 
    title: 'Activities & Experiences', 
    description: 'Browse by category, pick a session with live availability, and book instantly — with policy-aware cutoffs.', 
    category: 'Ops', 
    spotlight: true,
    preview: ['Session availability', 'Capacity & waitlists', 'Safety & "Good to know"']
  },
  { 
    icon: UtensilsCrossed, 
    title: 'Dining Reservations', 
    description: 'Restaurant discovery with time-slot capacity, reservation management, and guest-friendly cancellation rules.', 
    category: 'Ops',
    preview: ['Slot scheduling', 'Closure days', 'Cancellation cutoffs']
  },
  { 
    icon: MessageSquare, 
    title: 'Guest Requests', 
    description: 'Catalog-based service requests with multi-item bundling and real-time status from "New" to "Completed".', 
    category: 'Guest',
    preview: ['SLA lanes', 'Timeline events', 'Department views']
  },
  { 
    icon: Car, 
    title: 'Transport Dispatch', 
    description: 'Pool requests into trips, assign drivers and buggies, manage stops, and keep clean ride history.', 
    category: 'Ops', 
    spotlight: true,
    preview: ['Trip pooling', 'Driver assignment', 'Setup wizard']
  },
  { 
    icon: Navigation, 
    title: 'Driver Portal', 
    description: 'Driver status, assigned vehicle, live trip runner state machine, and a debug console for field diagnostics.', 
    category: 'Ops',
    preview: ['GPS/offline banner', 'Trip history', 'Action microcopy']
  },
  { 
    icon: Award, 
    title: 'Loyalty & Feedback', 
    description: 'Points, tiers, benefits, and transaction history — plus structured stay feedback for continuous improvement.', 
    category: 'Analytics',
    preview: ['Tier progress', 'Rewards rules', 'NPS-style prompts']
  },
];

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  Guest: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20' },
  Ops: { bg: 'bg-teal-400/10', text: 'text-teal-500', border: 'border-teal-400/20' },
  Analytics: { bg: 'bg-lagoon-500/10', text: 'text-lagoon-500', border: 'border-lagoon-500/20' },
};

const ModuleCard = memo(function ModuleCard({
  module,
}: {
  module: typeof modules[0];
}) {
  const isSpotlight = module.spotlight;
  const colors = categoryColors[module.category];
  
  return (
    <RevealItem
      className={`module-card-premium cursor-pointer group hover-lift-card ${isSpotlight ? 'lg:col-span-1 ring-1 ring-primary/10' : ''}`}
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
    </RevealItem>
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
  return (
    <section id="platform-overview" className="py-16 md:py-24 relative overflow-hidden">
      <div className="container relative mx-auto px-4 z-10">
        <FloatingFragments />
        
        <ScrollReveal>
          <RevealItem className="text-center mb-10 md:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 md:mb-4">Everything in one place.</h2>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">Pick what you need today. Grow into more later.</p>
          </RevealItem>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
              {modules.map((module) => (
                <ModuleCard key={module.title} module={module} />
              ))}
            </div>

            <RevealItem className="hidden lg:flex items-start justify-center pt-4">
              <NotificationStreamShowcase />
            </RevealItem>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

export default PlatformModules;
