import { motion } from 'framer-motion';
import { Building, Hotel, UtensilsCrossed, Compass, BarChart3, Users, Calendar, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';

const personas = [
  {
    icon: Building,
    title: 'Group Operations Director',
    careMost: 'Visibility across all properties',
    proveraGives: 'Portfolio dashboard with unified KPIs',
    bgGradient: 'from-lagoon/20 to-transparent',
    uiSlice: 'portfolio',
  },
  {
    icon: Hotel,
    title: 'Resort General Manager',
    careMost: "Today's operations running smoothly",
    proveraGives: 'Real-time staff and guest coordination',
    bgGradient: 'from-primary/20 to-transparent',
    uiSlice: 'dashboard',
  },
  {
    icon: UtensilsCrossed,
    title: 'F&B Director',
    careMost: 'Accurate cover forecasts',
    proveraGives: 'Live reservations with special requests',
    bgGradient: 'from-sunset/20 to-transparent',
    uiSlice: 'dining',
  },
  {
    icon: Compass,
    title: 'Experience Manager',
    careMost: 'Filling sessions, managing capacity',
    proveraGives: 'Automated bookings, waitlist management',
    bgGradient: 'from-orchid/20 to-transparent',
    uiSlice: 'activities',
  },
];

export function PersonasSection() {
  const [reducedMotion, setReducedMotion] = useState(false);
  
  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  return (
    <section className="py-24 bg-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-400/5 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Who Propera is for
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built for the people who make resort experiences unforgettable
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {personas.map((persona, index) => (
            <motion.div
              key={persona.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={reducedMotion ? {} : { y: -8, scale: 1.02 }}
              className="relative group"
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${persona.bgGradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
              
              <div className="relative bg-card rounded-2xl border border-border/50 p-6 h-full hover:border-primary/30 hover:shadow-xl transition-all duration-300 overflow-hidden">
                {/* Blurred UI background */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500">
                  <UISlice type={persona.uiSlice} />
                </div>
                
                {/* Avatar/Icon with glow */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <persona.icon className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  {/* Glow effect on hover */}
                  <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-4">{persona.title}</h3>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">What they care about</p>
                    <p className="text-sm text-foreground">{persona.careMost}</p>
                  </div>
                  <div>
                    <p className="text-xs text-primary uppercase tracking-wide mb-1">What Propera gives them</p>
                    <p className="text-sm text-foreground">{persona.proveraGives}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Mini UI slices for background decoration
function UISlice({ type }: { type: string }) {
  switch (type) {
    case 'portfolio':
      return (
        <div className="p-4 space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 h-8 bg-primary/30 rounded" />
            <div className="flex-1 h-8 bg-primary/20 rounded" />
            <div className="flex-1 h-8 bg-primary/10 rounded" />
          </div>
          <div className="h-20 bg-muted/50 rounded" />
        </div>
      );
    case 'dashboard':
      return (
        <div className="p-4 grid grid-cols-2 gap-2">
          <div className="h-12 bg-primary/20 rounded" />
          <div className="h-12 bg-sunset/20 rounded" />
          <div className="col-span-2 h-16 bg-muted/50 rounded" />
        </div>
      );
    case 'dining':
      return (
        <div className="p-4 space-y-1">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex gap-2">
              <div className="w-12 h-4 bg-muted/50 rounded" />
              <div className="flex-1 h-4 bg-sunset/20 rounded" />
            </div>
          ))}
        </div>
      );
    case 'activities':
      return (
        <div className="p-4 space-y-2">
          {[1,2,3].map(i => (
            <div key={i} className="h-8 bg-orchid/20 rounded flex items-center px-2 gap-2">
              <div className="w-4 h-4 bg-orchid/40 rounded-full" />
              <div className="flex-1 h-2 bg-muted/50 rounded" />
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
