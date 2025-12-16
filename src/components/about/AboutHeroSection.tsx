import { motion } from 'framer-motion';
import { Globe, MapPin, Building2, Mountain, TreePalm, Waves } from 'lucide-react';

export function AboutHeroSection() {
  return (
    <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-24 pb-16">
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
              <Globe className="h-4 w-4" />
              About Propera
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 leading-tight">
              Where resort operations and guest experience{' '}
              <span className="text-gradient">finally meet</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed max-w-xl">
              Propera connects your teams and your guests across every property you run—from pre-arrival to checkout, from island escapes to mountain retreats.
            </p>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-foreground">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="font-medium">Built for operations, obsessed with guest experience</span>
              </div>
              <div className="flex items-center gap-3 text-foreground">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="font-medium">Made for resort brands everywhere: coastlines, mountains, deserts, cities</span>
              </div>
            </div>
          </motion.div>

          {/* Right - Visual Composition */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            {/* Globe/Map visual */}
            <div className="relative aspect-square max-w-lg mx-auto">
              {/* Stylized globe background */}
              <motion.div 
                className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20"
                animate={{ rotate: 360 }}
                transition={{ duration: 120, repeat: Infinity, ease: "linear" }}
              />
              
              {/* Globe rings */}
              <div className="absolute inset-4 rounded-full border border-primary/10" />
              <div className="absolute inset-12 rounded-full border border-primary/10" />
              <div className="absolute inset-20 rounded-full border border-primary/10" />
              
              {/* Central Dashboard Card */}
              <motion.div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 bg-card/95 backdrop-blur-xl rounded-xl border border-border shadow-2xl p-4 z-20"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Today's Overview</p>
                    <p className="text-sm font-semibold text-foreground">All Properties</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-primary/5 rounded-lg p-2">
                    <p className="text-lg font-bold text-foreground">24</p>
                    <p className="text-[10px] text-muted-foreground">Sessions</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-2">
                    <p className="text-lg font-bold text-foreground">186</p>
                    <p className="text-[10px] text-muted-foreground">Covers</p>
                  </div>
                  <div className="bg-primary/5 rounded-lg p-2">
                    <p className="text-lg font-bold text-foreground">12</p>
                    <p className="text-[10px] text-muted-foreground">Arrivals</p>
                  </div>
                </div>
              </motion.div>
              
              {/* Location Tags */}
              <motion.div
                className="absolute top-8 right-8 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border shadow-lg flex items-center gap-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <TreePalm className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-medium text-foreground">Coastal retreat</span>
              </motion.div>
              
              <motion.div
                className="absolute top-1/4 left-4 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border shadow-lg flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <Mountain className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-medium text-foreground">Ski resort</span>
              </motion.div>
              
              <motion.div
                className="absolute bottom-1/4 right-4 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border shadow-lg flex items-center gap-2"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Waves className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-medium text-foreground">Desert hideaway</span>
              </motion.div>
              
              <motion.div
                className="absolute bottom-12 left-8 bg-card/90 backdrop-blur-sm rounded-lg px-3 py-2 border border-border shadow-lg flex items-center gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <Building2 className="h-4 w-4 text-violet-500" />
                <span className="text-xs font-medium text-foreground">Urban rooftop</span>
              </motion.div>
              
              {/* Floating pins */}
              {[
                { top: '15%', left: '30%', delay: 1.0 },
                { top: '35%', left: '75%', delay: 1.1 },
                { top: '65%', left: '20%', delay: 1.2 },
                { top: '75%', left: '65%', delay: 1.3 },
              ].map((pin, i) => (
                <motion.div
                  key={i}
                  className="absolute"
                  style={{ top: pin.top, left: pin.left }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: pin.delay, type: "spring" }}
                >
                  <div className="relative">
                    <MapPin className="h-5 w-5 text-primary fill-primary/30" />
                    <div className="absolute inset-0 animate-ping">
                      <MapPin className="h-5 w-5 text-primary/30" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
