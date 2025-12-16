import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, Smartphone, Monitor, BarChart3, Sparkles, Crown, Building2 } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  badge: string;
  badgeVariant: 'default' | 'popular' | 'elite';
  price: string;
  description: string;
  features: string[];
  whoItsFor: string;
}

interface PricingPlanGridProps {
  plans: Plan[];
}

const PLAN_VISUALS: Record<string, { icon: any; gradient: string; borderColor: string; visual: React.ReactNode }> = {
  essential: {
    icon: Smartphone,
    gradient: 'from-muted/50 to-muted/20',
    borderColor: 'border-border hover:border-primary/30',
    visual: (
      <div className="h-28 rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50 p-3 mb-4">
        <div className="flex gap-2 mb-2">
          <div className="h-6 w-6 rounded bg-muted/50" />
          <div className="flex-1 h-6 rounded bg-muted/50" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="h-4 rounded bg-muted/30" />
          <div className="h-4 rounded bg-muted/30" />
          <div className="h-4 rounded bg-muted/30" />
          <div className="h-4 rounded bg-muted/30" />
        </div>
      </div>
    ),
  },
  professional: {
    icon: Monitor,
    gradient: 'from-primary/10 to-primary/5',
    borderColor: 'border-primary/50 hover:border-primary',
    visual: (
      <div className="h-28 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 p-3 mb-4">
        <div className="flex gap-2 mb-2">
          <div className="h-6 w-14 rounded bg-primary/20" />
          <div className="flex-1 h-6 rounded bg-primary/10" />
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <div className="h-3 rounded bg-primary/15" />
            <div className="h-3 w-4/5 rounded bg-primary/15" />
          </div>
          <div className="flex items-end gap-0.5">
            <div className="w-3 h-6 rounded-t bg-primary/30" />
            <div className="w-3 h-8 rounded-t bg-primary/40" />
            <div className="w-3 h-10 rounded-t bg-primary/50" />
          </div>
        </div>
      </div>
    ),
  },
  elite: {
    icon: BarChart3,
    gradient: 'from-violet-500/10 to-violet-500/5',
    borderColor: 'border-violet-500/30 hover:border-violet-500',
    visual: (
      <div className="h-28 rounded-lg bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20 p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-5 w-5 rounded-full bg-violet-500/30 flex items-center justify-center">
            <Crown className="h-3 w-3 text-violet-500" />
          </div>
          <div className="h-4 flex-1 rounded bg-violet-500/20" />
        </div>
        <div className="flex items-end justify-between">
          <div className="flex items-end gap-0.5 h-12">
            <div className="w-4 h-4 rounded-sm bg-violet-500/30" />
            <div className="w-4 h-7 rounded-sm bg-violet-500/40" />
            <div className="w-4 h-5 rounded-sm bg-violet-500/35" />
            <div className="w-4 h-9 rounded-sm bg-violet-500/50" />
            <div className="w-4 h-12 rounded-sm bg-violet-500" />
          </div>
          <div className="text-[10px] text-violet-400 font-medium bg-violet-500/10 px-2 py-1 rounded">
            AI Insights
          </div>
        </div>
      </div>
    ),
  },
};

export function PricingPlanGrid({ plans }: PricingPlanGridProps) {
  return (
    <section className="py-20 md:py-28 bg-card relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Plans that grow with you
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From a single property to a global portfolio—choose what fits your operations today.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const visual = PLAN_VISUALS[plan.id];
            const Icon = visual?.icon || Building2;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`h-full relative overflow-hidden transition-all duration-300 hover:shadow-xl ${visual?.borderColor || 'border-border'} ${plan.badgeVariant === 'popular' ? 'ring-2 ring-primary/20' : ''}`}>
                  {plan.badgeVariant === 'popular' && (
                    <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-xs font-semibold text-center py-1.5">
                      Most popular
                    </div>
                  )}
                  {plan.badgeVariant === 'elite' && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-semibold text-center py-1.5">
                      Data-driven excellence
                    </div>
                  )}
                  
                  <CardContent className={`p-6 ${plan.badgeVariant !== 'default' ? 'pt-10' : ''}`}>
                    {/* Plan visual */}
                    {visual?.visual}
                    
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                        plan.id === 'elite' ? 'bg-violet-500/20' : 
                        plan.id === 'professional' ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Icon className={`h-5 w-5 ${
                          plan.id === 'elite' ? 'text-violet-500' : 
                          plan.id === 'professional' ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                        <p className="text-2xl font-extrabold text-foreground">{plan.price}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                    
                    <ul className="space-y-2.5 mb-6">
                      {plan.features.slice(0, 7).map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                            plan.id === 'elite' ? 'text-violet-500' : 
                            plan.id === 'professional' ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                          <span className="text-foreground">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <Button 
                      asChild 
                      className={`w-full rounded-full font-semibold ${
                        plan.id === 'elite' 
                          ? 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white' 
                          : plan.id === 'professional'
                          ? ''
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                      variant={plan.id === 'professional' ? 'default' : plan.id === 'elite' ? 'default' : 'secondary'}
                    >
                      <a href={`mailto:hello@propera.cc?subject=${plan.name} Plan Inquiry`}>
                        Talk to us
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center mt-4">{plan.whoItsFor}</p>
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
