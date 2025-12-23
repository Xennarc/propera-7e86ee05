import { motion, useReducedMotion } from 'framer-motion';

const RESORT_IMAGES = [
  {
    src: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800&auto=format&fit=crop&q=80',
    label: 'Island escapes',
    overlay: { text: 'Sunset cruise – 12/16 spots', pulse: true },
    aspect: 'col-span-2 row-span-2',
  },
  {
    src: 'https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=800&auto=format&fit=crop&q=80',
    label: 'Mountain retreats',
    overlay: { text: 'Ski lessons – 09:00', pulse: false },
    aspect: 'col-span-1 row-span-2',
  },
  {
    src: 'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=800&auto=format&fit=crop&q=80',
    label: 'Desert hideaways',
    overlay: null,
    aspect: 'col-span-1 row-span-1',
  },
  {
    src: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
    label: 'Wellness sanctuaries',
    overlay: { text: 'Spa booking confirmed', pulse: true },
    aspect: 'col-span-1 row-span-1',
  },
  {
    src: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80',
    label: 'Urban rooftops',
    overlay: { text: 'Dinner – 7:30pm slots', pulse: false },
    aspect: 'col-span-1 row-span-1',
  },
];

export function AboutGlobalSection() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="product-proof" className="py-20 md:py-28 bg-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background/30 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            One platform behind every kind of resort experience
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From tropical islands to alpine peaks — Propera adapts to your world.
          </p>
        </motion.div>

        {/* Masonry Collage */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 max-w-6xl mx-auto auto-rows-[140px] md:auto-rows-[180px]">
          {RESORT_IMAGES.map((item, index) => (
            <motion.div
              key={index}
              initial={reducedMotion ? {} : { opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative group overflow-hidden rounded-xl ${item.aspect} ${index === 0 ? 'md:col-span-2 md:row-span-2' : ''}`}
            >
              <img
                src={item.src}
                alt={item.label}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              
              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-primary-foreground font-semibold text-sm md:text-base">{item.label}</h3>
              </div>
              
              {/* Propera UI Overlay pill */}
              {item.overlay && (
                <motion.div
                  initial={reducedMotion ? {} : { opacity: 0, y: -10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="absolute top-3 right-3 bg-card/95 backdrop-blur-sm rounded-lg px-3 py-1.5 border border-border/50 shadow-lg flex items-center gap-2"
                >
                  {item.overlay.pulse && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  )}
                  <span className="text-[10px] md:text-xs font-medium text-foreground">{item.overlay.text}</span>
                </motion.div>
              )}
              
              {/* Hover effect */}
              <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </motion.div>
          ))}
        </div>

        {/* Caption */}
        <motion.p
          initial={reducedMotion ? {} : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-muted-foreground mt-8 max-w-xl mx-auto"
        >
          Propera sits behind all these experiences — connecting guests, staff, and operations seamlessly.
        </motion.p>
      </div>
    </section>
  );
}
