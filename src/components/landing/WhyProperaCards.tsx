import { BarChart3, Smartphone, RefreshCw, Check, ArrowRight } from 'lucide-react';
import { memo } from 'react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';
import { AnalyticsMiniCard } from '@/components/illustrations/AnalyticsMiniCard';

const cards = [
  {
    icon: BarChart3,
    title: 'Operational clarity',
    description: 'Schedules, capacity, and bookings presented with calm precision.',
    features: ['Real-time capacity', 'Smart scheduling', 'Clear dashboards'],
  },
  {
    icon: Smartphone,
    title: 'Guest-first experience',
    description: 'Mobile flows that guests actually enjoy using.',
    features: ['Intuitive booking', 'Beautiful UI', 'Fast & responsive'],
  },
  {
    icon: RefreshCw,
    title: 'Consistent & reliable',
    description: 'Staff and guest views stay aligned so everyone trusts what they see.',
    features: ['Live sync', 'Single source', 'No conflicts'],
  },
];

const FeatureCard = memo(function FeatureCard({
  card,
}: {
  card: typeof cards[0];
}) {
  return (
    <div className="flex-shrink-0 w-[240px] sm:w-auto bg-card border border-border/50 rounded-[20px] p-6">
      <div className="w-11 h-11 rounded-[13px] bg-primary/10 flex items-center justify-center mb-4">
        <card.icon className="h-[22px] w-[22px] text-primary" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2 tracking-[-0.2px]">{card.title}</h3>
      <p className="text-[13px] font-light leading-[1.65] text-muted-foreground">{card.description}</p>
    </div>
  );
});

export function WhyProperaCards() {
  return (
    <section className="py-20 relative overflow-hidden bg-card/30 border-t border-b border-border/50">
      <div className="container relative mx-auto px-4">
        <ScrollReveal>
          <RevealItem className="mb-8">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">Why Propera</p>
            <h2 className="font-serif text-[38px] font-bold leading-[1.05] tracking-[-1px] text-foreground mb-3.5">
              Designed for real resort days.
            </h2>
            <p className="text-[15px] font-light leading-[1.7] text-muted-foreground">
              Every feature built to make operations smoother and guests happier.
            </p>
          </RevealItem>

          {/* Analytics Card */}
          <RevealItem className="mb-7">
            <AnalyticsMiniCard className="w-full" />
          </RevealItem>

          {/* Feature Cards - horizontal scroll on mobile, grid on sm+ */}
          <div className="flex gap-3 overflow-x-auto scrollbar-hide mx-[-20px] px-5 py-1 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible">
            {cards.map((card) => (
              <FeatureCard key={card.title} card={card} />
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
