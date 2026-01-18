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
    <section className="py-16 md:py-24 lg:py-32 bg-gradient-to-br from-background via-background to-teal-400/5 dark:from-background dark:via-background dark:to-background relative overflow-hidden">
      {/* Enhanced glows for light mode - hidden on mobile */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-primary/12 dark:bg-primary/5 rounded-full blur-[80px] md:blur-[150px] pointer-events-none hidden sm:block" />
      <div className="absolute bottom-0 right-0 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-teal-400/10 dark:bg-teal-400/5 rounded-full blur-[60px] md:blur-[120px] pointer-events-none hidden sm:block" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-3 md:mb-4">
            One flow, end to end.
          </h2>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            A system designed around how great stays actually happen.
          </p>
        </motion.div>

        {/* Journey cards - horizontal on desktop */}
        <div className="relative max-w-6xl mx-auto">
          {/* Timeline connector - desktop only */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-teal-500/30 via-primary/30 to-amber-500/30 -translate-y-1/2" />
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
                <div className={`bg-card rounded-2xl border ${step.color} p-5 sm:p-6 h-full transition-all duration-300 hover:shadow-lg relative`}>
                  {/* Step number */}
                  <div className="absolute -top-2.5 -left-2.5 sm:-top-3 sm:-left-3 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {index + 1}
                  </div>
                  
                  <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-xl ${step.color} flex items-center justify-center mb-4 sm:mb-5 group-hover:scale-110 transition-transform`}>
                    <step.icon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  
                  <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 leading-relaxed">{step.description}</p>
                  
                  {/* Feeling line */}
                  <div className="pt-3 sm:pt-4 border-t border-border/50">
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
