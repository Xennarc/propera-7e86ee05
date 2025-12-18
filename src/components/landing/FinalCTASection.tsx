import { Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle, Smartphone, Monitor, BarChart3, Layers } from 'lucide-react';
import { useRef, memo } from 'react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';

// Memoized stack layer for performance
const StackLayer = memo(function StackLayer({
  icon,
  label,
  description,
  variant,
  index,
  isInView,
  shouldAnimate,
  uiPreview,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  variant: 'top' | 'middle' | 'bottom';
  index: number;
  isInView: boolean;
  shouldAnimate: boolean;
  uiPreview: React.ReactNode;
}) {
  const bgClasses = {
    top: 'bg-primary/10 border-primary/30 hover:border-primary/50',
    middle: 'bg-card border-border hover:border-primary/30',
    bottom: 'bg-teal-400/10 border-teal-400/30 hover:border-teal-400/50',
  };

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, scale: 0.95, y: 20 } : { opacity: 1, scale: 1, y: 0 }}
      animate={isInView ? { opacity: 1, scale: 1, y: 0 } : {}}
      transition={{ delay: 0.15 + index * 0.1, duration: 0.4 }}
      className={`relative flex items-start gap-4 p-4 rounded-xl border backdrop-blur-sm shadow-sm transition-all duration-300 hover:-translate-y-0.5 will-change-transform ${bgClasses[variant]}`}
    >
      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {uiPreview}
      </div>
    </motion.div>
  );
});

export function FinalCTASection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, amount: 0.3 });
  const { shouldAnimate } = useAnimationPreference();

  return (
    <section ref={sectionRef} className="py-24 relative overflow-hidden">
      {/* Background - simplified */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-teal-400/10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="container relative mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left: Copy and CTAs */}
          <motion.div
            initial={shouldAnimate ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-center lg:text-left"
          >
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              Ready to connect every layer of your{' '}
              <span className="text-gradient bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                resort?
              </span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-xl">
              Unify guest experience, staff operations, and portfolio insights in one platform — built for resorts worldwide.
            </p>

            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4">
              <Button asChild size="lg" className="text-base px-8 h-14 rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all group w-full sm:w-auto">
                <Link to="/auth">
                  Book a live demo
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-base px-8 h-14 rounded-xl hover:bg-primary/5 w-full sm:w-auto" asChild>
                <Link to="/pricing">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Talk to our team
                </Link>
              </Button>
            </div>
          </motion.div>

          {/* Right: Stack Diagram */}
          <motion.div
            initial={shouldAnimate ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative max-w-md mx-auto">
              {/* Vertical glow connector - CSS only for performance */}
              <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-primary via-teal-400 to-primary rounded-full" />
                {shouldAnimate && (
                  <div className="absolute inset-0 bg-gradient-to-b from-primary via-teal-400 to-primary rounded-full blur-md animate-pulse" />
                )}
              </div>

              <div className="flex flex-col gap-4">
                <StackLayer
                  icon={<BarChart3 className="h-5 w-5" />}
                  label="Admin & Analytics"
                  description="Portfolio insights"
                  variant="top"
                  index={0}
                  isInView={isInView}
                  shouldAnimate={shouldAnimate}
                  uiPreview={
                    <div className="flex gap-1 mt-2">
                      {[60, 80, 45, 90, 70].map((h, i) => (
                        <div key={i} className="flex-1 bg-primary/30 rounded-sm" style={{ height: `${h/4}px` }} />
                      ))}
                    </div>
                  }
                />
                <StackLayer
                  icon={<Monitor className="h-5 w-5" />}
                  label="Staff Console"
                  description="Operations & bookings"
                  variant="middle"
                  index={1}
                  isInView={isInView}
                  shouldAnimate={shouldAnimate}
                  uiPreview={
                    <div className="grid grid-cols-3 gap-1 mt-2">
                      <div className="h-4 bg-sunset/30 rounded-sm" />
                      <div className="h-4 bg-lagoon/30 rounded-sm" />
                      <div className="h-4 bg-orchid/30 rounded-sm" />
                    </div>
                  }
                />
                <StackLayer
                  icon={<Smartphone className="h-5 w-5" />}
                  label="Guest App"
                  description="Pre-arrival to checkout"
                  variant="bottom"
                  index={2}
                  isInView={isInView}
                  shouldAnimate={shouldAnimate}
                  uiPreview={
                    <div className="space-y-1 mt-2">
                      <div className="h-3 bg-teal-400/30 rounded-sm w-3/4" />
                      <div className="h-3 bg-teal-400/20 rounded-sm w-1/2" />
                    </div>
                  }
                />
              </div>

              <motion.p
                initial={shouldAnimate ? { opacity: 0 } : { opacity: 1 }}
                animate={isInView ? { opacity: 1 } : {}}
                transition={{ delay: 0.6 }}
                className="text-center text-sm text-muted-foreground mt-6 flex items-center justify-center gap-2"
              >
                <Layers className="h-4 w-4 text-primary" />
                All connected by Propera
              </motion.p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
