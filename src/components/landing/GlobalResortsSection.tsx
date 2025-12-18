import { motion, useInView } from 'framer-motion';
import { Building2, Users, Briefcase } from 'lucide-react';
import { useRef, useState, memo } from 'react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';

const resortTypes = [
  {
    label: 'Island escape',
    // Use smaller image sizes for faster loading
    image: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=600&h=450&fit=crop&q=75',
    overlay: { text: 'Sunset cruise', stat: '12/16 booked' },
    size: 'large' as const,
  },
  {
    label: 'Ski resort',
    image: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=400&h=300&fit=crop&q=75',
    overlay: { text: 'Ski lessons', stat: 'Next: 09:00' },
    size: 'medium' as const,
  },
  {
    label: 'Urban resort',
    image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=300&fit=crop&q=75',
    overlay: { text: 'Dinner tonight', stat: '7:30pm slots' },
    size: 'medium' as const,
  },
  {
    label: 'Wellness retreat',
    image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=300&h=200&fit=crop&q=75',
    overlay: { text: 'Spa treatment', stat: '3 spots left' },
    size: 'small' as const,
  },
  {
    label: 'Desert hideaway',
    image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=300&h=200&fit=crop&q=75',
    overlay: { text: 'Desert safari', stat: 'Filling fast' },
    size: 'small' as const,
  },
  {
    label: 'Forest lodge',
    image: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=300&h=200&fit=crop&q=75',
    overlay: { text: 'Nature hike', stat: '8 guests' },
    size: 'small' as const,
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

// Memoized resort card with lazy image loading
const ResortCard = memo(function ResortCard({ 
  resort, 
  index, 
  shouldAnimate 
}: { 
  resort: typeof resortTypes[0]; 
  index: number;
  shouldAnimate: boolean;
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  
  const gridClasses: Record<string, string> = {
    large: 'col-span-2 row-span-2',
    medium: 'col-span-1 row-span-2 md:col-span-1 md:row-span-2',
    small: 'col-span-1 row-span-1',
  };
  
  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className={`relative rounded-2xl overflow-hidden group cursor-pointer ${gridClasses[resort.size]}`}
      onMouseEnter={() => setShowOverlay(true)}
      onMouseLeave={() => setShowOverlay(false)}
      style={{ 
        // Reserve aspect ratio space to prevent CLS
        aspectRatio: resort.size === 'large' ? '4/3' : resort.size === 'medium' ? '3/4' : '1/1'
      }}
    >
      {/* Placeholder background */}
      <div className="absolute inset-0 bg-muted" />
      
      {/* Lazy loaded image */}
      <img
        src={resort.image}
        alt={resort.label}
        loading="lazy"
        decoding="async"
        onLoad={() => setImageLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 group-hover:scale-105 will-change-transform ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      
      {/* Resort label */}
      <div className="absolute bottom-3 left-3 right-3">
        <span className="inline-block bg-white/90 backdrop-blur-sm text-xs md:text-sm font-medium px-3 py-1.5 rounded-full text-foreground">
          {resort.label}
        </span>
      </div>
      
      {/* Hover overlay badge */}
      <div 
        className={`absolute top-3 right-3 transition-all duration-300 ${
          showOverlay ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
        }`}
      >
        <div className="bg-card/95 backdrop-blur-md rounded-lg p-2 shadow-lg border border-border/50">
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="flex h-2 w-2">
                <span className={`${shouldAnimate ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-success opacity-75`} />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
              </span>
            </div>
            <div>
              <p className="text-[10px] font-medium text-foreground">{resort.overlay.text}</p>
              <p className="text-[9px] text-muted-foreground">{resort.overlay.stat}</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Always visible indicator on larger images (desktop only) */}
      {(resort.size === 'large' || resort.size === 'medium') && (
        <div className="absolute top-3 right-3 hidden md:flex">
          <div className="bg-card/90 backdrop-blur-md rounded-lg px-2 py-1 shadow-lg border border-border/50 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`${shouldAnimate ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-success opacity-75`} />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-[10px] font-medium text-foreground">{resort.overlay.stat}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
});

// Memoized segment card
const SegmentCard = memo(function SegmentCard({ 
  segment, 
  index, 
  shouldAnimate 
}: { 
  segment: typeof segments[0]; 
  index: number;
  shouldAnimate: boolean;
}) {
  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="bg-background rounded-2xl border border-border/50 p-6 text-center hover:border-primary/30 hover:-translate-y-1 transition-all duration-300 will-change-transform"
    >
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
        <segment.icon className="h-7 w-7" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{segment.title}</h3>
      <p className="text-sm text-muted-foreground">{segment.description}</p>
    </motion.div>
  );
});

export function GlobalResortsSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { shouldAnimate } = useAnimationPreference();

  return (
    <section ref={sectionRef} className="py-24 bg-card relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
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

        {/* Masonry-style Collage - CSS Grid with reserved heights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-16 auto-rows-[120px] md:auto-rows-[160px]">
          {resortTypes.map((resort, index) => (
            <ResortCard 
              key={resort.label} 
              resort={resort} 
              index={index} 
              shouldAnimate={shouldAnimate}
            />
          ))}
        </div>

        {/* Segments */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {segments.map((segment, index) => (
            <SegmentCard 
              key={segment.title} 
              segment={segment} 
              index={index}
              shouldAnimate={shouldAnimate}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
