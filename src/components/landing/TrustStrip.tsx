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
    <section className="py-12 bg-background border-y border-border/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={shouldAnimate ? { opacity: 0 } : { opacity: 1 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-x-8 gap-y-4"
        >
          {trustPoints.map((point, i) => (
            <motion.div
              key={point}
              initial={shouldAnimate ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <span>{point}</span>
            </motion.div>
          ))}
        </motion.div>
        
        <motion.p
          initial={shouldAnimate ? { opacity: 0 } : { opacity: 1 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center text-xs text-muted-foreground/60 mt-4"
        >
          Previews shown are illustrative.
        </motion.p>
      </div>
    </section>
  );
}
