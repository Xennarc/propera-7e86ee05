import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';

const trustPoints = [
  'Designed for real operations',
  'Mobile-first guest experience',
  'Clear roles for teams',
  'Consistent sync across portals',
];

export function TrustStrip() {
  const { shouldAnimate } = useAnimationPreference();

  return (
    <section className="py-10 md:py-14 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={shouldAnimate ? { opacity: 0 } : { opacity: 1 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-4 sm:gap-x-10 sm:gap-y-4"
        >
          {trustPoints.map((point, i) => (
            <motion.div
              key={point}
              initial={shouldAnimate ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-primary/12 dark:bg-primary/15 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5 text-primary" />
              </div>
              <span className="font-medium text-foreground/80 dark:text-foreground/90">{point}</span>
            </motion.div>
          ))}
        </motion.div>
        
        <motion.p
          initial={shouldAnimate ? { opacity: 0 } : { opacity: 1 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-muted-foreground/60 dark:text-muted-foreground/50 mt-4 md:mt-6"
        >
          Previews shown are illustrative.
        </motion.p>
      </div>
    </section>
  );
}
