import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronDown } from 'lucide-react';

const VALUE_CHIPS = [
  'Unlimited staff',
  'Multi-resort ready',
  'Real-time sync',
  'White-label capable',
];

export function PricingHeroSection() {
  const reducedMotion = useReducedMotion();

  const scrollToPlans = () => {
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[80vh] flex items-center overflow-hidden pt-28 pb-16">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-muted/20" />
      
      {/* Glassy floating orbs */}
      <div className="absolute top-20 right-1/4 w-[500px] h-[500px] bg-primary/6 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-teal-400/4 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left - Copy */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center lg:text-left"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
              Pricing, made simple.
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8">
              Propera brings guests, teams, and schedules into one elegant system — so every day runs smoothly.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4 mb-4">
              <Button asChild size="lg" className="rounded-full font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all h-12 px-8">
                <a href="mailto:hello@propera.cc?subject=Demo Request">
                  Book a demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="rounded-full font-semibold h-12 px-8"
                onClick={scrollToPlans}
              >
                Compare plans
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              See how it looks with your resort's branding.
            </p>

            {/* Value chips */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-8">
              {VALUE_CHIPS.map((chip) => (
                <span 
                  key={chip}
                  className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted/60 border border-border/40 text-xs font-medium text-muted-foreground"
                >
                  {chip}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right - Product Preview */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              {/* Glow behind */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-teal-400/10 rounded-3xl blur-2xl scale-105" />
              
              {/* Preview card */}
              <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-3xl p-8 shadow-2xl">
                <div className="text-xs text-muted-foreground mb-4 text-center">Preview (illustrative)</div>
                
                {/* Mock dashboard */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <span className="text-lg">🏝️</span>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-sm">Paradise Resort</div>
                        <div className="text-xs text-muted-foreground">Today's overview</div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">12:34 PM</div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/40 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-foreground">24</div>
                      <div className="text-xs text-muted-foreground">Activities</div>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-foreground">18</div>
                      <div className="text-xs text-muted-foreground">Dining</div>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-3 text-center">
                      <div className="text-lg font-bold text-foreground">92%</div>
                      <div className="text-xs text-muted-foreground">Capacity</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-xl border border-primary/20">
                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm">✨</div>
                    <div className="flex-1">
                      <div className="text-xs font-medium text-foreground">Guest booking confirmed</div>
                      <div className="text-xs text-muted-foreground">Sunset Cruise • 4:00 PM</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
