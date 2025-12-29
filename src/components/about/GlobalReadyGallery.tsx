import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { TreePalm, Mountain, Building2, Compass, Sparkles, Home } from 'lucide-react';

const RESORT_TYPES = [
  { icon: TreePalm, label: 'Island resort', gradient: 'from-teal-500/20 to-cyan-500/10' },
  { icon: Mountain, label: 'Mountain retreat', gradient: 'from-slate-500/20 to-blue-500/10' },
  { icon: Building2, label: 'City hotel resort', gradient: 'from-violet-500/20 to-purple-500/10' },
  { icon: Compass, label: 'Safari lodge', gradient: 'from-amber-500/20 to-orange-500/10' },
  { icon: Sparkles, label: 'Wellness sanctuary', gradient: 'from-emerald-500/20 to-green-500/10' },
  { icon: Home, label: 'Private villas', gradient: 'from-rose-500/20 to-pink-500/10' },
];

export function GlobalReadyGallery() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="py-24 md:py-32 bg-gradient-to-br from-teal-400/5 via-background to-primary/5 dark:from-background dark:via-background dark:to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-card/50 dark:from-card/30 to-transparent pointer-events-none" />
      {/* Enhanced glows */}
      <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-teal-400/10 dark:bg-teal-400/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] bg-primary/10 dark:bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Built for resorts worldwide.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Boutique hideaways. Urban resorts. Multi-property groups. The experience stays consistent.
          </p>
        </motion.div>

        {/* Resort types gallery */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          {RESORT_TYPES.map((type, index) => (
            <motion.div
              key={type.label}
              initial={reducedMotion ? {} : { opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={reducedMotion ? {} : { y: -4, scale: 1.03 }}
              className="group"
            >
              <div className={`relative bg-gradient-to-br ${type.gradient} rounded-2xl border border-border/50 p-6 h-32 md:h-40 flex flex-col items-center justify-center transition-all duration-300 hover:shadow-lg hover:border-primary/30 overflow-hidden`}>
                {/* Subtle pattern */}
                <div className="absolute inset-0 opacity-5">
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)',
                    backgroundSize: '24px 24px'
                  }} />
                </div>
                
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-background/80 backdrop-blur-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                  <type.icon className="h-6 w-6 md:h-7 md:w-7 text-foreground" />
                </div>
                <span className="text-sm md:text-base font-medium text-foreground text-center">{type.label}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
