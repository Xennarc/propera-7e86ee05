import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Globe, Mountain, TreePalm, Building2, Sparkles, Waves } from 'lucide-react';

const RESORT_TYPES = [
  { label: 'Island', icon: TreePalm },
  { label: 'Mountain', icon: Mountain },
  { label: 'Desert', icon: Waves },
  { label: 'Wellness', icon: Sparkles },
  { label: 'Urban', icon: Building2 },
];

export function AboutHeroSection() {
  const reducedMotion = useReducedMotion();

  const scrollToProduct = () => {
    document.getElementById('product-proof')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
      {/* Layer 1: Atmospheric background with subtle world map */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]">
          <svg viewBox="0 0 1200 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            <ellipse cx="600" cy="300" rx="550" ry="250" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
            <ellipse cx="600" cy="300" rx="400" ry="180" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
            <ellipse cx="600" cy="300" rx="250" ry="110" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-primary" />
            <line x1="50" y1="300" x2="1150" y2="300" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
            <line x1="600" y1="50" x2="600" y2="550" stroke="currentColor" strokeWidth="0.3" className="text-primary" />
          </svg>
        </div>
        <div className="absolute top-20 right-0 w-[700px] h-[700px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-400/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left - Content */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold mb-6 border border-primary/20">
              <Globe className="h-4 w-4" />
              About Propera
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 leading-tight">
              A platform built for{' '}
              <span className="text-gradient bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                remarkable stays
              </span>{' '}
              worldwide
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-xl">
              Propera connects your teams and your guests across every property you run—from pre-arrival to checkout, from island escapes to mountain retreats.
            </p>

            {/* Resort type pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              {RESORT_TYPES.map((type, index) => (
                <motion.div
                  key={type.label}
                  initial={reducedMotion ? {} : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="inline-flex items-center gap-1.5 bg-card/80 backdrop-blur-sm text-foreground px-3 py-1.5 rounded-full text-sm border border-border/50"
                >
                  <type.icon className="h-3.5 w-3.5 text-primary" />
                  {type.label}
                </motion.div>
              ))}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="rounded-full font-semibold shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all">
                <a href="mailto:hello@propera.cc?subject=Demo Request">
                  Book a demo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="rounded-full font-semibold"
                onClick={scrollToProduct}
              >
                Explore the product
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </motion.div>

          {/* Right - Layered Product Mockups */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative h-[500px] hidden lg:block"
          >
            {/* Subtle globe/world layer behind */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div 
                className="w-[400px] h-[400px] rounded-full border border-primary/10 opacity-50"
                animate={reducedMotion ? {} : { rotate: 360 }}
                transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
              />
            </div>

            {/* Staff Dashboard - Main Layer */}
            <motion.div 
              className="absolute top-8 left-0 w-80 bg-card/95 backdrop-blur-xl rounded-2xl border border-border shadow-2xl overflow-hidden z-10"
              initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={reducedMotion ? {} : { y: -4, scale: 1.02 }}
            >
              <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">Staff Console</span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Today at a Glance</p>
                    <p className="text-sm font-semibold text-foreground">Resort Operations</p>
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-500/10 text-emerald-500 text-xs px-2 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    Live
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-primary/5 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">18</p>
                    <p className="text-[10px] text-muted-foreground">Sessions</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">142</p>
                    <p className="text-[10px] text-muted-foreground">Covers</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-foreground">8</p>
                    <p className="text-[10px] text-muted-foreground">VIP</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Guest Portal Phone 1 */}
            <motion.div 
              className="absolute top-20 right-8 w-44 bg-card/95 backdrop-blur-xl rounded-2xl border border-border shadow-xl overflow-hidden transform rotate-6 z-20"
              initial={reducedMotion ? {} : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={reducedMotion ? {} : { rotate: 0, scale: 1.05 }}
            >
              <div className="bg-primary/10 px-3 py-2">
                <p className="text-[10px] font-medium text-primary">Pre-Arrival</p>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-500 text-xs">✓</span>
                  </div>
                  <span className="text-xs text-foreground">Dietary prefs</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <span className="text-emerald-500 text-xs">✓</span>
                  </div>
                  <span className="text-xs text-foreground">Arrival details</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-primary text-xs">3</span>
                  </div>
                  <span className="text-xs text-muted-foreground">Book activities</span>
                </div>
              </div>
            </motion.div>

            {/* Guest Portal Phone 2 */}
            <motion.div 
              className="absolute bottom-12 right-0 w-44 bg-card/95 backdrop-blur-xl rounded-2xl border border-border shadow-xl overflow-hidden transform -rotate-3 z-15"
              initial={reducedMotion ? {} : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              whileHover={reducedMotion ? {} : { rotate: 0, scale: 1.05 }}
            >
              <div className="bg-teal-400/10 px-3 py-2">
                <p className="text-[10px] font-medium text-teal-600 dark:text-teal-400">Your Itinerary</p>
              </div>
              <div className="p-3 space-y-2">
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">9:00 AM</p>
                  <p className="text-xs font-medium text-foreground">Sunrise Yoga</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-2">
                  <p className="text-[10px] text-muted-foreground">12:30 PM</p>
                  <p className="text-xs font-medium text-foreground">Oceanside Lunch</p>
                </div>
              </div>
            </motion.div>

            {/* Floating location tags */}
            <motion.div
              className="absolute bottom-32 left-4 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border shadow-lg flex items-center gap-2"
              initial={reducedMotion ? {} : { opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.9 }}
            >
              <TreePalm className="h-4 w-4 text-emerald-500" />
              <span className="text-xs font-medium text-foreground">12 properties</span>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 cursor-pointer"
          onClick={scrollToProduct}
        >
          <span className="text-xs text-muted-foreground">Scroll to explore</span>
          <motion.div
            animate={reducedMotion ? {} : { y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="h-5 w-5 text-primary" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
