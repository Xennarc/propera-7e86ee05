import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, Smartphone, Monitor, BarChart3, Crown, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { AnimatedFeatureIcon } from '@/components/illustrations/AnimatedFeatureIcon';

interface Plan {
  id: string;
  name: string;
  badge: string;
  badgeVariant: 'default' | 'popular' | 'elite';
  price: string;
  priceUnit?: string;
  description: string;
  features: string[];
  usage?: string;
  overage?: string;
  cta?: string;
  whoItsFor: string;
}

interface PricingPlanGridProps {
  plans: Plan[];
}

const PLAN_CONFIG: Record<string, { 
  icon: typeof Smartphone; 
  gradient: string; 
  accent: string;
  tagline: string;
  recommendedFor: string;
  ctaHelper: string;
}> = {
  essential: { 
    icon: Smartphone, 
    gradient: 'from-muted/50 to-muted/20',
    accent: 'muted-foreground',
    tagline: 'A refined foundation for modern guest service.',
    recommendedFor: 'Boutique resorts, soft launches, and focused teams.',
    ctaHelper: 'A perfect starting point. Upgrade anytime.',
  },
  professional: { 
    icon: Monitor, 
    gradient: 'from-primary/15 to-primary/5',
    accent: 'primary',
    tagline: 'The full Propera experience — balanced, complete, and effortless.',
    recommendedFor: 'Day-to-day operations across departments.',
    ctaHelper: 'The plan most resorts choose to run everything smoothly.',
  },
  enterprise: { 
    icon: BarChart3, 
    gradient: 'from-violet-500/15 to-violet-500/5',
    accent: 'violet-500',
    tagline: 'Built for scale — with the finish of a luxury product.',
    recommendedFor: 'High-volume resorts and multi-property groups.',
    ctaHelper: 'For groups that want consistency across properties.',
  },
};

const PRO_HIGHLIGHTS = [
  'One place for experiences and dining',
  'Clear roles for every team',
  'Insights that improve every day',
];

