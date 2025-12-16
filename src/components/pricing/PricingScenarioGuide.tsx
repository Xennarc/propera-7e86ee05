import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, Map, Globe, ArrowRight } from 'lucide-react';

const SCENARIOS = [
  {
    icon: Building2,
    title: 'I run a single resort',
    description: 'Move off spreadsheets. Give guests a modern booking experience.',
    recommended: 'Essential or Professional',
    visual: (
      <div className="h-20 flex items-center justify-center">
        <div className="w-24 h-16 rounded-lg bg-gradient-to-br from-muted/50 to-muted/30 border border-border/50 flex items-center justify-center">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
    ),
  },
  {
    icon: Map,
    title: 'I run 2–5 properties',
    description: 'Coordinate multiple outlets and teams with shared visibility.',
    recommended: 'Professional',
    recommendedHighlight: true,
    visual: (
      <div className="h-20 flex items-center justify-center gap-2">
        <div className="w-14 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20" />
        <div className="w-14 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-primary/15 border border-primary/30" />
        <div className="w-14 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20" />
      </div>
    ),
  },
  {
    icon: Globe,
    title: 'I run a resort group',
    description: 'Portfolio analytics, loyalty, and AI insights at scale.',
    recommended: 'Elite',
    recommendedElite: true,
    visual: (
      <div className="h-20 flex items-center justify-center">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Globe className="h-8 w-8 text-violet-500" />
          </div>
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center text-white text-xs font-bold">
            5+
          </div>
        </div>
      </div>
    ),
  },
];

export function PricingScenarioGuide() {
  return (
    <section className="py-20 md:py-28 bg-background relative">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Which plan is right for you?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Find the perfect fit based on your portfolio size.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {SCENARIOS.map((scenario, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`h-full transition-all duration-300 hover:shadow-xl ${
                scenario.recommendedElite 
                  ? 'border-violet-500/30 hover:border-violet-500' 
                  : scenario.recommendedHighlight
                  ? 'border-primary/30 hover:border-primary'
                  : 'border-border hover:border-primary/30'
              }`}>
                <CardContent className="p-6 text-center">
                  {scenario.visual}
                  
                  <h3 className="text-xl font-bold text-foreground mb-2 mt-4">{scenario.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{scenario.description}</p>
                  
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${
                    scenario.recommendedElite 
                      ? 'bg-violet-500/10 text-violet-500' 
                      : scenario.recommendedHighlight
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-foreground'
                  }`}>
                    Recommended: {scenario.recommended}
                  </div>
                  
                  <Button 
                    asChild 
                    variant={scenario.recommendedElite ? 'default' : scenario.recommendedHighlight ? 'default' : 'outline'}
                    className={`w-full rounded-full font-semibold ${
                      scenario.recommendedElite 
                        ? 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 text-white' 
                        : ''
                    }`}
                  >
                    <a href="mailto:hello@propera.cc?subject=Demo Request">
                      Book a demo
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
