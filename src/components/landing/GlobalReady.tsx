import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';
import { GuestJourneyFlow } from '@/components/illustrations/GuestJourneyFlow';

const regionChips = ['Island resorts', 'City resorts', 'Mountain retreats', 'Boutique hotels', 'Beach clubs'];

export function GlobalReady() {
  const { shouldAnimate } = useAnimationPreference();

  return (
    <section className="py-24 bg-background relative overflow-hidden atlas-texture">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-400/5 rounded-full blur-[80px] pointer-events-none" />
      
      {/* Decorative globe wireframe */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
          <ellipse cx="100" cy="100" rx="80" ry="30" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
          <ellipse cx="100" cy="100" rx="80" ry="50" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
          <ellipse cx="100" cy="100" rx="30" ry="80" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
          <ellipse cx="100" cy="100" rx="50" ry="80" fill="none" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
          <line x1="20" y1="100" x2="180" y2="100" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
          <line x1="100" y1="20" x2="100" y2="180" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
        </svg>
      </div>

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center mb-12"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/15 to-teal-400/10 flex items-center justify-center text-primary mx-auto mb-8 shadow-lg shadow-primary/10">
            <Globe className="h-8 w-8" />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Built for resorts worldwide.</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            From boutique hideaways to multi-property groups — Propera keeps the experience consistent.
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-16">
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

        {/* Guest Journey Flow Animation */}
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 30 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="max-w-5xl mx-auto"
        >
          <div className="text-center mb-8">
            <h3 className="text-xl font-semibold text-foreground mb-2">The guest journey, seamlessly connected</h3>
            <p className="text-sm text-muted-foreground">Every touchpoint, from booking to departure</p>
          </div>
          <GuestJourneyFlow />
        </motion.div>
      </div>
    </section>
  );
}
