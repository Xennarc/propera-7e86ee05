import { Target, Smartphone, RefreshCw } from 'lucide-react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

const TRUST_CARDS = [
  {
    icon: Target,
    title: 'Operational clarity',
    description: 'Bookings, capacity, and schedules — presented with calm precision.',
  },
  {
    icon: Smartphone,
    title: 'Guest-first experience',
    description: 'Mobile-first flows that feel effortless for guests.',
  },
  {
    icon: RefreshCw,
    title: 'Reliable consistency',
    description: 'Staff and guest views stay aligned, so everyone trusts what they see.',
  },
];

export function PricingTrustSection() {
  return (
    <section className="py-16 md:py-20 bg-gradient-to-b from-muted/30 via-muted/20 to-primary/5 dark:from-muted/20 dark:via-muted/20 dark:to-muted/20 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/10 dark:bg-primary/4 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-teal-400/10 dark:bg-teal-400/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <RevealItem className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              Designed for real resort days.
            </h2>
          </RevealItem>

          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {TRUST_CARDS.map((card) => (
              <RevealItem key={card.title} className="value-card-premium text-center hover-lift-card group">
                <div className="icon-orb-gradient icon-orb-hover mx-auto mb-4">
                  <card.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{card.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
              </RevealItem>
            ))}
          </div>

          <RevealItem>
            <p className="text-xs text-muted-foreground text-center mt-8">
              Previews shown are illustrative.
            </p>
          </RevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}
