import { BarChart3, Smartphone, RefreshCw, Check, ArrowRight } from 'lucide-react';
import { memo } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const cards = [
  {
    icon: BarChart3,
    title: 'Operational clarity',
    description: 'Schedules, capacity, and bookings — presented with calm precision.',
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
    description: 'Staff and guest views stay aligned, so everyone trusts what they see.',
    features: ['Live sync', 'Single source', 'No conflicts'],
  },
];

const ValueCard = memo(function ValueCard({
  card,
  staggerIndex,
}: {
  card: typeof cards[0];
  staggerIndex: number;
}) {
  return (
    <div
      className={`group cursor-pointer stagger-${staggerIndex + 1}`}
    >
      <div className="value-card-premium stroke-gradient h-full">
        <div className="relative p-6">
          {/* Icon orb with gradient */}
          <div className="icon-orb-gradient icon-orb-hover text-primary mb-6">
            <card.icon className="h-7 w-7" />
        </div>
        
        <h3 className="text-xl font-semibold text-foreground mb-2">{card.title}</h3>
        <p className="text-muted-foreground leading-relaxed mb-4">{card.description}</p>

        {/* Feature list with CSS hover reveal */}
        <div className="preview-reveal space-y-2">
          {card.features.map((feature, i) => (
            <div
              key={feature}
              className={`flex items-center gap-2 text-sm preview-item-${i + 1}`}
            >
              <div className="hover-scale-icon">
                <Check className="h-3.5 w-3.5 text-success" />
              </div>
              <span className="text-muted-foreground">{feature}</span>
            </div>
          ))}
        </div>

        {/* Learn more hint on hover - CSS only */}
        <div className="learn-more-hint mt-4 flex items-center gap-1 text-xs text-primary font-medium">
          <span>Learn more</span>
          <ArrowRight className="h-3 w-3" />
        </div>
        </div>
      </div>
    </div>
  );
});

export function WhyProperaCards() {
  const { ref, revealed } = useScrollReveal();

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container relative mx-auto px-4">
        <div
          ref={ref}
          className={`section-reveal ${revealed ? 'section-revealed' : ''}`}
        >
          <div className="text-center mb-16 stagger-1">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Designed for real resort days.
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Every feature built to make operations smoother and guests happier.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {cards.map((card, index) => (
              <ValueCard
                key={card.title}
                card={card}
                staggerIndex={index + 1}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
