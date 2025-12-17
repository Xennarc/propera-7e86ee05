import { motion, useReducedMotion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle, Smartphone, Monitor, BarChart3, Layers } from 'lucide-react';

export function PricingCTASection() {
  const reducedMotion = useReducedMotion();
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });

  return (
    <section ref={sectionRef} className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-teal-400/10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="container relative mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left - Stack Diagram */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <div className="relative max-w-sm mx-auto lg:mx-0">
              {/* Vertical glow connector */}
              <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/50 via-primary/50 to-violet-500/50 rounded-full" />
                {!reducedMotion && (
                  <motion.div
                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 bg-gradient-to-b from-emerald-500 via-primary to-violet-500 rounded-full blur-md"
                  />
                )}
              </div>

              <div className="space-y-4">
                <motion.div
                  initial={reducedMotion ? {} : { opacity: 0, y: -10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-xl border border-emerald-500/20 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Guest App</p>
                      <p className="text-xs text-muted-foreground">Pre-arrival • Bookings • Loyalty</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={reducedMotion ? {} : { opacity: 0, y: -10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.3 }}
                  className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Monitor className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Staff Console</p>
                      <p className="text-xs text-muted-foreground">Operations • Activities • Dining</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={reducedMotion ? {} : { opacity: 0, y: -10 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 0.4 }}
                  className="bg-gradient-to-r from-violet-500/10 to-violet-500/5 rounded-xl border border-violet-500/20 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Portfolio Analytics</p>
                      <p className="text-xs text-muted-foreground">AI insights • Revenue • Loyalty</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              <p className="text-center text-sm text-muted-foreground mt-6 flex items-center justify-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                All powered by Propera
              </p>
            </div>
          </motion.div>

          {/* Right - CTA */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-1 lg:order-2 text-center lg:text-left"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Ready to choose the right plan for your resorts?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              We'll help you match a plan to your operations, guests, and growth plans.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4">
              <Button asChild size="lg" className="rounded-full font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all">
                <a href="mailto:hello@propera.cc?subject=Demo Request">
                  Book a demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full font-semibold">
                <a href="mailto:hello@propera.cc?subject=Sales Inquiry">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Contact sales
                </a>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              We'll recommend the best plan based on your resort type and portfolio size.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
