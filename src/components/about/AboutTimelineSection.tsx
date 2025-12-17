import { motion, useReducedMotion } from 'framer-motion';
import { Lightbulb, Code2, Users, Globe, Rocket } from 'lucide-react';

const MILESTONES = [
  {
    year: '2023',
    title: 'The frustration begins',
    description: 'Teams drowning in spreadsheets and disconnected tools.',
    icon: Lightbulb,
    visual: (
      <div className="relative">
        <div className="flex gap-1.5 opacity-40">
          <div className="h-8 w-10 rounded bg-muted/50 border border-border/30 blur-[0.5px]" />
          <div className="h-8 w-8 rounded bg-muted/50 border border-border/30 blur-[0.5px]" />
          <div className="h-8 w-6 rounded bg-muted/50 border border-border/30 blur-[0.5px]" />
        </div>
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-500/50 animate-pulse" />
      </div>
    ),
  },
  {
    year: '2024',
    title: 'First prototype',
    description: 'A unified console connecting activities, dining, and front desk.',
    icon: Code2,
    visual: (
      <div className="bg-card/80 rounded-lg border border-primary/20 p-2 shadow-sm">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[8px] text-primary">Live</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          <div className="h-4 rounded bg-primary/20" />
          <div className="h-4 rounded bg-primary/15" />
          <div className="h-4 rounded bg-primary/10" />
        </div>
      </div>
    ),
  },
  {
    year: '2024',
    title: 'Real-world testing',
    description: 'Resort partners shaped every flow with hands-on feedback.',
    icon: Users,
    visual: (
      <div className="flex items-center">
        <div className="flex -space-x-2">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/40 to-primary/20 border-2 border-background" />
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-teal-400/40 to-teal-400/20 border-2 border-background" />
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-400/40 to-violet-400/20 border-2 border-background" />
        </div>
        <div className="ml-2 h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-[10px] text-primary">+5</span>
        </div>
      </div>
    ),
  },
  {
    year: '2025',
    title: 'Going global',
    description: 'From islands to ski lodges to urban hotels — worldwide.',
    icon: Globe,
    visual: (
      <div className="relative w-full h-10">
        <div className="absolute inset-0 rounded-full border border-primary/20 opacity-30" />
        <div className="absolute inset-1 rounded-full border border-primary/15 opacity-40" />
        <div className="absolute inset-2 rounded-full border border-primary/10 opacity-50" />
        <motion.div 
          className="absolute top-2 left-3 w-2 h-2 rounded-full bg-emerald-500"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div 
          className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        />
        <motion.div 
          className="absolute bottom-2 left-1/2 w-2 h-2 rounded-full bg-amber-500"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
        />
      </div>
    ),
  },
  {
    year: 'Today',
    title: 'Building the future',
    description: 'Multi-resort management, loyalty, AI-powered insights.',
    icon: Rocket,
    visual: (
      <div className="flex items-end gap-0.5 h-10">
        <motion.div 
          className="w-3 h-3 rounded-sm bg-primary/30"
          initial={{ height: 0 }}
          whileInView={{ height: 12 }}
          viewport={{ once: true }}
        />
        <motion.div 
          className="w-3 rounded-sm bg-primary/40"
          initial={{ height: 0 }}
          whileInView={{ height: 18 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        />
        <motion.div 
          className="w-3 rounded-sm bg-primary/50"
          initial={{ height: 0 }}
          whileInView={{ height: 24 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        />
        <motion.div 
          className="w-3 rounded-sm bg-primary/60"
          initial={{ height: 0 }}
          whileInView={{ height: 30 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        />
        <motion.div 
          className="w-3 rounded-sm bg-primary"
          initial={{ height: 0 }}
          whileInView={{ height: 40 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        />
      </div>
    ),
  },
];

export function AboutTimelineSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="py-20 md:py-28 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-card/50 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
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
            {/* Timeline line with gradient */}
            <div className="absolute top-10 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-primary rounded-full" />
            
            <div className="grid grid-cols-5 gap-4">
              {MILESTONES.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pt-16"
                >
                  {/* Timeline dot with glow */}
                  <div className="absolute top-7 left-1/2 -translate-x-1/2">
                    <div className="w-6 h-6 rounded-full bg-primary border-4 border-background shadow-lg shadow-primary/20" />
                    <div className="absolute inset-0 w-6 h-6 rounded-full bg-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
                  </div>
                  
                  <div className="bg-card rounded-xl border border-border/50 p-4 h-full hover:border-primary/30 transition-colors group">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <milestone.icon className="h-4 w-4 text-primary group-hover:text-primary-foreground" />
                      </div>
                      <span className="text-xs font-bold text-primary">{milestone.year}</span>
                    </div>
                    <h3 className="font-semibold text-foreground text-sm mb-2">{milestone.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{milestone.description}</p>
                    <div className="mt-auto">
                      {milestone.visual}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Timeline */}
        <div className="lg:hidden max-w-md mx-auto">
          <div className="relative">
            {/* Timeline line with gradient */}
            <div className="absolute top-0 bottom-0 left-6 w-1 bg-gradient-to-b from-primary/20 via-primary/40 to-primary rounded-full" />
            
            <div className="space-y-6">
              {MILESTONES.map((milestone, index) => (
                <motion.div
                  key={index}
                  initial={reducedMotion ? {} : { opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="relative pl-16"
                >
                  {/* Timeline dot */}
                  <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-primary border-4 border-background shadow-lg shadow-primary/20" />
                  
                  <div className="bg-card rounded-xl border border-border/50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <milestone.icon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-semibold text-primary">{milestone.year}</span>
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{milestone.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">{milestone.description}</p>
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
