import { motion } from 'framer-motion';
import { Building2, Users, Briefcase } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const RESORT_TYPES = [
  {
    label: 'Island escapes',
    description: 'Orchestrate dives, excursions, and private dinners from one console.',
    image: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Mountain & ski resorts',
    description: 'Coordinate ski lessons, equipment rentals, and après activities seamlessly.',
    image: 'https://images.unsplash.com/photo-1605540436563-5bca919ae766?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Desert & canyon retreats',
    description: 'Manage sunrise expeditions, spa treatments, and stargazing experiences.',
    image: 'https://images.unsplash.com/photo-1682687982501-1e58ab814714?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Wellness sanctuaries',
    description: 'Unify spa bookings, fitness classes, and holistic experiences.',
    image: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=800&auto=format&fit=crop&q=80',
  },
  {
    label: 'Urban resort hotels',
    description: 'Elevate city stays with rooftop experiences, dining, and curated activities.',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&auto=format&fit=crop&q=80',
  },
];

const SEGMENTS = [
  {
    icon: Building2,
    title: 'Groups & brands',
    description: 'Unify standards, view all properties at once, maintain brand consistency across your portfolio.',
  },
  {
    icon: Users,
    title: 'Independent properties',
    description: 'Enterprise-level tools without enterprise overhead. Compete with the big chains on guest experience.',
  },
  {
    icon: Briefcase,
    title: 'Management companies',
    description: 'Operate many owners and brands on one backend. Standardize reporting while respecting each property\'s identity.',
  },
];

export function AboutGlobalSection() {
  return (
    <section className="py-20 md:py-28 bg-card relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Resorts we're built for
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            One platform. Any resort type. Anywhere in the world.
          </p>
        </motion.div>

        {/* Resort types collage */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-16 max-w-6xl mx-auto">
          {RESORT_TYPES.map((type, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className={`relative group overflow-hidden rounded-xl ${
                index === 0 ? 'col-span-2 row-span-2 md:col-span-1 md:row-span-1' : ''
              }`}
            >
              <div className="aspect-[4/3] relative">
                <img
                  src={type.image}
                  alt={type.label}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="text-white font-semibold text-sm mb-1">{type.label}</h3>
                  <p className="text-white/70 text-xs leading-relaxed hidden md:block">{type.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Segments */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {SEGMENTS.map((segment, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full bg-background border-border/50 hover:border-primary/30 transition-colors">
                <CardContent className="p-6 text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <segment.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{segment.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{segment.description}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
