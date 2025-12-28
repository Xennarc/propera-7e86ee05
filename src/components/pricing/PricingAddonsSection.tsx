import { motion } from 'framer-motion';
import { Sparkles, Package, BarChart2, Headphones, FileEdit, Check } from 'lucide-react';

interface Addon {
  name: string;
  price: string;
  description: string;
}

interface Onboarding {
  priceRange: string;
  label: string;
  description: string;
}

interface PricingAddonsSectionProps {
  addons: Addon[];
  onboarding: Onboarding;
}

const ADDON_CONFIG: Record<string, { icon: typeof Package; vibe: string }> = {
  'Loyalty Program Suite': { icon: Sparkles, vibe: 'Build lasting guest relationships.' },
  'Analytics Plus': { icon: BarChart2, vibe: 'Deeper visibility for data-driven teams.' },
  'Premium Support': { icon: Headphones, vibe: 'Faster answers when you need them.' },
  'Managed Content': { icon: FileEdit, vibe: 'A finishing touch for teams that want more polish.' },
};

const ONBOARDING_STEPS = ['Resort setup', 'Catalog & branding', 'Training & launch check'];

export function PricingAddonsSection({ addons, onboarding }: PricingAddonsSectionProps) {
  return (
    <section className="py-16 md:py-20 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/4 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Enhancements */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Sparkles className="h-4 w-4" />
            Enhancements
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Enhancements
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Add capabilities when you need them — with the same crafted experience.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mb-16">
          {addons.map((addon, index) => {
            const config = ADDON_CONFIG[addon.name] || { icon: Package, vibe: '' };
            const Icon = config.icon;
            return (
              <motion.div
                key={addon.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="module-card-premium"
              >
                <div className="icon-orb-gradient h-10 w-10 mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{addon.name}</h3>
                <p className="text-sm font-medium text-primary mb-2">{addon.price}</p>
                <p className="text-xs text-muted-foreground/80 italic mb-2">{config.vibe}</p>
                <p className="text-xs text-muted-foreground">{addon.description}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Onboarding */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <div className="lagoon-glass rounded-2xl p-8">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-bold text-foreground mb-2">White-glove onboarding</h3>
                <p className="text-3xl font-extrabold text-primary mb-1">{onboarding.priceRange}</p>
                <p className="text-sm text-muted-foreground mb-4">{onboarding.label}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We'll set up your resort, polish the experience, and make sure your team is ready.
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-foreground mb-3">What's included</p>
                <ul className="space-y-2">
                  {ONBOARDING_STEPS.map((step, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-5 w-5 rounded-full bg-primary/15 flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary" />
                      </div>
                      {step}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-muted-foreground mt-4">
                  Timeline depends on resort complexity.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
