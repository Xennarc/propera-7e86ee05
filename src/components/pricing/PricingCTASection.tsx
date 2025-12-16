import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Smartphone, Monitor, BarChart3, Mail } from 'lucide-react';

export function PricingCTASection() {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-background via-background to-primary/5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
          {/* Left - Stack Diagram */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="order-2 lg:order-1"
          >
            <div className="space-y-4 max-w-sm mx-auto lg:mx-0">
              {/* Guest App Layer */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-xl border border-emerald-500/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                      <Smartphone className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Guest App</p>
                      <p className="text-xs text-muted-foreground">Pre-arrival • Bookings • Loyalty</p>
                    </div>
                  </div>
                </div>
                <div className="absolute left-1/2 -bottom-4 w-0.5 h-4 bg-border" />
              </motion.div>

              {/* Staff Console Layer */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="relative"
              >
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Monitor className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Staff Console</p>
                      <p className="text-xs text-muted-foreground">Operations • Activities • Dining</p>
                    </div>
                  </div>
                </div>
                <div className="absolute left-1/2 -bottom-4 w-0.5 h-4 bg-border" />
              </motion.div>

              {/* Analytics Layer */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.4 }}
              >
                <div className="bg-gradient-to-r from-violet-500/10 to-violet-500/5 rounded-xl border border-violet-500/20 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-violet-500/20 flex items-center justify-center">
                      <BarChart3 className="h-5 w-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Portfolio Analytics</p>
                      <p className="text-xs text-muted-foreground">AI insights • Revenue • Loyalty</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Propera wrapper */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 }}
                className="text-center pt-4"
              >
                <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="h-px w-8 bg-border" />
                  All powered by Propera
                  <span className="h-px w-8 bg-border" />
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Right - CTA */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
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
              <Button asChild size="lg" className="rounded-full font-semibold shadow-lg">
                <a href="mailto:hello@propera.cc?subject=Demo Request">
                  Book a demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full font-semibold">
                <a href="mailto:hello@propera.cc?subject=Sales Inquiry">
                  <Mail className="mr-2 h-4 w-4" />
                  Contact sales
                </a>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
