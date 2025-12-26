import { motion, useReducedMotion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, Smartphone, Monitor, BarChart3, Crown, Sparkles } from 'lucide-react';
import { useState } from 'react';

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
    gradient: 'from-primary/10 to-primary/5',
    accent: 'primary',
    tagline: 'The full Propera experience — balanced, complete, and effortless.',
    recommendedFor: 'Day-to-day operations across departments.',
    ctaHelper: 'The plan most resorts choose to run everything smoothly.',
  },
  enterprise: { 
    icon: BarChart3, 
    gradient: 'from-violet-500/10 to-violet-500/5',
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
  const reducedMotion = useReducedMotion();

  return (
    <section id="plans" className="py-16 md:py-20 bg-muted/20 relative overflow-hidden scroll-mt-24">
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const config = PLAN_CONFIG[plan.id] || PLAN_CONFIG.essential;
            const Icon = config.icon;
            const isExpanded = expandedPlan === plan.id;
            const isProfessional = plan.id === 'professional';
            const isElite = plan.id === 'enterprise';
            
            return (
              <motion.div
                key={plan.id}
                initial={reducedMotion ? {} : { opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className={`group ${isProfessional ? 'md:-mt-4 md:mb-4' : ''}`}
              >
                <Card className={`h-full relative overflow-hidden transition-all duration-300 hover:shadow-xl ${
                  isElite 
                    ? 'border-violet-500/30 bg-gradient-to-b from-card to-violet-500/5' 
                    : isProfessional
                    ? 'border-primary/40 ring-2 ring-primary/20 shadow-lg bg-gradient-to-b from-card to-primary/5'
                    : 'border-border/50 hover:border-primary/30'
                }`}>
                  {/* Badge ribbon */}
                  {isProfessional && (
                    <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-semibold text-center py-2">
                      <span className="flex items-center justify-center gap-1.5">
                        <Crown className="h-3.5 w-3.5" />
                        Most Popular
                      </span>
                    </div>
                  )}
                  {isElite && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-violet-600 to-purple-600 text-primary-foreground text-xs font-semibold text-center py-2">
                      <span className="flex items-center justify-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Premium
                      </span>
                    </div>
                  )}
                  
                  <CardContent className={`p-6 ${(isProfessional || isElite) ? 'pt-12' : ''}`}>
                    {/* Icon + name */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${config.gradient}`}>
                        <Icon className={`h-6 w-6 text-${config.accent}`} />
                      </div>
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
                    
                    {/* CTA - right after price */}
                    <Button 
                      asChild 
                      className={`w-full rounded-xl font-semibold h-11 transition-all duration-200 ${
                        isElite 
                          ? 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-primary-foreground shadow-md' 
                          : isProfessional
                          ? 'shadow-md'
                          : ''
                      }`}
                      variant={isProfessional ? 'default' : isElite ? 'default' : 'secondary'}
                    >
                      <a href={`mailto:hello@propera.cc?subject=${plan.name} Plan Inquiry`}>
                        {plan.cta || 'Talk to us'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center mt-3 mb-6">{config.ctaHelper}</p>
                    
                    {/* Separator */}
                    <div className="border-t border-border/50 pt-5">
                      {/* Pro highlights */}
                      {isProfessional && (
                        <div className="mb-5 p-4 rounded-xl bg-primary/5 border border-primary/20">
                          <p className="text-xs font-semibold text-foreground mb-2">Why teams choose this</p>
                          <ul className="space-y-1.5">
                            {PRO_HIGHLIGHTS.map((highlight, i) => (
                              <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
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
                              <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                isElite ? 'bg-violet-500/15' : 
                                isProfessional ? 'bg-primary/15' : 'bg-muted'
                              }`}>
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
                        <div className="p-3 rounded-lg bg-muted/40 border border-border/30">
                          <p className="text-xs font-medium text-foreground mb-1">Included usage</p>
                          {plan.usage && <p className="text-xs text-muted-foreground">{plan.usage}</p>}
                          {plan.overage && <p className="text-xs text-muted-foreground mt-1">{plan.overage}</p>}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
