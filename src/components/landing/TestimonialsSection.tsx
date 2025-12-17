import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

const testimonials = [
  {
    quote: "We cut front desk calls by 40% in the first month. Guests love booking activities from their phone while relaxing on the beach.",
    author: "Maria Santos",
    role: "General Manager",
    property: "Coastal Resort Group",
    avatar: "MS",
    propertyType: "Island Resort",
    bgSlice: 'bookings',
  },
  {
    quote: "Finally, one system that our activities team, F&B, and front office can all use. The chaos of spreadsheets and WhatsApp is gone.",
    author: "James Chen",
    role: "Operations Director",
    property: "Mountain Wellness Retreat",
    avatar: "JC",
    propertyType: "Ski & Wellness",
    bgSlice: 'dashboard',
  },
  {
    quote: "Pre-arrival bookings increased our ancillary revenue by 25%. Guests arrive already excited about their itinerary.",
    author: "Sophie Laurent",
    role: "Revenue Manager",
    property: "Mediterranean Resort Collection",
    avatar: "SL",
    propertyType: "Boutique Collection",
    bgSlice: 'prearrival',
  },
  {
    quote: "Managing five properties used to mean five different systems. Now I see everything in one dashboard.",
    author: "David Kim",
    role: "VP Operations",
    property: "Urban Hotels Group",
    avatar: "DK",
    propertyType: "Urban & City",
    bgSlice: 'portfolio',
  },
];

export function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  
  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  useEffect(() => {
    if (!autoplay) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % testimonials.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [autoplay]);

  const next = () => {
    setAutoplay(false);
    setCurrent(prev => (prev + 1) % testimonials.length);
  };

  const prev = () => {
    setAutoplay(false);
    setCurrent(prev => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section className="py-24 bg-card relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container relative mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Trusted by resort leaders worldwide
          </h2>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <div className="relative bg-background rounded-3xl border border-border/50 shadow-elevated overflow-hidden">
            {/* Blurred UI background that changes per testimonial */}
            <div className="absolute inset-0 opacity-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full h-full"
                >
                  <TestimonialBgSlice type={testimonials[current].bgSlice} />
                </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="relative p-8 md:p-12">
              <Quote className="absolute top-6 left-6 h-12 w-12 text-primary/20" />
              
              {/* Stars */}
              <div className="flex justify-center gap-1 mb-6">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="h-5 w-5 fill-sunset text-sunset" />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={current}
                  initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="text-center"
                >
                  <blockquote className="text-xl md:text-2xl text-foreground leading-relaxed mb-8 relative z-10">
                    "{testimonials[current].quote}"
                  </blockquote>

                  <div className="flex items-center justify-center gap-4">
                    <motion.div 
                      initial={reducedMotion ? {} : { scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center text-primary-foreground font-bold text-lg shadow-lg"
                    >
                      {testimonials[current].avatar}
                    </motion.div>
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{testimonials[current].author}</p>
                      <p className="text-sm text-muted-foreground">{testimonials[current].role}</p>
                      <p className="text-sm text-primary">{testimonials[current].property}</p>
                    </div>
                  </div>
                  
                  {/* Property type tag */}
                  <motion.div
                    initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-4 inline-flex items-center gap-2 bg-muted/50 px-3 py-1.5 rounded-full text-xs text-muted-foreground"
                  >
                    {testimonials[current].propertyType}
                  </motion.div>
                </motion.div>
              </AnimatePresence>

              {/* Navigation */}
              <div className="flex items-center justify-center gap-4 mt-8">
                <Button variant="outline" size="icon" onClick={prev} className="rounded-full hover:bg-primary/10">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-2">
                  {testimonials.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => { setAutoplay(false); setCurrent(i); }}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        i === current ? 'bg-primary w-6' : 'bg-muted hover:bg-muted-foreground/30 w-2'
                      }`}
                    />
                  ))}
                </div>
                <Button variant="outline" size="icon" onClick={next} className="rounded-full hover:bg-primary/10">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialBgSlice({ type }: { type: string }) {
  const baseClasses = "w-full h-full p-8";
  
  switch (type) {
    case 'bookings':
      return (
        <div className={baseClasses}>
          <div className="grid grid-cols-3 gap-4 h-full">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-primary/20 rounded-lg" />
            ))}
          </div>
        </div>
      );
    case 'dashboard':
      return (
        <div className={baseClasses}>
          <div className="grid grid-cols-4 gap-3 mb-4">
            <div className="h-16 bg-primary/20 rounded-lg" />
            <div className="h-16 bg-sunset/20 rounded-lg" />
            <div className="h-16 bg-lagoon/20 rounded-lg" />
            <div className="h-16 bg-orchid/20 rounded-lg" />
          </div>
          <div className="h-32 bg-muted/30 rounded-lg" />
        </div>
      );
    case 'prearrival':
      return (
        <div className={baseClasses}>
          <div className="max-w-xs mx-auto space-y-3">
            <div className="h-20 bg-primary/20 rounded-xl" />
            <div className="h-8 bg-muted/30 rounded-lg" />
            <div className="h-8 bg-muted/30 rounded-lg" />
            <div className="h-8 bg-muted/30 rounded-lg" />
          </div>
        </div>
      );
    case 'portfolio':
      return (
        <div className={baseClasses}>
          <div className="grid grid-cols-2 gap-4 h-full">
            <div className="space-y-2">
              <div className="h-12 bg-primary/20 rounded-lg" />
              <div className="h-12 bg-primary/15 rounded-lg" />
              <div className="h-12 bg-primary/10 rounded-lg" />
            </div>
            <div className="bg-muted/30 rounded-lg" />
          </div>
        </div>
      );
    default:
      return null;
  }
}
