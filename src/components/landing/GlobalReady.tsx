import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';

const regionChips = ['Island resorts', 'City resorts', 'Mountain retreats'];

export function GlobalReady() {
  const { shouldAnimate } = useAnimationPreference();

  return (
    <section className="py-24 bg-background relative overflow-hidden atlas-texture">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-400/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center globe-wireframe-bg"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-teal-400/10 flex items-center justify-center text-primary mx-auto mb-8 shadow-lg shadow-primary/10">
            <Globe className="h-8 w-8" />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Built for resorts worldwide.</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            From boutique hideaways to multi-property groups — Propera keeps the experience consistent.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {regionChips.map((chip, i) => (
              <motion.div
                key={chip}
                initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <span className="glass-pill">{chip}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
