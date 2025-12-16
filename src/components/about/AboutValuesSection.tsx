import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Smartphone, LayoutGrid, Globe, BarChart3 } from 'lucide-react';

const VALUES = [
  {
    icon: Smartphone,
    title: 'Software should disappear into the stay',
    description: 'Guests see their resort, not our tech. Propera works behind the scenes so every interaction feels native to the property.',
    visual: (
      <div className="relative h-24 mt-4 rounded-lg overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="absolute inset-2 bg-card rounded-md border border-border/50 p-2">
          <div className="h-8 w-full rounded bg-primary/10 mb-1" />
          <div className="flex gap-1">
            <div className="h-4 w-4 rounded bg-primary/20" />
            <div className="h-4 flex-1 rounded bg-muted/50" />
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: LayoutGrid,
    title: 'Every department should see the same reality',
    description: 'Activities, dining, spa, front desk—all operating from one shared source of truth. No more silos, no more surprises.',
    visual: (
      <div className="relative h-24 mt-4 rounded-lg overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="absolute inset-2 flex gap-1">
          <div className="flex-1 bg-card rounded border border-border/50 p-1">
            <div className="h-3 w-full rounded bg-emerald-500/30 mb-1" />
            <div className="h-2 w-3/4 rounded bg-muted/50" />
          </div>
          <div className="flex-1 bg-card rounded border border-border/50 p-1">
            <div className="h-3 w-full rounded bg-blue-500/30 mb-1" />
            <div className="h-2 w-3/4 rounded bg-muted/50" />
          </div>
          <div className="flex-1 bg-card rounded border border-border/50 p-1">
            <div className="h-3 w-full rounded bg-amber-500/30 mb-1" />
            <div className="h-2 w-3/4 rounded bg-muted/50" />
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Globe,
    title: 'Global portfolio, local personality',
    description: 'Standardize operations across properties while preserving each resort\'s unique identity and guest experience.',
    visual: (
      <div className="relative h-24 mt-4 rounded-lg overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="absolute inset-2 flex items-center justify-center gap-2">
          <div className="h-12 w-12 rounded-full bg-card border border-border/50 flex items-center justify-center">
            <div className="h-6 w-6 rounded-full bg-primary/20" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="h-8 w-16 bg-card rounded border border-border/50" />
            <div className="h-8 w-16 bg-card rounded border border-border/50" />
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: BarChart3,
    title: 'Data is for decisions, not dashboards',
    description: 'We surface insights that help you act—not just reports to admire. Every metric ties back to better guest outcomes.',
    visual: (
      <div className="relative h-24 mt-4 rounded-lg overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="absolute inset-2 bg-card rounded border border-border/50 p-2 flex items-end gap-1">
          <div className="flex-1 h-8 rounded-t bg-primary/30" />
          <div className="flex-1 h-12 rounded-t bg-primary/40" />
          <div className="flex-1 h-10 rounded-t bg-primary/30" />
          <div className="flex-1 h-14 rounded-t bg-primary/50" />
          <div className="flex-1 h-16 rounded-t bg-primary" />
        </div>
      </div>
    ),
  },
];

export function AboutValuesSection() {
  return (
    <section className="py-20 md:py-28 bg-card relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What we believe about modern resort operations
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            The principles that shape every feature we build and every decision we make.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {VALUES.map((value, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full bg-background border-border/50 hover:border-primary/30 transition-all duration-300 group">
                <CardContent className="p-6">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <value.icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{value.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                  {value.visual}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
