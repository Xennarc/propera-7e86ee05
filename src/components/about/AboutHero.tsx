import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, Coffee, Waves, Sparkles, MessageSquare } from 'lucide-react';

export function AboutHero() {
  const reducedMotion = useReducedMotion();

  const scrollToProduct = () => {
    document.getElementById('product-story')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-24 pb-16">
      {/* Rich gradient mesh background - enhanced for light mode */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-teal-400/8 dark:from-background dark:via-background dark:to-primary/5" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/12 dark:bg-primary/8 rounded-full blur-[180px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-400/15 dark:bg-teal-400/8 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] bg-accent/10 dark:bg-accent/5 rounded-full blur-[120px] pointer-events-none" />
        {/* Soft spotlight glow behind headline */}
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[300px] bg-primary/15 dark:bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        {/* Subtle atlas texture for light mode */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left - Content */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-8 border border-primary/20">
              About Propera
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-8 leading-[1.1] tracking-tight">
              Hospitality, with{' '}
              <span className="text-primary">calm precision.</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-xl">
              Propera was created to bring clarity to the busiest places — so teams can focus on service, and guests can focus on the stay.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <Button 
                size="lg" 
                className="rounded-full font-semibold px-8 shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all"
                onClick={scrollToProduct}
              >
                See the platform
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                asChild
                variant="outline" 
                size="lg" 
                className="rounded-full font-semibold"
              >
                <Link to="/pricing">View pricing</Link>
              </Button>
            </div>
          </motion.div>

          {/* Right - Story Preview Panel */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="relative">
              {/* Glass frame card */}
              <div className="bg-card/60 backdrop-blur-2xl rounded-3xl border border-border/50 shadow-2xl overflow-hidden p-6">
                {/* Mac dots */}
                <div className="flex items-center gap-2 mb-6">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-3">A Day at the Resort</span>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                  <TimelineItem 
                    time="Morning" 
                    label="Breakfast reservation" 
                    icon={<Coffee className="h-4 w-4" />}
                    color="bg-amber-500/20 text-amber-600 dark:text-amber-400"
                    delay={0.4}
                    reducedMotion={reducedMotion}
                  />
                  <TimelineItem 
                    time="Midday" 
                    label="Lagoon activity" 
                    icon={<Waves className="h-4 w-4" />}
                    color="bg-teal-500/20 text-teal-600 dark:text-teal-400"
                    delay={0.5}
                    reducedMotion={reducedMotion}
                  />
                  <TimelineItem 
                    time="Evening" 
                    label="Spa session" 
                    icon={<Sparkles className="h-4 w-4" />}
                    color="bg-violet-500/20 text-violet-600 dark:text-violet-400"
                    delay={0.6}
                    reducedMotion={reducedMotion}
                  />
                  <TimelineItem 
                    time="Night" 
                    label="Special request" 
                    icon={<MessageSquare className="h-4 w-4" />}
                    color="bg-primary/20 text-primary"
                    delay={0.7}
                    reducedMotion={reducedMotion}
                  />
                </div>

                {/* Stamp */}
                <div className="mt-6 pt-4 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Preview (illustrative)</span>
                    <div className="flex items-center gap-2 text-xs text-primary font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Designed for real operations
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Ocean line divider */}
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
          className="absolute bottom-16 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
        />

        {/* Scroll indicator */}
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 cursor-pointer"
          onClick={scrollToProduct}
        >
          <span className="text-xs text-muted-foreground">Scroll to explore</span>
          <motion.div
            animate={reducedMotion ? {} : { y: [0, 6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ChevronDown className="h-5 w-5 text-primary" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

function TimelineItem({ 
  time, 
  label, 
  icon, 
  color, 
  delay, 
  reducedMotion 
}: { 
  time: string; 
  label: string; 
  icon: React.ReactNode; 
  color: string; 
  delay: number;
  reducedMotion: boolean;
}) {
  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-4 group"
    >
      <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center transition-transform group-hover:scale-110`}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{time}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
      </div>
      <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
    </motion.div>
  );
}
