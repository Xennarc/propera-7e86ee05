import { motion, useReducedMotion } from 'framer-motion';
import { Layers } from 'lucide-react';

export function PricingHeroSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative min-h-[60vh] flex items-center overflow-hidden pt-28 pb-12">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/30" />
      
      {/* Glassy floating orbs */}
      <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[300px] h-[300px] bg-teal-400/6 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border/50 text-foreground px-4 py-2 rounded-full text-sm font-medium mb-6 shadow-sm">
            <Layers className="h-4 w-4 text-primary" />
            Simple, transparent pricing
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight tracking-tight">
            Plans that{' '}
            <span className="text-primary">scale</span>
            {' '}with your resorts
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
            From boutique properties to global portfolios. Unlimited staff on every plan.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