export function PricingPlanGrid({ plans }: PricingPlanGridProps) {
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const { ref, revealed } = useScrollReveal();

  return (
    <section id="plans" className="py-12 md:py-16 lg:py-20 relative overflow-hidden scroll-mt-24">
      {/* Midnight gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-midnight-900/30 to-background dark:via-midnight-950" />
      
      {/* Lime glow - hidden on mobile */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[800px] h-[400px] md:h-[600px] bg-lime-400/5 dark:bg-lime-400/8 rounded-full blur-[100px] md:blur-[140px] pointer-events-none hidden sm:block" />
      <div className="absolute top-0 right-0 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-teal-400/5 dark:bg-teal-400/8 rounded-full blur-[80px] md:blur-[120px] pointer-events-none hidden sm:block" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div
          ref={ref}
          className={`section-reveal ${revealed ? 'section-revealed' : ''}`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 lg:gap-8 max-w-6xl mx-auto">
            {plans.map((plan, index) => {
              const config = PLAN_CONFIG[plan.id] || PLAN_CONFIG.essential;
              const Icon = config.icon;
              const isExpanded = expandedPlan === plan.id;
              const isProfessional = plan.id === 'professional';
              const isElite = plan.id === 'enterprise';
              
              return (
                <div
                  key={plan.id}
                  className={`group hover-lift-card stagger-${index + 1} ${isProfessional ? 'md:-mt-4 md:mb-4' : ''}`}
                >
                  <Card className={`h-full relative overflow-hidden transition-all duration-200 bg-card dark:bg-midnight-900 ${
                    isElite 
                      ? 'border-violet-500/30 ring-1 ring-violet-500/20 stroke-gradient' 
                      : isProfessional
                      ? 'border-primary/40 ring-2 ring-primary/20 glow-lime'
                      : 'border-border/30 hover:border-primary/30 dark:border-midnight-700/50'
                  }`}>
                    {/* Badge ribbon */}
                    {isProfessional && (
                      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary/90 via-primary to-teal-400/90 text-primary-foreground text-xs font-semibold text-center py-2.5">
                        <span className="flex items-center justify-center gap-1.5">
                          <Crown className="h-3.5 w-3.5" />
                          Most Popular
                        </span>
                      </div>
                    )}
                    {isElite && (
                      <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-violet-500/80 via-purple-500/90 to-violet-500/80 text-primary-foreground text-xs font-semibold text-center py-2.5 backdrop-blur-sm">
                        <span className="flex items-center justify-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          Premium
                        </span>
                      </div>
                    )}
                    
                    {/* Popular plan glow */}
                    {isProfessional && (
                      <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[200px] h-[200px] bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
                    )}
                    
                    <CardContent className={`p-6 relative ${(isProfessional || isElite) ? 'pt-14' : ''}`}>
                      {/* Icon + name */}
                      <div className="flex items-center gap-3 mb-3">
                        <AnimatedFeatureIcon
                          icon={Icon}
                          size="md"
                          variant="orb"
                          delay={index * 0.1}
                        />
                        <div>
                          <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                        </div>
                      </div>

                      {/* Tagline */}
                      <p className="text-sm text-foreground/80 font-medium mb-4 leading-relaxed">
                        {config.tagline}
                      </p>
                      
                      {/* Recommended for */}
                      <p className="text-xs text-muted-foreground mb-4">
                        <span className="font-medium">Recommended for:</span> {config.recommendedFor}
                      </p>
                      
                      {/* Price */}
                      <div className="mb-5">
                        <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                        {plan.priceUnit && (
                          <span className="text-sm text-muted-foreground ml-2">{plan.priceUnit}</span>
                        )}
                      </div>
                      
                      {/* CTA */}
                      <Button 
                        asChild 
                        className={`w-full rounded-full font-semibold h-11 transition-all duration-200 ${
                          isElite 
                            ? 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-lg shadow-violet-500/30' 
                            : isProfessional
                            ? 'bg-primary text-primary-foreground glow-lime hover:-translate-y-0.5'
                            : 'bg-card hover:bg-muted border border-border/40 dark:bg-midnight-800 dark:border-midnight-600'
                        }`}
                        variant={isProfessional ? 'default' : isElite ? 'default' : 'secondary'}
                      >
                        <a href={`mailto:hello@propera.io?subject=${plan.name} Plan Inquiry`}>
                          {plan.cta || 'Talk to us'}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </a>
                      </Button>
                      
                      <p className="text-xs text-muted-foreground text-center mt-3 mb-6">{config.ctaHelper}</p>
                      
                      {/* Separator */}
                      <div className="border-t border-border/30 pt-5">
                        {/* Pro highlights */}
                        {isProfessional && (
                          <div className="mb-5 p-4 rounded-xl bg-primary/5 border border-primary/15">
                            <p className="text-xs font-semibold text-foreground mb-2">Why teams choose this</p>
                            <ul className="space-y-1.5">
                              {PRO_HIGHLIGHTS.map((highlight, i) => (
                                <li 
                                  key={i} 
                                  className="flex items-center gap-2 text-xs text-muted-foreground"
                                >
                                  <Check className="h-3 w-3 text-primary flex-shrink-0" />
                                  {highlight}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {/* Features list */}
                        <div className="mb-5">
                          <p className="text-xs font-semibold text-foreground mb-3">What you get</p>
                          <ul className="space-y-2.5">
                            {plan.features.slice(0, isExpanded ? undefined : 5).map((feature, i) => (
                              <li 
                                key={i} 
                                className="flex items-start gap-2.5 text-sm"
                              >
                                <div 
                                  className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 transition-transform hover:scale-110 ${
                                    isElite ? 'bg-violet-500/10' : 
                                    isProfessional ? 'bg-primary/10' : 'bg-muted/60'
                                  }`}
                                >
                                  <Check className={`h-3 w-3 ${
                                    isElite ? 'text-violet-500' : 
                                    isProfessional ? 'text-primary' : 'text-muted-foreground'
                                  }`} />
                                </div>
                                <span className="text-foreground">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {/* Expand/collapse */}
                        {plan.features.length > 5 && (
                          <button
                            onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                            className="text-xs text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 transition-colors"
                          >
                            {isExpanded ? 'Show less' : `+${plan.features.length - 5} more`}
                          </button>
                        )}
                        
                        {/* Usage info */}
                        {(plan.usage || plan.overage) && (
                          <div className="p-3 rounded-lg bg-muted/30 border border-border/20">
                            <p className="text-xs font-medium text-foreground mb-1">Included usage</p>
                            {plan.usage && <p className="text-xs text-muted-foreground">{plan.usage}</p>}
                            {plan.overage && <p className="text-xs text-muted-foreground mt-1">{plan.overage}</p>}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
