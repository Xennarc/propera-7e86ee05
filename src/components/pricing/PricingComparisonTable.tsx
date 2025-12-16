import { motion } from 'framer-motion';
import { Check, Minus, Star, Sparkles } from 'lucide-react';

interface ComparisonFeature {
  name: string;
  essential: boolean | string;
  professional: boolean | string;
  elite: boolean | string;
}

interface PricingComparisonTableProps {
  features: ComparisonFeature[];
}

const FEATURE_GROUPS = [
  {
    title: 'Guest Experience',
    features: [
      'Guest web portal',
      'Activity & restaurant bookings',
      'Booking cancellation',
      'Booking modification',
      'Guest notifications',
      'Stay feedback collection',
      'Multi-language portal',
      'Pre-arrival booking',
      'Custom branding',
    ],
  },
  {
    title: 'Staff Operations',
    features: [
      'Guest records & PIN management',
      'CSV guest import',
      'Guest 360° profile',
      'Guest requests queue',
      'Recurring schedules',
      'Closure day management',
      "Today's opportunities",
      'In-stay upsell suggestions',
      'Booking source tracking',
    ],
  },
  {
    title: 'Analytics & Insights',
    features: [
      'Basic reports',
      'Operational reports (activities, restaurants)',
      'Guest & feedback reports',
      'CSV export',
      'Sales performance analytics',
      'Revenue attribution by source',
      'Guest segment analysis',
      'Cancellation loss tracking',
      'AI Revenue Coach',
      'AI-powered insights on all reports',
    ],
  },
  {
    title: 'Loyalty & Advanced',
    features: [
      'Loyalty program',
      'Loyalty tiers & rewards',
      'Loyalty member management',
      'Booking health check',
    ],
  },
];

function FeatureIcon({ value, tier }: { value: boolean | string; tier: string }) {
  if (typeof value === 'string') {
    return (
      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
        tier === 'elite' ? 'bg-violet-500/10 text-violet-500' :
        tier === 'professional' ? 'bg-primary/10 text-primary' :
        'bg-muted text-muted-foreground'
      }`}>
        {value}
      </span>
    );
  }
  
  if (!value) {
    return <Minus className="h-4 w-4 text-muted-foreground/40" />;
  }
  
  if (tier === 'elite') {
    return (
      <div className="h-6 w-6 rounded-full bg-violet-500/10 flex items-center justify-center">
        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
      </div>
    );
  }
  
  if (tier === 'professional') {
    return (
      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
        <Star className="h-3.5 w-3.5 text-primary" />
      </div>
    );
  }
  
  return (
    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
      <Check className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}

export function PricingComparisonTable({ features }: PricingComparisonTableProps) {
  const getFeatureValue = (name: string, tier: 'essential' | 'professional' | 'elite') => {
    const feature = features.find(f => f.name === name);
    return feature ? feature[tier] : false;
  };

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
            Compare plans at a glance
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See which features are included in each plan.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto overflow-x-auto"
        >
          <table className="w-full border-collapse">
            {/* Header */}
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-4 px-4 font-medium text-muted-foreground w-1/2">Feature</th>
                <th className="text-center py-4 px-4 w-1/6">
                  <div className="font-semibold text-foreground">Essential</div>
                </th>
                <th className="text-center py-4 px-4 w-1/6 bg-primary/5">
                  <div className="font-semibold text-primary">Professional</div>
                  <div className="text-xs text-primary/70 font-normal">Most popular</div>
                </th>
                <th className="text-center py-4 px-4 w-1/6 bg-violet-500/5">
                  <div className="font-semibold text-violet-500">Elite</div>
                </th>
              </tr>
            </thead>
            
            <tbody>
              {FEATURE_GROUPS.map((group, groupIndex) => (
                <>
                  {/* Group header */}
                  <tr key={`group-${groupIndex}`} className="bg-muted/30">
                    <td colSpan={4} className="py-3 px-4 font-semibold text-foreground text-sm">
                      {group.title}
                    </td>
                  </tr>
                  
                  {/* Features */}
                  {group.features.map((featureName, featureIndex) => (
                    <tr key={`${groupIndex}-${featureIndex}`} className="border-b border-border/50 hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-4 text-sm text-foreground">{featureName}</td>
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
                          <FeatureIcon value={getFeatureValue(featureName, 'elite')} tier="elite" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
