import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Plane, CalendarCheck, Users, BarChart3 } from 'lucide-react';

const JOURNEY_STEPS = [
  {
    icon: Plane,
    title: 'Pre-arrival',
    description: 'Capture preferences before check-in.',
    feeling: 'Anticipation, not paperwork.',
    color: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  },
  {
    icon: CalendarCheck,
    title: 'In-stay booking',
    description: 'Guests browse and book instantly.',
    feeling: 'Clear, calm, and immediate.',
    color: 'bg-primary/10 text-primary border-primary/20',
  },
  {
    icon: Users,
    title: 'Staff operations',
    description: 'Teams see schedules and requests together.',
    feeling: 'Everyone aligned, nothing missed.',
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  },
  {
    icon: BarChart3,
    title: 'Post-stay insights',
    description: 'Understand what worked, improve what didn\'t.',
    feeling: 'Clarity that compounds.',
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
];

export function FlowJourney() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="py-24 md:py-32 bg-gradient-to-br from-background via-background to-teal-400/5 dark:from-background dark:via-background dark:to-background relative overflow-hidden">
      {/* Enhanced glows for light mode */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/12 dark:bg-primary/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-400/10 dark:bg-teal-400/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            One flow, end to end.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A system designed around how great stays actually happen.
          </p>
        </motion.div>

        {/* Journey cards - horizontal on desktop */}
        <div className="relative max-w-6xl mx-auto">
          {/* Timeline connector - desktop only */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500/30 via-primary/30 to-amber-500/30 -translate-y-1/2" />
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {JOURNEY_STEPS.map((step, index) => (
              <motion.div
                key={step.title}
                initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={reducedMotion ? {} : { y: -4, scale: 1.02 }}
                className="group"
              >
                <div className={`bg-card rounded-2xl border ${step.color} p-6 h-full transition-all duration-300 hover:shadow-lg relative`}>
                  {/* Step number */}
                  <div className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {index + 1}
                  </div>
                  
                  <div className={`w-14 h-14 rounded-xl ${step.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                    <step.icon className="h-7 w-7" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{step.description}</p>
                  
                  {/* Feeling line */}
                  <div className="pt-4 border-t border-border/50">
                    <p className="text-xs text-primary font-medium italic">"{step.feeling}"</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
