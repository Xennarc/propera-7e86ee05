import { Check, Minus } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const COMPARISON_ROWS = [
  { label: 'Guest Portal', essential: true, professional: true, elite: true },
  { label: 'Staff Console', essential: true, professional: true, elite: true },
  { label: 'Experiences & Activities', essential: true, professional: true, elite: true },
  { label: 'Dining', essential: false, professional: true, elite: true },
  { label: 'Analytics', essential: false, professional: true, elite: true },
  { label: 'White-label options', essential: false, professional: false, elite: true },
  { label: 'Priority support', essential: false, professional: false, elite: true },
];

export function PricingComparisonMatrix() {
  const { ref, revealed } = useScrollReveal();

  return (
    <section className="py-16 md:py-20 bg-background relative overflow-hidden">
      {/* TideGlow */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[400px] bg-primary/4 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div
          ref={ref}
          className={`section-reveal ${revealed ? 'section-revealed' : ''}`}
        >
          <div className="text-center mb-10 stagger-1">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              At a glance
            </h2>
            <p className="text-muted-foreground">
              A quick view of what's included in each plan.
            </p>
          </div>

          <div className="max-w-3xl mx-auto stagger-2">
            <div className="lagoon-glass rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-muted/20 border-b border-border/30">
                <div className="text-sm font-medium text-muted-foreground">Feature</div>
                <div className="text-sm font-semibold text-foreground text-center">Essential</div>
                <div className="text-sm font-semibold text-primary text-center relative">
                  <span className="relative z-10">Professional</span>
                  <div className="absolute inset-0 bg-primary/5 -mx-2 rounded-t-lg" />
                </div>
                <div className="text-sm font-semibold text-violet-500 text-center relative">
                  <span className="relative z-10">Elite</span>
                  <div className="absolute inset-0 bg-violet-500/5 -mx-2 rounded-t-lg" />
                </div>
              </div>

              {/* Rows */}
              {COMPARISON_ROWS.map((row, index) => (
                <div 
                  key={row.label}
                  className={`grid grid-cols-4 gap-4 p-4 transition-colors hover:bg-muted/10 ${
                    index !== COMPARISON_ROWS.length - 1 ? 'border-b border-border/20' : ''
                  }`}
                >
                  <div className="text-sm text-foreground">{row.label}</div>
                  <div className="flex justify-center">
                    {row.essential ? (
                      <div className="h-5 w-5 rounded-full bg-muted/60 flex items-center justify-center">
                        <Check className="h-3 w-3 text-muted-foreground" />
                      </div>
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex justify-center relative">
                    <div className="absolute inset-0 bg-primary/5 -mx-2" />
                    {row.professional ? (
                      <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center relative z-10">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground/30 relative z-10" />
                    )}
                  </div>
                  <div className="flex justify-center relative">
                    <div className="absolute inset-0 bg-violet-500/5 -mx-2" />
                    {row.elite ? (
                      <div className="h-5 w-5 rounded-full bg-violet-500/15 flex items-center justify-center relative z-10">
                        <Check className="h-3 w-3 text-violet-500" />
                      </div>
                    ) : (
                      <Minus className="h-4 w-4 text-muted-foreground/30 relative z-10" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Full details are in the plan cards above.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
