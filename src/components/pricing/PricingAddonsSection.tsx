import { motion } from 'framer-motion';
import { Plus, Package, BarChart2, Headphones, FileEdit } from 'lucide-react';

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

const ADDON_ICONS: Record<string, any> = {
  'Integrations Pack': Package,
  'Analytics Plus': BarChart2,
  'Premium Support': Headphones,
  'Managed Content': FileEdit,
};

export function PricingAddonsSection({ addons, onboarding }: PricingAddonsSectionProps) {
  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/3 via-transparent to-transparent" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Plus className="h-4 w-4" />
            Add-ons
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Extend your plan
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Optional add-ons to enhance your resort operations.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto mb-16">
          {addons.map((addon, index) => {
            const Icon = ADDON_ICONS[addon.name] || Package;
            return (
              <motion.div
                key={addon.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-xl border border-border/50 p-5 hover:border-primary/30 hover:shadow-lg transition-all"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">{addon.name}</h3>
                <p className="text-sm font-medium text-primary mb-2">{addon.price}</p>
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
          <div className="bg-card rounded-2xl border border-border/50 p-8 text-center">
            <h3 className="text-xl font-bold text-foreground mb-2">Onboarding & Setup</h3>
            <p className="text-3xl font-extrabold text-primary mb-1">{onboarding.priceRange}</p>
            <p className="text-sm text-muted-foreground mb-4">{onboarding.label}</p>
            <p className="text-muted-foreground">{onboarding.description}</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}