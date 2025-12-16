import { motion } from 'framer-motion';
import { Building, Hotel, UtensilsCrossed, Compass } from 'lucide-react';

const personas = [
  {
    icon: Building,
    title: 'Group Operations Director',
    careMost: 'Visibility across all properties',
    proveraGives: 'Portfolio dashboard with unified KPIs',
    bgGradient: 'from-lagoon/20 to-transparent',
  },
  {
    icon: Hotel,
    title: 'Resort General Manager',
    careMost: "Today's operations running smoothly",
    proveraGives: 'Real-time staff and guest coordination',
    bgGradient: 'from-primary/20 to-transparent',
  },
  {
    icon: UtensilsCrossed,
    title: 'F&B Director',
    careMost: 'Accurate cover forecasts',
    proveraGives: 'Live reservations with special requests',
    bgGradient: 'from-sunset/20 to-transparent',
  },
  {
    icon: Compass,
    title: 'Experience Manager',
    careMost: 'Filling sessions, managing capacity',
    proveraGives: 'Automated bookings, waitlist management',
    bgGradient: 'from-orchid/20 to-transparent',
  },
];

export function PersonasSection() {
  return (
    <section className="py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4">
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
              className="relative group"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${persona.bgGradient} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />
              <div className="relative bg-card rounded-2xl border border-border/50 p-6 h-full hover:border-primary/30 hover:shadow-lg transition-all">
                {/* Avatar/Icon */}
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                    <persona.icon className="h-8 w-8 text-muted-foreground" />
                  </div>
                  {/* Decorative blur behind */}
                  <div className="absolute -inset-2 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
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
