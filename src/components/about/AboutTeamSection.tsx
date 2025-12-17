import { motion, useReducedMotion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TESTIMONIALS = [
  {
    quote: "Propera transformed how we manage guest experiences. The pre-arrival system alone saved us hours of back-and-forth.",
    role: "Operations Director",
    property: "Coastal Resort Group",
    bgUI: (
      <div className="opacity-20 absolute inset-0 flex items-center justify-center">
        <div className="w-32 h-20 bg-primary/30 rounded-lg blur-sm" />
      </div>
    ),
  },
  {
    quote: "Finally, one platform our entire team uses. Activities, dining, front desk — all seeing the same live data.",
    role: "General Manager",
    property: "Mountain Wellness Retreat",
    bgUI: (
      <div className="opacity-20 absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-3 gap-2 w-40">
          <div className="h-6 bg-teal-400/30 rounded blur-sm" />
          <div className="h-6 bg-teal-400/30 rounded blur-sm" />
          <div className="h-6 bg-teal-400/30 rounded blur-sm" />
        </div>
      </div>
    ),
  },
  {
    quote: "The loyalty program drove real repeat bookings. Guests love seeing their tier and points — it creates engagement.",
    role: "F&B Director",
    property: "Urban Resort Hotel",
    bgUI: (
      <div className="opacity-20 absolute inset-0 flex items-center justify-center">
        <div className="w-24 h-24 rounded-full border-4 border-violet-400/30 blur-sm" />
      </div>
    ),
  },
];

export function AboutTeamSection() {
  const reducedMotion = useReducedMotion();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % TESTIMONIALS.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);

  return (
    <section className="py-20 md:py-28 bg-card relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What resort teams are saying
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Real feedback from operations leaders using Propera every day.
          </p>
        </motion.div>

        {/* Testimonial Carousel */}
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            {/* Navigation buttons */}
            <Button
              variant="outline"
              size="icon"
              className="absolute -left-4 md:-left-12 top-1/2 -translate-y-1/2 rounded-full shadow-lg z-10 hidden md:flex"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="absolute -right-4 md:-right-12 top-1/2 -translate-y-1/2 rounded-full shadow-lg z-10 hidden md:flex"
              onClick={nextSlide}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>

            {/* Slides */}
            <div className="overflow-hidden rounded-2xl">
              <motion.div
                key={currentSlide}
                initial={reducedMotion ? {} : { opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.4 }}
                className="bg-background rounded-2xl border border-border/50 p-8 md:p-12 relative overflow-hidden"
              >
                {/* Background UI layer */}
                {TESTIMONIALS[currentSlide].bgUI}

                <div className="relative z-10">
                  <Quote className="h-10 w-10 text-primary/20 mb-6" />
                  <blockquote className="text-xl md:text-2xl font-medium text-foreground mb-8 leading-relaxed">
                    "{TESTIMONIALS[currentSlide].quote}"
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-primary">
                        {TESTIMONIALS[currentSlide].role.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{TESTIMONIALS[currentSlide].role}</p>
                      <p className="text-sm text-muted-foreground">{TESTIMONIALS[currentSlide].property}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mt-6">
              {TESTIMONIALS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentSlide ? 'bg-primary w-6' : 'bg-primary/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
