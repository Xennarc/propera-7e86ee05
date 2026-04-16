import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';
import { GuestJourneyFlow } from '@/components/illustrations/GuestJourneyFlow';
import { MultiResortShowcase } from '@/components/illustrations/MultiResortShowcase';

const regionChips = ['Island resorts', 'City resorts', 'Mountain retreats', 'Boutique hotels', 'Beach clubs'];

export function GlobalReady() {
  return (
    <section className="py-[60px] relative overflow-hidden">
      <div className="container relative mx-auto px-4">
        <ScrollReveal>
          {/* Scale section */}
          <RevealItem className="mb-8">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">Scale</p>
            <h2 className="font-serif text-[38px] font-bold leading-[1.05] tracking-[-1px] text-foreground mb-3.5">
              Built for resorts worldwide.
            </h2>
            <p className="text-[15px] font-light leading-[1.7] text-muted-foreground max-w-md">
              From boutique hideaways to multi-property groups — Propera keeps the experience consistent.
            </p>
          </RevealItem>

          <RevealItem className="flex justify-center mb-8">
            <MultiResortShowcase className="max-w-[280px]" />
          </RevealItem>

          <RevealItem className="flex flex-wrap gap-2 mb-12">
            {regionChips.map((chip) => (
              <span key={chip} className="glass-pill chip-stagger">
                {chip}
              </span>
            ))}
          </RevealItem>

          {/* Divider */}
          <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent mb-12" />

          {/* End-to-end section */}
          <RevealItem className="max-w-4xl mx-auto">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">End-to-end</p>
            <h3 className="font-serif text-[28px] font-bold leading-[1.05] tracking-[-0.5px] text-foreground mb-6">
              The guest journey,<br />seamlessly connected
            </h3>
            <GuestJourneyFlow />
          </RevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}

export default GlobalReady;
