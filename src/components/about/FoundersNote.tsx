import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Quote } from 'lucide-react';

export function FoundersNote() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="py-24 md:py-32 bg-gradient-to-b from-card via-card to-primary/5 dark:from-card dark:via-card dark:to-card relative overflow-hidden">
      {/* Enhanced glows for light mode */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-primary/12 dark:bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-teal-400/10 dark:bg-teal-400/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto"
        >
          <div className="bg-background rounded-3xl border border-border/50 p-8 md:p-12 relative shadow-lg">
            {/* Quote icon */}
            <Quote className="h-12 w-12 text-primary/20 mb-6" />
            
            {/* Letter content */}
            <div className="space-y-6 text-lg md:text-xl text-foreground leading-relaxed">
              <p>
                Propera started with a simple idea: the best resorts shouldn't feel operationally heavy. Teams deserve tools that feel as refined as the experiences they deliver.
              </p>
              <p className="text-muted-foreground">
                We built Propera to disappear into the day — and let hospitality shine.
              </p>
            </div>

            {/* Signature area */}
            <div className="mt-10 pt-6 border-t border-border/50">
              <p className="text-sm text-muted-foreground">Founder's note</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
