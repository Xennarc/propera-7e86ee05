import { Check } from 'lucide-react';
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

function Mark({ included }: { included: boolean }) {
  if (included) {
    return <Check className="h-4 w-4 text-primary mx-auto" strokeWidth={2.25} />;
  }
  return <span className="text-muted-foreground/40 text-sm">—</span>;
}

export function PricingComparisonMatrix() {
  return (
    <section className="py-[60px] relative overflow-hidden border-t border-border/50">
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <RevealItem className="text-center mb-8 md:mb-10">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">
              What's in each plan
            </p>
            <h2 className="font-serif text-[32px] md:text-[40px] font-bold leading-[1.05] tracking-[-1px] text-foreground">
              At a glance.
            </h2>
          </RevealItem>

          <RevealItem className="max-w-3xl mx-auto">
            {/* Scroll container with right-edge fade mask */}
            <div className="relative">
              <div
                className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0"
                style={{
                  maskImage: 'linear-gradient(to right, black 0%, black 92%, transparent 100%)',
                  WebkitMaskImage: 'linear-gradient(to right, black 0%, black 92%, transparent 100%)',
                }}
              >
                <div className="relative min-w-[520px] sm:min-w-0">
                  {/* Continuous Professional column tint — single shape behind everything */}
                  <div
                    aria-hidden
                    className="absolute top-0 bottom-0 bg-primary/[0.05] rounded-xl pointer-events-none"
                    style={{ left: 'calc(25% + 50%/3)', width: 'calc(50%/3)' }}
                  />

                  {/* Header */}
                  <div className="grid grid-cols-4 gap-2 sm:gap-4 px-3 sm:px-5 py-4 border-b border-border/60 relative">
                    <div className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase">
                      Feature
                    </div>
                    <div className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase text-center">
                      Essential
                    </div>
                    <div className="text-[11px] font-semibold text-primary tracking-wider uppercase text-center">
                      Professional
                    </div>
                    <div className="text-[11px] font-semibold text-muted-foreground tracking-wider uppercase text-center">
                      Elite
                    </div>
                  </div>

                  {/* Rows */}
                  {COMPARISON_ROWS.map((row, index) => (
                    <div
                      key={row.label}
                      className={`grid grid-cols-4 gap-2 sm:gap-4 px-3 sm:px-5 py-3.5 relative ${
                        index !== COMPARISON_ROWS.length - 1 ? 'border-b border-border/30' : ''
                      }`}
                    >
                      <div className="text-[13px] sm:text-sm text-foreground/90">{row.label}</div>
                      <div className="flex items-center justify-center">
                        <Mark included={row.essential} />
                      </div>
                      <div className="flex items-center justify-center">
                        <Mark included={row.professional} />
                      </div>
                      <div className="flex items-center justify-center">
                        <Mark included={row.elite} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-foreground/70 text-center mt-6">
              Full details in the plan cards above.
            </p>
          </RevealItem>
        </ScrollReveal>
      </div>
    </section>
  );
}
