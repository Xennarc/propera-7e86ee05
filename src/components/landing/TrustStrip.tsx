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
    <section className="py-14 bg-background relative overflow-hidden">
      {/* Subtle top edge highlight */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
      
      <div className="container mx-auto px-4">
        <motion.div
          initial={shouldAnimate ? { opacity: 0 } : { opacity: 1 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-x-10 gap-y-4"
        >
          {trustPoints.map((point, i) => (
            <motion.div
              key={point}
              initial={shouldAnimate ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <div className="w-5 h-5 rounded-full bg-primary/12 dark:bg-primary/15 flex items-center justify-center">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
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
          className="text-center text-xs text-muted-foreground/60 dark:text-muted-foreground/50 mt-6"
        >
          Previews shown are illustrative.
        </motion.p>
      </div>
    </section>
  );
}
