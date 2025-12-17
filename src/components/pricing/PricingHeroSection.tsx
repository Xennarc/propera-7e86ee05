import { motion, useReducedMotion } from 'framer-motion';
import { Layers, Smartphone, Monitor, BarChart3 } from 'lucide-react';

export function PricingHeroSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden pt-24 pb-16">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute top-20 right-0 w-[700px] h-[700px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 w-[300px] h-[300px] bg-violet-500/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Content */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-primary/20">
              <Layers className="h-4 w-4" />
              Pricing
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 leading-tight">
              Pick a plan that{' '}
              <span className="text-gradient bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                scales with your resorts
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-xl">
              From single properties to global resort groups—transparent pricing that grows with your portfolio.
            </p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-3 bg-card rounded-full p-1.5 border border-border/50 shadow-lg">
              <button className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-medium transition-all">
                Monthly
              </button>
              <button className="px-5 py-2.5 rounded-full text-muted-foreground text-sm font-medium hover:text-foreground transition-colors">
                Annual
                <span className="ml-1.5 text-xs text-emerald-500 font-semibold">Save 20%</span>
              </button>
            </div>
          </motion.div>

          {/* Right - Stacked Plan Cards */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-[420px] hidden lg:block"
          >
            {/* Essential Card */}
            <motion.div 
              className="absolute top-0 left-0 w-72 bg-card rounded-2xl border border-border shadow-xl overflow-hidden transform -rotate-6"
              initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={reducedMotion ? {} : { rotate: -3, scale: 1.02 }}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Essential</p>
                    <p className="text-xs text-muted-foreground">Independent resort</p>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-4 rounded bg-muted/50" />
                    <div className="h-4 rounded bg-muted/50" />
                    <div className="h-4 rounded bg-muted/40" />
                    <div className="h-4 rounded bg-muted/40" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Professional Card - Featured */}
            <motion.div 
              className="absolute top-12 left-16 w-72 bg-card rounded-2xl border-2 border-primary shadow-2xl overflow-hidden z-10"
              initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={reducedMotion ? {} : { y: -4, scale: 1.02 }}
            >
              <div className="bg-primary text-primary-foreground text-xs font-semibold text-center py-1.5">
                Most popular
              </div>
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Monitor className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Professional</p>
                    <p className="text-xs text-muted-foreground">Growing group</p>
                  </div>
                </div>
                <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="h-8 rounded bg-primary/10 border border-primary/20" />
                    <div className="h-8 rounded bg-primary/10 border border-primary/20" />
                  </div>
                  <div className="flex gap-1">
                    <div className="h-3 flex-1 rounded bg-primary/20" />
                    <div className="h-3 flex-1 rounded bg-primary/15" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Elite Card */}
            <motion.div 
              className="absolute top-28 left-32 w-72 bg-gradient-to-br from-violet-500/10 to-violet-500/5 rounded-2xl border border-violet-500/30 shadow-xl overflow-hidden transform rotate-6"
              initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={reducedMotion ? {} : { rotate: 3, scale: 1.02 }}
            >
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-violet-500" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">Elite</p>
                    <p className="text-xs text-muted-foreground">Flagship portfolio</p>
                  </div>
                </div>
                <div className="bg-violet-500/10 rounded-xl p-3 border border-violet-500/20">
                  <div className="flex items-end gap-1 h-12 mb-2">
                    <div className="w-5 h-4 rounded-sm bg-violet-500/30" />
                    <div className="w-5 h-6 rounded-sm bg-violet-500/40" />
                    <div className="w-5 h-5 rounded-sm bg-violet-500/35" />
                    <div className="w-5 h-9 rounded-sm bg-violet-500/50" />
                    <div className="w-5 h-12 rounded-sm bg-violet-500" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                    <span className="text-[10px] text-violet-400 font-medium">AI Revenue Coach</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
