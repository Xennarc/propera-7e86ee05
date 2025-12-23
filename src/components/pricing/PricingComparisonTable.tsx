import { motion } from 'framer-motion';
import { Check, Minus, Star, Sparkles, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface ComparisonFeature {
  name: string;
  essential: boolean | string;
  professional: boolean | string;
  enterprise: boolean | string;
}

interface PricingComparisonTableProps {
  features: ComparisonFeature[];
}

const FEATURE_GROUPS = [
  {
    title: 'Core Features',
    icon: '📱',
    features: [
      'Guest Portal + Staff Console',
      'Activities, Excursions & Spa bookings',
      'Guest profiles + pre-arrival details',
      'Live availability + capacity controls',
      'Email notifications',
      'Standard support',
    ],
  },
  {
    title: 'Operations',
    icon: '⚙️',
    features: [
      'Restaurant bookings + request routing',
      'Department views',
      'Advanced scheduling controls',
      'Role-based access',
      'Analytics: bookings, utilization, cancellations',
    ],
  },
  {
    title: 'Enterprise Features',
    icon: '🏢',
    features: [
      'Enhanced white-label branding',
      'Priority support + faster response times',
      'Advanced analytics + performance reporting',
      'Integration readiness (API/webhooks)',
      'Optional SLA packages',
    ],
  },
];

function FeatureIcon({ value, tier }: { value: boolean | string; tier: string }) {
  if (typeof value === 'string') {
    return (
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
        tier === 'enterprise' ? 'bg-violet-500/10 text-violet-500' :
        tier === 'professional' ? 'bg-primary/10 text-primary' :
        'bg-muted text-muted-foreground'
      }`}>
        {value}
      </span>
    );
  }
  
  if (!value) {
    return <Minus className="h-4 w-4 text-muted-foreground/30" />;
  }
  
  if (tier === 'enterprise') {
    return (
      <motion.div 
        className="h-6 w-6 rounded-full bg-violet-500/10 flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
      >
        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
      </motion.div>
    );
  }
  
  if (tier === 'professional') {
    return (
      <motion.div 
        className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
      >
        <Star className="h-3.5 w-3.5 text-primary" />
      </motion.div>
    );
  }
  
  return (
    <motion.div 
      className="h-6 w-6 rounded-full bg-muted flex items-center justify-center"
      whileHover={{ scale: 1.1 }}
    >
      <Check className="h-3.5 w-3.5 text-muted-foreground" />
    </motion.div>
  );
}

// Mobile accordion view
function MobileComparisonView({ features, getFeatureValue }: { 
  features: ComparisonFeature[]; 
  getFeatureValue: (name: string, tier: 'essential' | 'professional' | 'enterprise') => boolean | string;
}) {
  return (
    <div className="md:hidden">
      <Accordion type="multiple" className="space-y-3">
        {FEATURE_GROUPS.map((group, groupIndex) => (
          <AccordionItem 
            key={groupIndex} 
            value={`group-${groupIndex}`}
            className="bg-card rounded-xl border border-border/50 overflow-hidden"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <span className="flex items-center gap-2 font-semibold text-foreground">
                <span>{group.icon}</span>
                {group.title}
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3">
                {group.features.map((featureName, featureIndex) => (
                  <div key={featureIndex} className="border-b border-border/30 pb-3 last:border-0 last:pb-0">
                    <div className="text-sm font-medium text-foreground mb-2">{featureName}</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[10px] text-muted-foreground">Essential</span>
                        <FeatureIcon value={getFeatureValue(featureName, 'essential')} tier="essential" />
                      </div>
                      <div className="flex flex-col items-center gap-1 bg-primary/5 rounded-lg py-1">
                        <span className="text-[10px] text-primary">Pro</span>
                        <FeatureIcon value={getFeatureValue(featureName, 'professional')} tier="professional" />
                      </div>
                      <div className="flex flex-col items-center gap-1 bg-violet-500/5 rounded-lg py-1">
                        <span className="text-[10px] text-violet-500">Enterprise</span>
                        <FeatureIcon value={getFeatureValue(featureName, 'enterprise')} tier="enterprise" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

export function PricingComparisonTable({ features }: PricingComparisonTableProps) {
  const getFeatureValue = (name: string, tier: 'essential' | 'professional' | 'enterprise') => {
    const feature = features.find(f => f.name === name);
    return feature ? feature[tier] : false;
  };

  return (
    <section className="py-20 md:py-28 bg-card relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-primary/3 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Compare plans at a glance
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See which features are included in each plan.
          </p>
        </motion.div>

        {/* Mobile view */}
        <MobileComparisonView features={features} getFeatureValue={getFeatureValue} />

        {/* Desktop table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="hidden md:block max-w-5xl mx-auto"
        >
          <div className="bg-background/50 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden">
            <table className="w-full border-collapse">
              {/* Header */}
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-5 px-6 font-medium text-muted-foreground w-1/2">Feature</th>
                  <th className="text-center py-5 px-4 w-1/6">
                    <div className="font-semibold text-foreground">Essential</div>
                    <div className="text-xs text-muted-foreground font-normal mt-0.5">$499/mo</div>
                  </th>
                  <th className="text-center py-5 px-4 w-1/6 bg-primary/5 rounded-t-xl">
                    <div className="font-semibold text-primary">Professional</div>
                    <div className="text-xs text-primary/70 font-normal mt-0.5">$899/mo</div>
                  </th>
                  <th className="text-center py-5 px-4 w-1/6 bg-violet-500/5 rounded-t-xl">
                    <div className="font-semibold text-violet-500">Enterprise</div>
                    <div className="text-xs text-violet-400 font-normal mt-0.5">$1,499/mo</div>
                  </th>
                </tr>
              </thead>
              
              <tbody>
                {FEATURE_GROUPS.map((group, groupIndex) => (
                  <>
                    {/* Group header */}
                    <tr key={`group-${groupIndex}`}>
                      <td colSpan={4} className="py-4 px-6">
                        <div className="flex items-center gap-2 font-semibold text-foreground text-sm bg-muted/30 rounded-lg px-3 py-2 -mx-1">
                          <span>{group.icon}</span>
                          {group.title}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Features */}
                      {group.features.map((featureName, featureIndex) => (
                        <motion.tr 
                          key={`${groupIndex}-${featureIndex}`} 
                          className="border-b border-border/30 hover:bg-muted/5 transition-colors"
                          initial={{ opacity: 0 }}
                          whileInView={{ opacity: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: featureIndex * 0.02 }}
                        >
                          <td className="py-3 px-6 text-sm text-foreground">{featureName}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex justify-center">
                              <FeatureIcon value={getFeatureValue(featureName, 'essential')} tier="essential" />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center bg-primary/5">
                            <div className="flex justify-center">
                              <FeatureIcon value={getFeatureValue(featureName, 'professional')} tier="professional" />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center bg-violet-500/5">
                            <div className="flex justify-center">
                              <FeatureIcon value={getFeatureValue(featureName, 'enterprise')} tier="enterprise" />
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
