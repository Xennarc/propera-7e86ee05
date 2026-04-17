import { Check, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { ScrollReveal, RevealItem } from '@/components/motion/ScrollReveal';
import { ResortSizeSelector } from '@/components/pricing/ResortSizeSelector';
import { type ResortSize, getBandPricing } from '@/hooks/useResortSize';

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
  resortSize: ResortSize;
  onResortSizeChange: (size: ResortSize) => void;
}

const PLAN_TAGLINE: Record<string, string> = {
  essential: 'For boutique resorts and focused teams.',
  professional: 'For day-to-day operations across departments.',
  enterprise: 'For high-volume resorts and multi-property groups.',
};

interface PlanCardProps {
  plan: Plan;
  resortSize: ResortSize;
  emphasis: 'quiet' | 'hero' | 'refined';
}

function PlanCard({ plan, resortSize, emphasis }: PlanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const band = getBandPricing(plan.id, resortSize);
  const displayPrice = band?.price ?? plan.price;
  const displayUsage = band?.usage ?? plan.usage;
  const displayOverage = band?.overage ?? plan.overage;
  const tagline = PLAN_TAGLINE[plan.id] ?? plan.whoItsFor;

  const isHero = emphasis === 'hero';

  // Split feature list: detect "Everything in X, plus:" header
  const firstIsContinuation = plan.features[0]?.toLowerCase().startsWith('everything in');
  const eyebrow = firstIsContinuation ? plan.features[0] : null;
  const featureList = firstIsContinuation ? plan.features.slice(1) : plan.features;
  const visibleFeatures = expanded ? featureList : featureList.slice(0, 5);

  return (
    <div className="relative h-full">
      {isHero && (
        <div className="absolute -inset-px -top-4 -bottom-4 bg-primary/[0.06] rounded-3xl blur-2xl pointer-events-none" />
      )}
      <div
        className={`relative h-full flex flex-col rounded-2xl bg-card transition-colors duration-200 ${
          isHero
            ? 'border border-primary/40 p-6 md:p-7'
            : 'border border-border/40 hover:border-border/70 p-5 md:p-6'
        }`}
      >
        {/* Eyebrow label */}
        <div className="h-5 mb-3">
          {isHero && (
            <span className="text-[10px] font-semibold text-primary tracking-[1.5px] uppercase">
              Recommended
            </span>
          )}
        </div>

        {/* Plan name */}
        <h3 className={`font-serif tracking-tight text-foreground ${isHero ? 'text-3xl' : 'text-2xl'}`}>
          {plan.name}
        </h3>
        <p className="font-serif italic text-sm text-muted-foreground mt-1.5 leading-snug">
          {tagline}
        </p>

        {/* Price block */}
        <div className="mt-7 mb-7">
          <div
            className={`font-semibold tracking-tight tabular-nums text-foreground transition-transform duration-200 ${
              isHero ? 'text-6xl' : 'text-5xl'
            }`}
            key={displayPrice}
          >
            {displayPrice}
          </div>
          {plan.priceUnit && (
            <div className="text-[10px] uppercase tracking-[1.5px] text-muted-foreground mt-2">
              {plan.priceUnit}
            </div>
          )}
        </div>

        {/* CTA */}
        <a
          href={`mailto:hello@propera.io?subject=${plan.name} Plan Inquiry`}
          className={`inline-flex items-center justify-center rounded-full font-semibold h-12 transition-all duration-200 active:scale-[0.98] text-sm group ${
            isHero
              ? 'bg-primary text-primary-foreground glow-lime hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/20'
              : 'border border-border/60 text-foreground hover:border-foreground/40 hover:bg-foreground/[0.02]'
          }`}
        >
          {plan.cta || 'Talk to us'}
          <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </a>

        {/* Feature list */}
        <div className="mt-7 flex-1">
          {eyebrow && (
            <p className="text-[10px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">
              {eyebrow.replace(/:?\s*$/, '')}
            </p>
          )}
          <ul className="space-y-3">
            {visibleFeatures.map((feature, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[13.5px] leading-relaxed">
                <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" strokeWidth={2} />
                <span className="text-foreground/90">{feature}</span>
              </li>
            ))}
          </ul>

          {featureList.length > 5 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors"
            >
              {expanded ? 'Show less' : `Show ${featureList.length - 5} more`}
            </button>
          )}
        </div>

        {/* Usage footer */}
        {(displayUsage || displayOverage) && (
          <div className="mt-7 pt-5 border-t border-border/40">
            {displayUsage && (
              <p className="text-xs text-muted-foreground tabular-nums">{displayUsage}</p>
            )}
            {displayOverage && (
              <p className="text-xs text-muted-foreground tabular-nums mt-1">{displayOverage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function PricingPlanGrid({ plans, resortSize, onResortSizeChange }: PricingPlanGridProps) {
  // Order: essential, professional, enterprise — to put hero in the middle
  const ordered = [
    plans.find((p) => p.id === 'essential'),
    plans.find((p) => p.id === 'professional'),
    plans.find((p) => p.id === 'enterprise'),
  ].filter(Boolean) as Plan[];

  return (
    <section
      id="plans"
      className="py-[60px] relative overflow-hidden scroll-mt-24 border-t border-border/50"
    >
      <div className="container mx-auto px-4 relative z-10">
        <ScrollReveal>
          <RevealItem className="text-center mb-10 md:mb-12">
            <p className="text-[11px] font-semibold text-muted-foreground tracking-[1.5px] uppercase mb-4">
              Plans
            </p>
            <h2 className="font-serif text-[32px] md:text-[44px] font-bold leading-[1.05] tracking-[-1px] text-foreground mb-3">
              Choose your plan
            </h2>
            <p className="text-[15px] font-light leading-[1.65] text-muted-foreground max-w-md mx-auto">
              Simple pricing that scales with your resort. No per-user fees, ever.
            </p>
            <div className="mt-6">
              <ResortSizeSelector value={resortSize} onChange={onResortSizeChange} />
            </div>
          </RevealItem>

          {/* Asymmetric 10-col grid: 3/4/3 with Professional pulled up */}
          <div className="grid grid-cols-1 md:grid-cols-10 gap-5 md:gap-6 max-w-6xl mx-auto items-start">
            {ordered.map((plan) => {
              const isHero = plan.id === 'professional';
              const isEssential = plan.id === 'essential';
              return (
                <RevealItem
                  key={plan.id}
                  className={
                    isHero
                      ? 'md:col-span-4 md:-mt-4 md:mb-4'
                      : isEssential
                        ? 'md:col-span-3'
                        : 'md:col-span-3'
                  }
                >
                  <PlanCard
                    plan={plan}
                    resortSize={resortSize}
                    emphasis={isHero ? 'hero' : isEssential ? 'quiet' : 'refined'}
                  />
                </RevealItem>
              );
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
