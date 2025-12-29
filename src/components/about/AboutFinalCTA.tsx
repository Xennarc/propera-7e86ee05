import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, Globe, Sparkles } from 'lucide-react';

export function AboutFinalCTA() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Rich gradient background - enhanced for light mode */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-background to-teal-400/15 dark:from-primary/10 dark:via-background dark:to-teal-400/10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary/20 dark:bg-primary/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-teal-400/15 dark:bg-teal-400/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/3 left-0 w-[300px] h-[300px] bg-primary/10 dark:bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          {/* Premium framed CTA */}
          <div className="relative">
            {/* Animated border glow - motion safe */}
            {!reducedMotion && (
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -inset-1 bg-gradient-to-r from-primary via-teal-400 to-primary rounded-3xl blur-lg"
              />
            )}
            
            <div className="relative bg-card rounded-3xl border border-border/50 p-10 md:p-14 shadow-2xl">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-6 leading-tight">
                See Propera with your resort's branding.
              </h2>
              
              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
                A calmer operation. A better guest journey. A system your team enjoys using.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
                <Button asChild size="lg" className="text-base px-10 h-14 rounded-full shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all group w-full sm:w-auto">
                  <Link to="/book-demo">
                    Book a demo
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-base px-10 h-14 rounded-full w-full sm:w-auto">
                  <Link to="/pricing">View pricing</Link>
                </Button>
              </div>

              {/* Micro reassurance */}
              <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Unlimited staff included</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>Multi-resort ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>Elegant by design</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
