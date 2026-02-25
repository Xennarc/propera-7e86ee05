import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';

export function PricingTeaser() {
  const { shouldAnimate } = useAnimationPreference();

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container relative mx-auto px-4">
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ willChange: 'opacity, transform' }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
            <Sparkles className="h-4 w-4" />
            <span>Simple, transparent pricing</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Plans that scale with your resort.
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Choose a plan that fits today — upgrade as you grow.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="bg-primary text-primary-foreground rounded-full px-8 h-12 font-semibold glow-lime group hover:-translate-y-0.5 transition-all">
              <Link to="/pricing">
                View pricing
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-full px-8 h-12 border-border/50 hover:border-primary/30">
              <Link to="/book-demo">
                Book a demo
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
