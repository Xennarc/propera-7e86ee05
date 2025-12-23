import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

const PRINCIPLES = [
  'Hospitality is detail.',
  'Software should feel calm.',
  'Beautiful tools elevate service.',
  'Clarity creates confidence.',
  'Every guest journey deserves precision.',
];

export function PrinciplesSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="py-24 md:py-32 bg-background relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            What we believe
          </h2>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-6">
            {PRINCIPLES.map((principle, index) => (
              <motion.div
                key={principle}
                initial={reducedMotion ? {} : { opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center gap-4 group"
              >
                <div className="w-3 h-3 rounded-full bg-primary/30 group-hover:bg-primary group-hover:scale-125 transition-all flex-shrink-0" />
                <p className="text-lg md:text-xl text-foreground font-medium leading-relaxed">
                  {principle}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
