import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';
import { RibbonDivider } from './RibbonDivider';

const reassurancePoints = ['Unlimited staff included', 'Multi-resort ready', 'Elegant by design'];

export function HomeFinalCTA() {
  const { shouldAnimate } = useAnimationPreference();

  return (
    <section className="relative overflow-hidden">
      <RibbonDivider className="mb-0" variant="accent" />
      
      <div className="py-24 cta-spotlight atlas-texture">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-teal-400/8" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/12 rounded-full blur-[120px] pointer-events-none" />

        <div className="container relative mx-auto px-4 z-10">
          <motion.div
            initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              See Propera with your{' '}
              <span className="text-gradient bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                resort's branding.
              </span>
            </h2>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              A calmer operation. A better guest journey. A system your team enjoys using.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <Button asChild size="lg" className="btn-cta-premium text-base px-8 h-14 rounded-xl text-primary-foreground transition-all duration-200 group">
                <Link to="/book-demo">
                  Book a demo
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="btn-ghost-premium text-base px-8 h-14 rounded-xl">
                <Link to="/pricing">View pricing</Link>
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {reassurancePoints.map((point, i) => (
                <motion.span
                  key={point}
                  initial={shouldAnimate ? { opacity: 0 } : { opacity: 1 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-center gap-1.5"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {point}
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
