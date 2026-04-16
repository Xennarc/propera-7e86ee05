import { Check, Minus } from 'lucide-react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';

const COMPARISON_ROWS = [
  { label: 'Guest Portal + Staff Console', essential: true, professional: true, elite: true },
  { label: 'Activities, excursions & spa', essential: true, professional: true, elite: true },
  { label: 'Pre-arrival profiles', essential: true, professional: true, elite: true },
  { label: 'Dining reservations', essential: false, professional: true, elite: true },
  { label: 'Room service & housekeeping', essential: false, professional: true, elite: true },
  { label: 'Department views & scheduling', essential: false, professional: true, elite: true },
  { label: 'Loyalty programs', essential: false, professional: false, elite: true },
  { label: 'Advanced analytics', essential: false, professional: false, elite: true },
  { label: 'Multi-property governance', essential: false, professional: false, elite: true },
];

export function PricingComparisonMatrix() {
  return (
    <section className="py-[60px] relative overflow-hidden border-t border-border/50">
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <RevealItem className="text-center mb-6 md:mb-10">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">Comparison</p>
            <h2 className="font-serif text-[32px] md:text-[38px] font-bold leading-[1.05] tracking-[-1px] text-foreground mb-2 md:mb-3">
              At a glance
            </h2>
            <p className="text-[15px] font-light leading-[1.65] text-muted-foreground">
              A quick view of what's included in each plan.
            </p>
          </RevealItem>

          <RevealItem className="max-w-3xl mx-auto">
            <p className="text-xs text-muted-foreground text-center mb-3 sm:hidden">
              ← Swipe to see all plans →
            </p>
            
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="lagoon-glass rounded-2xl overflow-hidden min-w-[480px] sm:min-w-0">
                <div className="grid grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 bg-muted/20 border-b border-border/30">
                  <div className="text-xs sm:text-sm font-medium text-muted-foreground">Feature</div>
                  <div className="text-xs sm:text-sm font-semibold text-foreground text-center">Essential</div>
                  <div className="text-xs sm:text-sm font-semibold text-primary text-center relative">
                    <span className="relative z-10">Professional</span>
                    <div className="absolute inset-0 bg-primary/5 -mx-2 rounded-t-lg" />
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-violet-500 text-center relative">
                    <span className="relative z-10">Elite</span>
                    <div className="absolute inset-0 bg-violet-500/5 -mx-2 rounded-t-lg" />
                  </div>
                </div>

                {COMPARISON_ROWS.map((row, index) => (
                  <div 
                    key={row.label}
                    className={`grid grid-cols-4 gap-2 sm:gap-4 p-3 sm:p-4 transition-colors hover:bg-muted/10 ${
                      index !== COMPARISON_ROWS.length - 1 ? 'border-b border-border/20' : ''
                    }`}
                  >
                    <div className="text-xs sm:text-sm text-foreground">{row.label}</div>
                    <div className="flex justify-center">
                      {row.essential ? (
                        <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-muted/60 flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                        </div>
                      ) : (
                        <Minus className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex justify-center relative">
                      <div className="absolute inset-0 bg-primary/5 -mx-2" />
                      {row.professional ? (
                        <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-primary/15 flex items-center justify-center relative z-10">
                          <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                        </div>
                      ) : (
                        <Minus className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground/30 relative z-10" />
                      )}
                    </div>
                    <div className="flex justify-center relative">
                      <div className="absolute inset-0 bg-violet-500/5 -mx-2" />
                      {row.elite ? (
                        <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-violet-500/15 flex items-center justify-center relative z-10">
                          <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-violet-500" />
                        </div>
                      ) : (
                        <Minus className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground/30 relative z-10" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Full details are in the plan cards above.
            </p>
          </RevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}
