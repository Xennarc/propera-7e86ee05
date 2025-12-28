import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle } from 'lucide-react';
import { RibbonDivider } from '@/components/landing/RibbonDivider';

const REASSURANCE_CHIPS = [
  'Unlimited staff included',
  'Multi-resort ready',
  'Elegant by design',
];

export function PricingCTASection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative overflow-hidden">
      <RibbonDivider variant="accent" />
      
      <div className="py-20 md:py-28 cta-spotlight atlas-texture">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-teal-400/6" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />

        <div className="container relative mx-auto px-4 z-10">
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto text-center"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
              Ready to see Propera with your resort?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              A calmer operation. A better guest journey. A system your team enjoys using.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
              <Button asChild size="lg" className="btn-cta-premium rounded-xl font-semibold h-12 px-8 text-primary-foreground group">
                <Link to="/book-demo">
                  Book a demo
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="btn-ghost-premium rounded-xl font-semibold h-12 px-8">
                <a href="mailto:hello@propera.io?subject=Sales Inquiry">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact sales
                </a>
              </Button>
            </div>

            {/* Reassurance chips */}
            <div className="flex flex-wrap items-center justify-center gap-4">
              {REASSURANCE_CHIPS.map((chip) => (
                <span 
                  key={chip}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {chip}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
