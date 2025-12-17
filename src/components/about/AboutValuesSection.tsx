import { motion, useReducedMotion } from 'framer-motion';
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORYBOARD_PANELS = [
  {
    belief: 'One source of truth for the whole resort',
    beforeLabel: 'Before',
    afterLabel: 'With Propera',
    beforeVisual: (
      <div className="space-y-2">
        <div className="flex gap-2 opacity-60">
          <div className="h-8 w-16 bg-muted/50 rounded blur-[1px] border border-border/30" />
          <div className="h-8 w-12 bg-muted/50 rounded blur-[1px] border border-border/30" />
        </div>
        <div className="flex gap-2 opacity-50">
          <div className="h-6 w-20 bg-muted/40 rounded blur-[1px]" />
          <div className="h-6 w-8 bg-amber-500/20 rounded blur-[1px]" />
        </div>
        <div className="h-4 w-24 bg-muted/30 rounded blur-[1px]" />
      </div>
    ),
    afterVisual: (
      <div className="bg-card/80 rounded-xl border border-primary/20 p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] text-primary font-medium">Live Dashboard</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-primary/10 rounded p-1.5 text-center">
            <p className="text-sm font-bold text-foreground">24</p>
            <p className="text-[8px] text-muted-foreground">Sessions</p>
          </div>
          <div className="bg-primary/10 rounded p-1.5 text-center">
            <p className="text-sm font-bold text-foreground">186</p>
            <p className="text-[8px] text-muted-foreground">Covers</p>
          </div>
          <div className="bg-primary/10 rounded p-1.5 text-center">
            <p className="text-sm font-bold text-foreground">12</p>
            <p className="text-[8px] text-muted-foreground">Arrivals</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    belief: 'Guests should self-serve with confidence',
    beforeLabel: 'Before',
    afterLabel: 'With Propera',
    beforeVisual: (
      <div className="space-y-2 opacity-60">
        <div className="h-10 w-full bg-muted/40 rounded flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">📞 Call reception</span>
        </div>
        <div className="flex gap-1">
          <div className="h-6 flex-1 bg-muted/30 rounded" />
          <div className="h-6 flex-1 bg-muted/30 rounded" />
        </div>
      </div>
    ),
    afterVisual: (
      <div className="bg-card/80 rounded-xl border border-teal-400/20 p-3 shadow-lg">
        <div className="space-y-2">
          <div className="bg-teal-400/10 rounded-lg p-2">
            <p className="text-[10px] text-teal-600 dark:text-teal-400">Sunset Cruise</p>
            <p className="text-xs font-semibold text-foreground">Booked ✓</p>
          </div>
          <div className="bg-emerald-500/10 rounded-lg p-2 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-emerald-500 text-xs">✓</span>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Added to itinerary</p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    belief: 'Global portfolio, local personality',
    beforeLabel: 'Before',
    afterLabel: 'With Propera',
    beforeVisual: (
      <div className="space-y-2 opacity-60">
        <div className="flex gap-1">
          <div className="h-12 w-12 bg-muted/40 rounded" />
          <div className="h-12 w-12 bg-muted/40 rounded" />
          <div className="h-12 w-12 bg-muted/40 rounded" />
        </div>
        <p className="text-[9px] text-muted-foreground">3 different systems</p>
      </div>
    ),
    afterVisual: (
      <div className="bg-card/80 rounded-xl border border-violet-500/20 p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded bg-violet-500/20" />
          <span className="text-xs font-semibold text-foreground">Portfolio View</span>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-foreground">Island Resort</span>
            <span className="text-muted-foreground ml-auto">94%</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-foreground">Mountain Lodge</span>
            <span className="text-muted-foreground ml-auto">87%</span>
          </div>
        </div>
      </div>
    ),
  },
  {
    belief: 'Make data actionable',
    beforeLabel: 'Before',
    afterLabel: 'With Propera',
    beforeVisual: (
      <div className="space-y-2 opacity-60">
        <div className="h-16 w-full bg-muted/40 rounded flex items-center justify-center">
          <span className="text-[10px] text-muted-foreground">📊 Static report</span>
        </div>
      </div>
    ),
    afterVisual: (
      <div className="bg-card/80 rounded-xl border border-amber-500/20 p-3 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">AI Insight</span>
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        </div>
        <p className="text-[10px] text-foreground leading-relaxed">
          "Sunset tours have 40% more bookings on Wednesdays. Consider adding a second session."
        </p>
      </div>
    ),
  },
];

export function AboutValuesSection() {
  const reducedMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = 400;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <section className="py-20 md:py-28 bg-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background/50 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            What we believe — and how it shows up in the product
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Every feature starts with a conviction about how resorts should operate.
          </p>
        </motion.div>

        {/* Horizontal Storyboard */}
        <div className="relative">
          {/* Scroll buttons */}
          <div className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20">
            <Button
              variant="outline"
              size="icon"
              className={`rounded-full shadow-lg ${!canScrollLeft ? 'opacity-30 cursor-not-allowed' : ''}`}
              onClick={() => scroll('left')}
              disabled={!canScrollLeft}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
          <div className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20">
            <Button
              variant="outline"
              size="icon"
              className={`rounded-full shadow-lg ${!canScrollRight ? 'opacity-30 cursor-not-allowed' : ''}`}
              onClick={() => scroll('right')}
              disabled={!canScrollRight}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div 
            ref={scrollRef}
            onScroll={checkScroll}
            className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {STORYBOARD_PANELS.map((panel, index) => (
              <motion.div
                key={index}
                initial={reducedMotion ? {} : { opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex-shrink-0 w-[340px] md:w-[400px] snap-center"
              >
                <div className="bg-background rounded-2xl border border-border/50 overflow-hidden h-full">
                  {/* Belief header */}
                  <div className="bg-gradient-to-r from-primary/10 to-primary/5 px-6 py-4 border-b border-border/50">
                    <p className="text-sm font-semibold text-foreground">"{panel.belief}"</p>
                  </div>
                  
                  {/* Before / After comparison */}
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Before */}
                      <div>
                        <p className="text-xs text-muted-foreground mb-3 uppercase tracking-wide">{panel.beforeLabel}</p>
                        <div className="min-h-[100px] flex items-center">
                          {panel.beforeVisual}
                        </div>
                      </div>
                      
                      {/* Arrow connector */}
                      <div className="relative">
                        <div className="absolute left-0 top-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-muted/50 to-primary/50" />
                        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="text-primary text-xs">→</span>
                          </div>
                        </div>
                        <p className="text-xs text-primary mb-3 uppercase tracking-wide">{panel.afterLabel}</p>
                        <div className="min-h-[100px] flex items-center">
                          {panel.afterVisual}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Progress dots for mobile */}
          <div className="flex justify-center gap-2 mt-4 md:hidden">
            {STORYBOARD_PANELS.map((_, index) => (
              <div key={index} className="w-2 h-2 rounded-full bg-primary/30" />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
