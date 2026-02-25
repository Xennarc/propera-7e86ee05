import { Globe } from 'lucide-react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';
import { GuestJourneyFlow } from '@/components/illustrations/GuestJourneyFlow';
import { MultiResortShowcase } from '@/components/illustrations/MultiResortShowcase';

const regionChips = ['Island resorts', 'City resorts', 'Mountain retreats', 'Boutique hotels', 'Beach clubs'];

export function GlobalReady() {
  return (
    <section className="py-24 relative overflow-hidden">
      
      {/* Decorative globe wireframe */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
          <ellipse cx="100" cy="100" rx="80" ry="30" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
          <ellipse cx="100" cy="100" rx="80" ry="50" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
          <ellipse cx="100" cy="100" rx="30" ry="80" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
          <ellipse cx="100" cy="100" rx="50" ry="80" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
          <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
          <line x1="100" y1="20" x2="100" y2="180" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
        </svg>
      </div>

      <div className="container relative mx-auto px-4">
        <ScrollReveal>
          <RevealItem className="max-w-3xl mx-auto text-center mb-12">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-teal-400/10 flex items-center justify-center text-primary mx-auto mb-8 shadow-lg shadow-primary/10">
              <Globe className="h-8 w-8" />
            </div>

            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Built for resorts worldwide.</h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              From boutique hideaways to multi-property groups — Propera keeps the experience consistent.
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {regionChips.map((chip) => (
                <span key={chip} className="glass-pill chip-stagger">
                  {chip}
                </span>
              ))}
            </div>
          </RevealItem>

          <RevealItem className="flex justify-center mb-12">
            <MultiResortShowcase className="max-w-[260px]" />
          </RevealItem>

          <div className="max-w-xs mx-auto mb-12">
            <div className="h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
          </div>

          <RevealItem className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">End-to-end experience</p>
              <h3 className="text-lg font-semibold text-foreground">The guest journey, seamlessly connected</h3>
            </div>
            <GuestJourneyFlow />
          </RevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}

export default GlobalReady;
