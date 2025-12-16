import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Quote, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const testimonials = [
  {
    quote: "We cut front desk calls by 40% in the first month. Guests love booking activities from their phone while relaxing on the beach.",
    author: "Maria Santos",
    role: "General Manager",
    property: "Coastal Resort Group",
    avatar: "MS",
  },
  {
    quote: "Finally, one system that our activities team, F&B, and front office can all use. The chaos of spreadsheets and WhatsApp is gone.",
    author: "James Chen",
    role: "Operations Director",
    property: "Mountain Wellness Retreat",
    avatar: "JC",
  },
  {
    quote: "Pre-arrival bookings increased our ancillary revenue by 25%. Guests arrive already excited about their itinerary.",
    author: "Sophie Laurent",
    role: "Revenue Manager",
    property: "Mediterranean Resort Collection",
    avatar: "SL",
  },
  {
    quote: "Managing five properties used to mean five different systems. Now I see everything in one dashboard.",
    author: "David Kim",
    role: "VP Operations",
    property: "Urban Hotels Group",
    avatar: "DK",
  },
];

export function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  
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
          <div className="relative bg-background rounded-3xl border border-border/50 shadow-elevated p-8 md:p-12">
            <Quote className="absolute top-6 left-6 h-12 w-12 text-primary/20" />
            
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <blockquote className="text-xl md:text-2xl text-foreground leading-relaxed mb-8 relative z-10">
                  "{testimonials[current].quote}"
                </blockquote>
                
                <div className="flex items-center justify-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-teal-400 flex items-center justify-center text-primary-foreground font-bold text-lg">
                    {testimonials[current].avatar}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-foreground">{testimonials[current].author}</p>
                    <p className="text-sm text-muted-foreground">{testimonials[current].role}</p>
                    <p className="text-sm text-primary">{testimonials[current].property}</p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
            
            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <Button variant="outline" size="icon" onClick={prev} className="rounded-full">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex gap-2">
                {testimonials.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setAutoplay(false); setCurrent(i); }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === current ? 'bg-primary w-6' : 'bg-muted hover:bg-muted-foreground/30'
                    }`}
                  />
                ))}
              </div>
              <Button variant="outline" size="icon" onClick={next} className="rounded-full">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
