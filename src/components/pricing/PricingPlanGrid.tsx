import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, Smartphone, Monitor, BarChart3, Crown, Building2, Sparkles, Users, Calendar, Bell } from 'lucide-react';
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

// Animated UI snippets for each plan
function EssentialVisual() {
  return (
    <div className="h-32 rounded-xl bg-gradient-to-br from-muted/40 to-muted/20 border border-border/50 p-3 mb-4 overflow-hidden relative">
      {/* Header bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="h-5 w-5 rounded bg-muted/60 flex items-center justify-center">
          <Calendar className="h-3 w-3 text-muted-foreground" />
        </div>
        <div className="h-3 w-20 rounded bg-muted/50" />
        <div className="ml-auto h-3 w-12 rounded bg-muted/40" />
      </div>
      {/* Content grid */}
      <div className="grid grid-cols-2 gap-2">
        <motion.div 
          className="h-8 rounded-lg bg-muted/30 border border-border/30 flex items-center px-2 gap-1.5"
          initial={{ opacity: 0.5 }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="h-4 w-4 rounded-full bg-primary/20" />
          <div className="h-2 w-10 rounded bg-muted/50" />
        </motion.div>
        <div className="h-8 rounded-lg bg-muted/30 border border-border/30 flex items-center px-2 gap-1.5">
          <div className="h-4 w-4 rounded bg-muted/40" />
          <div className="h-2 w-8 rounded bg-muted/50" />
        </div>
        <div className="h-8 rounded-lg bg-muted/30 border border-border/30" />
        <div className="h-8 rounded-lg bg-muted/30 border border-border/30" />
      </div>
      {/* Subtle glow */}
      <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-primary/5 rounded-full blur-xl" />
    </div>
  );
}

function ProfessionalVisual() {
  return (
    <div className="h-32 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 p-3 mb-4 overflow-hidden relative">
      {/* Header with tabs */}
      <div className="flex items-center gap-1 mb-3">
        <div className="h-5 px-2 rounded-md bg-primary/20 flex items-center">
          <span className="text-[8px] font-medium text-primary">Today</span>
        </div>
        <div className="h-5 px-2 rounded-md bg-primary/10">
          <span className="text-[8px] text-primary/60">Week</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <motion.div 
            className="h-2 w-2 rounded-full bg-emerald-500"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[8px] text-emerald-500">Live</span>
        </div>
      </div>
      {/* Dashboard metrics */}
      <div className="flex gap-2 mb-2">
        <div className="flex-1 p-2 rounded-lg bg-primary/10 border border-primary/15">
          <div className="text-[10px] text-primary/70">Sessions</div>
          <motion.div 
            className="text-sm font-bold text-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            12
          </motion.div>
        </div>
        <div className="flex-1 p-2 rounded-lg bg-primary/10 border border-primary/15">
          <div className="text-[10px] text-primary/70">Covers</div>
          <motion.div 
            className="text-sm font-bold text-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            48
          </motion.div>
        </div>
        <div className="flex-1 p-2 rounded-lg bg-primary/10 border border-primary/15">
          <div className="text-[10px] text-primary/70">Pre-arrival</div>
          <motion.div 
            className="text-sm font-bold text-primary"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            6
          </motion.div>
        </div>
      </div>
      {/* Chart bars */}
      <div className="flex items-end gap-0.5 h-6">
        {[40, 65, 45, 80, 55, 70, 90].map((h, i) => (
          <motion.div
            key={i}
            className="flex-1 rounded-t bg-primary/40"
            initial={{ height: 0 }}
            animate={{ height: `${h}%` }}
            transition={{ delay: 0.2 + i * 0.05, duration: 0.4 }}
          />
        ))}
      </div>
      {/* Glow */}
      <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-primary/10 rounded-full blur-xl" />
    </div>
  );
}

function EliteVisual() {
  return (
    <div className="h-32 rounded-xl bg-gradient-to-br from-violet-500/15 to-purple-500/5 border border-violet-500/20 p-3 mb-4 overflow-hidden relative">
      {/* AI Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-5 w-5 rounded-full bg-violet-500/20 flex items-center justify-center">
          <Sparkles className="h-3 w-3 text-violet-400" />
        </div>
        <span className="text-[9px] font-medium text-violet-400">AI Revenue Coach</span>
        <motion.div 
          className="ml-auto px-1.5 py-0.5 rounded bg-violet-500/20"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-[8px] text-violet-400">3 insights</span>
        </motion.div>
      </div>
      {/* Insight card */}
      <motion.div 
        className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/15 mb-2"
        initial={{ x: -10, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex items-start gap-2">
          <div className="h-4 w-4 rounded bg-emerald-500/20 flex items-center justify-center mt-0.5">
            <span className="text-[8px] text-emerald-400">↑</span>
          </div>
          <div className="flex-1">
            <div className="text-[9px] text-violet-300">Pre-arrival bookings up 23%</div>
            <div className="text-[8px] text-violet-400/70">from last week</div>
          </div>
        </div>
      </motion.div>
      {/* Loyalty badge */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
          <Crown className="h-3 w-3 text-amber-400" />
          <span className="text-[8px] text-amber-400 font-medium">Gold Tier</span>
        </div>
        <div className="text-[8px] text-violet-400/70">2,450 pts</div>
      </div>
      {/* Glow effects */}
      <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-violet-500/10 rounded-full blur-xl" />
      <div className="absolute -top-6 -left-6 w-16 h-16 bg-purple-500/10 rounded-full blur-xl" />
    </div>
  );
}

const PLAN_VISUALS: Record<string, { icon: any; visual: React.ReactNode }> = {
  essential: { icon: Smartphone, visual: <EssentialVisual /> },
  professional: { icon: Monitor, visual: <ProfessionalVisual /> },
  enterprise: { icon: BarChart3, visual: <EliteVisual /> },
};

export function PricingPlanGrid({ plans }: PricingPlanGridProps) {
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  return (
    <section className="py-20 md:py-28 bg-card relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/3 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
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
            const isExpanded = expandedPlan === plan.id;
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <Card className={`h-full relative overflow-hidden transition-all duration-500 hover:shadow-2xl ${
                  plan.id === 'enterprise' 
                    ? 'border-violet-500/30 hover:border-violet-500/60 bg-gradient-to-b from-card to-violet-500/5' 
                    : plan.id === 'professional'
                    ? 'border-primary/30 hover:border-primary/60 ring-2 ring-primary/10'
                    : 'border-border hover:border-primary/30'
                }`}>
                  {/* Badge */}
                  {plan.badgeVariant === 'popular' && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-xs font-semibold text-center py-1.5">
                      <span className="flex items-center justify-center gap-1.5">
                        <Users className="h-3 w-3" />
                        Most popular
                      </span>
                    </div>
                  )}
                  {plan.badgeVariant === 'elite' && (
                    <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-violet-600 to-purple-600 text-white text-xs font-semibold text-center py-1.5">
                      <span className="flex items-center justify-center gap-1.5">
                        <Sparkles className="h-3 w-3" />
                        Premium control
                      </span>
                    </div>
                  )}
                  
                  <CardContent className={`p-6 ${plan.badgeVariant !== 'default' ? 'pt-10' : ''}`}>
                    {/* Animated visual */}
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {visual?.visual}
                    </motion.div>
                    
                    {/* Plan header */}
                    <div className="flex items-center gap-3 mb-3">
                      <motion.div 
                        className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          plan.id === 'enterprise' ? 'bg-violet-500/20 group-hover:bg-violet-500/30' : 
                          plan.id === 'professional' ? 'bg-primary/10 group-hover:bg-primary/20' : 
                          'bg-muted group-hover:bg-muted/80'
                        }`}
                        whileHover={{ rotate: 5 }}
                      >
                        <Icon className={`h-6 w-6 ${
                          plan.id === 'enterprise' ? 'text-violet-500' : 
                          plan.id === 'professional' ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </motion.div>
                      <div>
                        <h3 className="text-xl font-bold text-foreground">{plan.name}</h3>
                        <p className="text-2xl font-extrabold text-foreground">{plan.price}</p>
                        {plan.priceUnit && <p className="text-xs text-muted-foreground">{plan.priceUnit}</p>}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>
                    
                    {/* Features list */}
                    <ul className="space-y-2.5 mb-4">
                      {plan.features.slice(0, isExpanded ? undefined : 5).map((feature, i) => (
                        <motion.li 
                          key={i} 
                          className="flex items-start gap-2 text-sm"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <div className={`h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            plan.id === 'enterprise' ? 'bg-violet-500/10' : 
                            plan.id === 'professional' ? 'bg-primary/10' : 'bg-muted'
                          }`}>
                            <Check className={`h-3 w-3 ${
                              plan.id === 'enterprise' ? 'text-violet-500' : 
                              plan.id === 'professional' ? 'text-primary' : 'text-muted-foreground'
                            }`} />
                          </div>
                          <span className="text-foreground">{feature}</span>
                        </motion.li>
                      ))}
                    </ul>
                    
                    {/* Usage info */}
                    {(plan.usage || plan.overage) && (
                      <div className="mb-4 p-3 rounded-lg bg-muted/30 border border-border/50">
                        {plan.usage && <p className="text-xs text-foreground font-medium">{plan.usage}</p>}
                        {plan.overage && <p className="text-xs text-muted-foreground mt-1">{plan.overage}</p>}
                      </div>
                    )}
                    
                    {/* Expand/collapse */}
                    {plan.features.length > 5 && (
                      <button
                        onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                        className="text-xs text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1 transition-colors"
                      >
                        {isExpanded ? 'Show less' : `+${plan.features.length - 5} more features`}
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          className="inline-block"
                        >
                          ↓
                        </motion.span>
                      </button>
                    )}
                    
                    {/* CTA Button */}
                    <Button 
                      asChild 
                      className={`w-full rounded-full font-semibold h-12 text-base transition-all duration-300 ${
                        plan.id === 'enterprise' 
                          ? 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40' 
                          : plan.id === 'professional'
                          ? 'shadow-lg shadow-primary/20 hover:shadow-primary/40'
                          : 'bg-muted text-foreground hover:bg-muted/80'
                      }`}
                      variant={plan.id === 'professional' ? 'default' : plan.id === 'enterprise' ? 'default' : 'secondary'}
                    >
                      <a href={`mailto:hello@propera.cc?subject=${plan.name} Plan Inquiry`}>
                        {plan.cta || 'Talk to us'}
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </a>
                    </Button>
                    
                    <p className="text-xs text-muted-foreground text-center mt-4">{plan.whoItsFor}</p>
                  </CardContent>
                  
                  {/* Hover glow effect */}
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${
                    plan.id === 'enterprise' ? 'bg-gradient-to-t from-violet-500/5 to-transparent' :
                    plan.id === 'professional' ? 'bg-gradient-to-t from-primary/5 to-transparent' : ''
                  }`} />
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
