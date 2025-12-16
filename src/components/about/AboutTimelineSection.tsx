import { motion } from 'framer-motion';
import { Lightbulb, Code2, Users, Globe, Rocket, TrendingUp } from 'lucide-react';

const MILESTONES = [
  {
    year: '2023',
    title: 'The frustration begins',
    description: 'Our founders, working inside resort operations, saw teams drowning in spreadsheets, WhatsApp groups, and disconnected tools.',
    icon: Lightbulb,
    visual: (
      <div className="flex gap-1 mt-3">
        <div className="h-6 w-8 rounded bg-muted/50 border border-border/50" />
        <div className="h-6 w-8 rounded bg-muted/50 border border-border/50" />
        <div className="h-6 w-6 rounded bg-muted/50 border border-border/50" />
      </div>
    ),
  },
  {
    year: '2024',
    title: 'First prototype',
    description: 'We built what we wished existed: a unified console connecting activities, dining, and front desk—with a guest portal that actually works.',
    icon: Code2,
    visual: (
      <div className="mt-3 h-8 w-full rounded bg-primary/10 border border-primary/20 flex items-center px-2 gap-1">
        <div className="h-3 w-3 rounded-full bg-primary/40" />
        <div className="h-2 flex-1 rounded bg-muted/30" />
      </div>
    ),
  },
  {
    year: '2024',
    title: 'Real-world testing',
    description: 'Early resort partners helped us refine every flow—from pre-arrival booking to end-of-stay feedback. Their input shaped the product.',
    icon: Users,
    visual: (
      <div className="flex -space-x-2 mt-3">
        <div className="h-6 w-6 rounded-full bg-primary/30 border-2 border-card" />
        <div className="h-6 w-6 rounded-full bg-primary/40 border-2 border-card" />
        <div className="h-6 w-6 rounded-full bg-primary/50 border-2 border-card" />
      </div>
    ),
  },
  {
    year: '2025',
    title: 'Going global',
    description: 'From island resorts to ski lodges to urban hotels—Propera now serves properties across multiple continents and resort types.',
    icon: Globe,
    visual: (
      <div className="mt-3 h-8 w-full rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
        <div className="flex gap-1">
          <div className="h-2 w-2 rounded-full bg-primary/40" />
          <div className="h-2 w-2 rounded-full bg-primary/60" />
          <div className="h-2 w-2 rounded-full bg-primary" />
        </div>
      </div>
    ),
  },
  {
    year: 'Today',
    title: 'Building the future',
    description: 'Multi-resort portfolio management, advanced loyalty, AI-powered insights—we\'re just getting started on what resort tech can be.',
    icon: Rocket,
    visual: (
      <div className="mt-3 flex items-end gap-0.5 h-8">
        <div className="w-3 h-3 rounded-sm bg-primary/30" />
        <div className="w-3 h-4 rounded-sm bg-primary/40" />
        <div className="w-3 h-5 rounded-sm bg-primary/50" />
        <div className="w-3 h-6 rounded-sm bg-primary/60" />
        <div className="w-3 h-8 rounded-sm bg-primary" />
      </div>
    ),
  },
];

export function AboutTimelineSection() {
  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-card/50 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How Propera came to life
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From a frustration with fragmented tools to a platform trusted by resorts worldwide.
          </p>
        </motion.div>

        {/* Desktop Timeline */}
        <div className="hidden lg:block max-w-5xl mx-auto">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-border" />
            
            <div className="grid grid-cols-5 gap-4">
              {MILESTONES.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pt-12"
                >
                  {/* Timeline dot */}
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-4 border-background shadow-lg" />
                  
                  <div className="bg-card rounded-xl border border-border/50 p-4 h-full">
                    <div className="flex items-center gap-2 mb-2">
                      <milestone.icon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">{milestone.year}</span>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-2">{milestone.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{milestone.description}</p>
                    {milestone.visual}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Timeline */}
        <div className="lg:hidden max-w-md mx-auto">
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute top-0 bottom-0 left-6 w-0.5 bg-border" />
            
            <div className="space-y-6">
              {MILESTONES.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-16"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-4 top-4 w-4 h-4 rounded-full bg-primary border-4 border-background shadow-lg" />
                  
                  <div className="bg-card rounded-xl border border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <milestone.icon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">{milestone.year}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{milestone.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{milestone.description}</p>
                    {milestone.visual}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
