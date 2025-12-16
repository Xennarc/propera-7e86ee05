import { motion } from 'framer-motion';
import { Layers, Smartphone, Monitor, BarChart3 } from 'lucide-react';

export function PricingHeroSection() {
  return (
    <section className="relative min-h-[80vh] flex items-center overflow-hidden pt-24 pb-16">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/15 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-primary/20">
              <Layers className="h-4 w-4" />
              Pricing
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 leading-tight">
              Choose the right plan for your{' '}
              <span className="text-gradient">resort portfolio</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-xl">
              From single properties to global resort groups, scale from essentials to full guest experience orchestration.
            </p>

            {/* Billing toggle placeholder */}
            <div className="inline-flex items-center gap-3 bg-card rounded-full p-1.5 border border-border/50">
              <button className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                Monthly
              </button>
              <button className="px-4 py-2 rounded-full text-muted-foreground text-sm font-medium hover:text-foreground transition-colors">
                Annual
                <span className="ml-1.5 text-xs text-primary">Save 20%</span>
              </button>
            </div>
          </motion.div>

          {/* Right - Stacked Plan Cards Visual */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-[400px] hidden lg:block"
          >
            {/* Essential Card */}
            <motion.div 
              className="absolute top-0 left-0 w-64 bg-card rounded-xl border border-border shadow-xl p-5 transform -rotate-6"
              initial={{ opacity: 0, y: 20, rotate: -6 }}
              animate={{ opacity: 1, y: 0, rotate: -6 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Essential</p>
                  <p className="text-xs text-muted-foreground">Independent resort</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded bg-muted/50" />
                <div className="h-2 w-3/4 rounded bg-muted/50" />
                <div className="h-2 w-5/6 rounded bg-muted/50" />
              </div>
            </motion.div>

            {/* Professional Card */}
            <motion.div 
              className="absolute top-16 left-20 w-64 bg-card rounded-xl border-2 border-primary shadow-2xl p-5 transform rotate-0 z-10"
              initial={{ opacity: 0, y: 20, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="absolute -top-2.5 left-4 bg-primary text-primary-foreground text-xs font-semibold px-2.5 py-0.5 rounded-full">
                Most popular
              </div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Monitor className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Professional</p>
                  <p className="text-xs text-muted-foreground">Growing group</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="h-8 rounded bg-primary/5 border border-primary/10" />
                <div className="h-8 rounded bg-primary/5 border border-primary/10" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded bg-primary/20" />
                <div className="h-2 w-4/5 rounded bg-primary/20" />
              </div>
            </motion.div>

            {/* Elite Card */}
            <motion.div 
              className="absolute top-32 left-40 w-64 bg-gradient-to-br from-violet-500/10 to-violet-500/5 rounded-xl border border-violet-500/30 shadow-xl p-5 transform rotate-6"
              initial={{ opacity: 0, y: 20, rotate: 6 }}
              animate={{ opacity: 1, y: 0, rotate: 6 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Elite</p>
                  <p className="text-xs text-muted-foreground">Flagship portfolio</p>
                </div>
              </div>
              <div className="flex items-end gap-1 h-10 mb-2">
                <div className="w-4 h-4 rounded-sm bg-violet-500/30" />
                <div className="w-4 h-6 rounded-sm bg-violet-500/40" />
                <div className="w-4 h-5 rounded-sm bg-violet-500/35" />
                <div className="w-4 h-8 rounded-sm bg-violet-500/50" />
                <div className="w-4 h-10 rounded-sm bg-violet-500" />
              </div>
              <div className="text-xs text-violet-400 font-medium">AI Revenue Coach</div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
