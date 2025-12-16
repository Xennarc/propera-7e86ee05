import { motion } from 'framer-motion';
import { Building2, Users, Briefcase } from 'lucide-react';
const resortTypes = [{
  label: 'Island escape',
  image: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?w=800&h=500&fit=crop'
}, {
  label: 'Ski resort',
  image: 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=800&h=500&fit=crop'
}, {
  label: 'Urban resort',
  image: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=500&fit=crop'
}, {
  label: 'Wellness retreat',
  image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&h=500&fit=crop'
}, {
  label: 'Desert hideaway',
  image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&h=500&fit=crop'
}];
const segments = [{
  icon: Building2,
  title: 'Groups & Brands',
  description: 'Unify standards, view all properties at once with portfolio-level insights.'
}, {
  icon: Users,
  title: 'Independent Properties',
  description: 'Enterprise-level tools without enterprise overhead or complexity.'
}, {
  icon: Briefcase,
  title: 'Management Companies',
  description: 'Operate multiple owners and brands on one unified backend.'
}];
export function GlobalResortsSection() {
  return <section className="py-24 bg-card relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div initial={{
        opacity: 0,
        y: 20
      }} whileInView={{
        opacity: 1,
        y: 0
      }} viewport={{
        once: true
      }} className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for every kind of resort, everywhere
          </h2>
          <p className="text-lg text-muted-foreground">
            One platform. Any resort type.
          </p>
        </motion.div>
        
        {/* Resort Collage */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-16">
          {resortTypes.map((resort, index) => <motion.div key={resort.label} initial={{
          opacity: 0,
          scale: 0.95
        }} whileInView={{
          opacity: 1,
          scale: 1
        }} viewport={{
          once: true
        }} transition={{
          delay: index * 0.1
        }} className={`relative rounded-2xl overflow-hidden group cursor-pointer ${index === 0 ? 'col-span-2 row-span-2 md:col-span-2 md:row-span-2' : ''}`}>
              <div className={`${index === 0 ? 'h-64 md:h-full' : 'h-32 md:h-40'}`}>
                <img src={resort.image} alt={resort.label} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <span className="inline-block bg-white/90 backdrop-blur-sm text-xs md:text-sm font-medium px-3 py-1.5 rounded-full text-teal-400">
                    {resort.label}
                  </span>
                </div>
              </div>
            </motion.div>)}
        </div>
        
        {/* Segments */}
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {segments.map((segment, index) => <motion.div key={segment.title} initial={{
          opacity: 0,
          y: 20
        }} whileInView={{
          opacity: 1,
          y: 0
        }} viewport={{
          once: true
        }} transition={{
          delay: index * 0.1
        }} className="bg-background rounded-2xl border border-border/50 p-6 text-center hover:border-primary/30 hover:shadow-lg transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
                <segment.icon className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">{segment.title}</h3>
              <p className="text-sm text-muted-foreground">{segment.description}</p>
            </motion.div>)}
        </div>
      </div>
    </section>;
}