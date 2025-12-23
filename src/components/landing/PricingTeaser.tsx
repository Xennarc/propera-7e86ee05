import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';

export function PricingTeaser() {
  const { shouldAnimate } = useAnimationPreference();

  return (
    <section className="py-24 bg-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Plans that scale with your resort.
          </h2>
          
          <p className="text-lg text-muted-foreground mb-8">
            Choose a plan that fits today — upgrade as you grow.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild size="lg" className="rounded-xl px-8 h-12">
              <Link to="/pricing">
                View pricing
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="rounded-xl px-8 h-12">
              <Link to="/auth">
                Book a demo
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
