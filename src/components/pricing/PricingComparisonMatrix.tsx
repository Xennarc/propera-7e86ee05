import { Check, Minus } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

const COMPARISON_ROWS = [
  // Platform Foundation — all tiers
  { label: 'Guest Portal + room login', essential: true, professional: true, elite: true },
  { label: 'Activity booking + live availability', essential: true, professional: true, elite: true },
  { label: 'Dining reservations + time slots', essential: true, professional: true, elite: true },
  { label: 'Staff Console + guest records', essential: true, professional: true, elite: true },
  { label: 'Basic reports + notifications', essential: true, professional: true, elite: true },
  // Professional additions
  { label: 'Guest Requests inbox (SLA lanes)', essential: false, professional: true, elite: true },
  { label: 'Transport dispatch + Driver Portal', essential: false, professional: true, elite: true },
  { label: 'Pre-arrival wizard + booking links', essential: false, professional: true, elite: true },
  { label: 'Multi-language + resort branding', essential: false, professional: true, elite: true },
  { label: 'Advanced scheduling + closures', essential: false, professional: true, elite: true },
  { label: 'Module reports + CSV export', essential: false, professional: true, elite: true },
  { label: 'Staff management + RBAC', essential: false, professional: true, elite: true },
  // Elite additions
  { label: 'Loyalty program (points, tiers)', essential: false, professional: false, elite: true },
  { label: 'AI insights + trend analysis', essential: false, professional: false, elite: true },
  { label: 'Sales performance + health checks', essential: false, professional: false, elite: true },
];

export function PricingComparisonMatrix() {
  const { ref, revealed } = useScrollReveal();

  return (
    <section className="py-12 md:py-16 lg:py-20 bg-gradient-to-br from-background via-background to-teal-400/5 dark:from-background dark:via-background dark:to-background relative overflow-hidden">
      {/* Enhanced TideGlow for light mode - hidden on mobile */}
      <div className="absolute top-0 left-1/3 w-[300px] md:w-[500px] h-[200px] md:h-[400px] bg-primary/10 dark:bg-primary/4 rounded-full blur-[80px] md:blur-[120px] pointer-events-none hidden sm:block" />
      <div className="absolute bottom-0 right-1/4 w-[200px] md:w-[300px] h-[200px] md:h-[300px] bg-teal-400/10 dark:bg-teal-400/5 rounded-full blur-[60px] md:blur-[100px] pointer-events-none hidden sm:block" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div
          ref={ref}
          className={`section-reveal ${revealed ? 'section-revealed' : ''}`}
        >
          <div className="text-center mb-6 md:mb-10 stagger-1">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-2 md:mb-3">
              At a glance
            </h2>
            <p className="text-sm md:text-base text-muted-foreground">
              A quick view of what's included in each plan.
            </p>
          </div>

          <div className="max-w-3xl mx-auto stagger-2">
            {/* Mobile hint */}
            <p className="text-xs text-muted-foreground text-center mb-3 sm:hidden">
              ← Swipe to see all plans →
            </p>
            
            {/* Horizontal scroll wrapper for mobile */}
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="lagoon-glass rounded-2xl overflow-hidden min-w-[480px] sm:min-w-0">
                {/* Header */}
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

                {/* Rows */}
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
          </div>
        </div>
      </div>
    </section>
  );
}
