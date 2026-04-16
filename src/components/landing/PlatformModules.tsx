import { 
  Smartphone, 
  Activity, 
  UtensilsCrossed, 
  MessageSquare, 
  Car,
  Award,
} from 'lucide-react';
import { memo } from 'react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

const modules = [
  { 
    icon: Smartphone, 
    title: 'Guest Portal', 
    description: 'Room-based login, personalized dashboard, and one place for every booking and request — built for thumb-first use.', 
    category: 'Guest', 
  },
  { 
    icon: Activity, 
    title: 'Activities & Experiences', 
    description: 'Browse by category, pick a session with live availability, and book instantly — with policy-aware cutoffs.', 
    category: 'Ops', 
  },
  { 
    icon: UtensilsCrossed, 
    title: 'Dining Reservations', 
    description: 'Restaurant discovery with time-slot capacity and guest-friendly cancellation rules.', 
    category: 'Ops',
  },
  { 
    icon: MessageSquare, 
    title: 'Guest Requests', 
    description: 'Catalog-based service requests with multi-item bundling and real-time status from New to Completed.', 
    category: 'Guest',
  },
  { 
    icon: Car, 
    title: 'Transport Dispatch', 
    description: 'Pool requests into trips, assign drivers and buggies, manage stops, and keep clean ride history.', 
    category: 'Ops', 
  },
  { 
    icon: Award, 
    title: 'Loyalty & Feedback', 
    description: 'Points, tiers, benefits, and transaction history — plus structured stay feedback for continuous improvement.', 
    category: 'Analytics',
  },
];

const categoryTagStyles: Record<string, string> = {
  Guest: 'bg-primary/15 text-primary',
  Ops: 'bg-teal-400/12 text-teal-400',
  Analytics: 'bg-orchid-400/12 text-orchid-400',
};

const ModuleItem = memo(function ModuleItem({ module }: { module: typeof modules[0] }) {
  const tagStyle = categoryTagStyles[module.category] || '';
  return (
    <RevealItem>
      <div className="flex items-start gap-4 py-5 border-b border-border/50 last:border-b-0">
        <div className="w-[42px] h-[42px] rounded-[13px] bg-card flex items-center justify-center shrink-0">
          <module.icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[15px] font-semibold text-foreground tracking-[-0.2px]">{module.title}</h3>
            <span className={`text-[10px] font-semibold tracking-[0.4px] uppercase px-2 py-0.5 rounded-full ${tagStyle}`}>
              {module.category}
            </span>
          </div>
          <p className="text-[13px] font-light leading-[1.6] text-muted-foreground">{module.description}</p>
        </div>
      </div>
    </RevealItem>
  );
});

export function PlatformModules() {
  return (
    <section id="platform-overview" className="py-[60px] relative overflow-hidden">
      <div className="container relative mx-auto px-4 z-10">
        <ScrollReveal>
          <RevealItem className="mb-7">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">Platform</p>
            <h2 className="font-serif text-[38px] font-bold leading-[1.05] tracking-[-1px] text-foreground mb-3.5">
              Everything in<br />one place.
            </h2>
            <p className="text-[15px] font-light leading-[1.7] text-muted-foreground">
              Pick what you need today. Grow into more later.
            </p>
          </RevealItem>

          <div>
            {modules.map(m => (
              <ModuleItem key={m.title} module={m} />
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

export default PlatformModules;
