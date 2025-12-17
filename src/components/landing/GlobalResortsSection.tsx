import { motion, useInView } from 'framer-motion';
import { Building2, Users, Briefcase } from 'lucide-react';
import { useRef, useState, useEffect } from 'react';

const resortTypes = [
  {
    label: 'Island escape',
    image: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800&h=600&fit=crop',
    overlay: { text: 'Sunset cruise', stat: '12/16 booked' },
    size: 'large',
  },
  {
    label: 'Ski resort',
    image: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=600&h=400&fit=crop',
    overlay: { text: 'Ski lessons', stat: 'Next: 09:00' },
    size: 'medium',
  },
  {
    label: 'Urban resort',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&h=400&fit=crop',
    overlay: { text: 'Dinner tonight', stat: '7:30pm slots' },
    size: 'medium',
  },
  {
    label: 'Wellness retreat',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=600&h=400&fit=crop',
    overlay: { text: 'Spa treatment', stat: '3 spots left' },
    size: 'small',
  },
  {
    label: 'Desert hideaway',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=600&h=400&fit=crop',
    overlay: { text: 'Desert safari', stat: 'Filling fast' },
    size: 'small',
  },
  {
    label: 'Forest lodge',
    image: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=600&h=400&fit=crop',
    overlay: { text: 'Nature hike', stat: '8 guests' },
    size: 'small',
  },
];

const segments = [
  {
    icon: Building2,
    title: 'Groups & Brands',
    description: 'Unify standards, view all properties at once with portfolio-level insights.',
  },
  {
    icon: Users,
    title: 'Independent Properties',
    description: 'Enterprise-level tools without enterprise overhead or complexity.',
  },
  {
    icon: Briefcase,
    title: 'Management Companies',
    description: 'Operate multiple owners and brands on one unified backend.',
  },
];

export function GlobalResortsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const [reducedMotion, setReducedMotion] = useState(false);
  
  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  return (
    <section ref={sectionRef} className="py-24 bg-card relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for every kind of resort, everywhere
          </h2>
          <p className="text-lg text-muted-foreground">
            One platform. Any resort type. Worldwide.
          </p>
        </motion.div>

        {/* Masonry-style Collage */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-16 auto-rows-[140px] md:auto-rows-[180px]">
          {resortTypes.map((resort, index) => {
            // Define grid spans for masonry effect
            const gridClasses: Record<string, string> = {
              large: 'col-span-2 row-span-2',
              medium: 'col-span-1 row-span-2 md:col-span-1 md:row-span-2',
              small: 'col-span-1 row-span-1',
            };
            
            return (
              <motion.div
                key={resort.label}
                initial={reducedMotion ? {} : { opacity: 0, scale: 0.9 }}
                animate={isInView ? { opacity: 1, scale: 1 } : {}}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className={`relative rounded-2xl overflow-hidden group cursor-pointer ${gridClasses[resort.size]}`}
              >
                <img
                  src={resort.image}
                  alt={resort.label}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                
                {/* Resort label */}
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="inline-block bg-white/90 backdrop-blur-sm text-xs md:text-sm font-medium px-3 py-1.5 rounded-full text-foreground">
                    {resort.label}
                  </span>
                </div>
                
                {/* Propera overlay badge - shown on hover */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300"
                >
                  <div className="bg-card/95 backdrop-blur-md rounded-lg p-2 shadow-lg border border-border/50">
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className={`flex h-2 w-2 ${reducedMotion ? '' : ''}`}>
                          <span className={`${reducedMotion ? '' : 'animate-ping'} absolute inline-flex h-full w-full rounded-full bg-success opacity-75`} />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-foreground">{resort.overlay.text}</p>
                        <p className="text-[9px] text-muted-foreground">{resort.overlay.stat}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                {/* Always visible mini indicator on larger images */}
                {(resort.size === 'large' || resort.size === 'medium') && (
                  <div className="absolute top-3 right-3 md:flex hidden">
                    <div className="bg-card/90 backdrop-blur-md rounded-lg px-2 py-1 shadow-lg border border-border/50 flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className={`${reducedMotion ? '' : 'animate-ping'} absolute inline-flex h-full w-full rounded-full bg-success opacity-75`} />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                      </span>
                      <span className="text-[10px] font-medium text-foreground">{resort.overlay.stat}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Segments */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {segments.map((segment, index) => (
            <motion.div
              key={segment.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4, boxShadow: '0 20px 40px -20px hsl(var(--primary) / 0.15)' }}
              className="bg-background rounded-2xl border border-border/50 p-6 text-center hover:border-primary/30 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <segment.icon className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{segment.title}</h3>
              <p className="text-sm text-muted-foreground">{segment.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
