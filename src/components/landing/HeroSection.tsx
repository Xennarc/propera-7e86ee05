import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, ChevronDown, Users, UtensilsCrossed, Calendar, Star } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';

export function HeroSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });
  
  // Parallax transforms
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const productY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  const phoneY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  
  // Check for reduced motion preference
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  return (
    <section ref={containerRef} className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
      {/* Layer 1: Background - Global atmosphere */}
      <motion.div 
        style={reducedMotion ? {} : { y: bgY }}
        className="absolute inset-0"
      >
        {/* Main gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        
        {/* Atmospheric orbs */}
        <div className="absolute top-1/4 right-0 w-[900px] h-[900px] bg-primary/8 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[700px] h-[700px] bg-teal-400/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-sunset/5 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                              linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
        
        {/* World map hint - very subtle */}
        <div className="absolute inset-0 opacity-[0.03]">
          <svg viewBox="0 0 1200 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
            <ellipse cx="300" cy="300" rx="100" ry="60" fill="currentColor" className="text-primary" />
            <ellipse cx="600" cy="250" rx="150" ry="80" fill="currentColor" className="text-primary" />
            <ellipse cx="900" cy="350" rx="120" ry="70" fill="currentColor" className="text-primary" />
          </svg>
        </div>
      </motion.div>
      
      <div className="container relative mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left: Copy */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl relative z-10"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 border border-primary/20 backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              For world-class resorts
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
              The operating system for{' '}
              <span className="relative">
                <span className="text-gradient bg-gradient-to-r from-primary via-teal-400 to-primary bg-clip-text text-transparent bg-[length:200%_auto] animate-shimmer">
                  resort stays
                </span>
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              Propera connects your staff console and guest app into one live system 
              for bookings, operations, and loyalty – across every property you run.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="text-base px-8 h-14 rounded-xl shadow-lg hover:shadow-xl hover:shadow-primary/20 transition-all group">
                <Link to="/auth">
                  Book a demo
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-base px-8 h-14 rounded-xl group hover:bg-primary/5" asChild>
                <a href="#product-tour">
                  <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  See Propera in action
                </a>
              </Button>
            </div>
            
            {/* Scroll indicator */}
            <motion.a 
              href="#why-propera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="hidden lg:flex items-center gap-2 mt-12 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
            >
              <span className="text-sm">Scroll to explore</span>
              <motion.div
                animate={reducedMotion ? {} : { y: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </motion.a>
          </motion.div>
          
          {/* Right: Layer 2 + 3 - Product Canvas with Floating Phones */}
          <motion.div 
            style={reducedMotion ? {} : { y: productY }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="relative lg:pl-8"
          >
            <div className="relative">
              {/* Layer 2: Staff Dashboard Mockup */}
              <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-elevated border border-border/50 p-4 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                {/* Window chrome */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-coral-400" />
                    <div className="w-3 h-3 rounded-full bg-sunset-400" />
                    <div className="w-3 h-3 rounded-full bg-success" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">Staff Console — Today at a Glance</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className={`${reducedMotion ? '' : 'animate-ping'} absolute inline-flex h-full w-full rounded-full bg-success opacity-75`} />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                    </span>
                    <span className="text-[10px] text-success font-medium">Live</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  {/* Stats Row with animated counters */}
                  <div className="grid grid-cols-4 gap-2">
                    <StatMini label="Activities" value={12} sublabel="sessions" color="primary" reducedMotion={reducedMotion} />
                    <StatMini label="Covers" value={156} sublabel="dining" color="sunset" reducedMotion={reducedMotion} />
                    <StatMini label="Pre-arrival" value={8} sublabel="guests" color="lagoon" reducedMotion={reducedMotion} />
                    <StatMini label="VIP" value={3} sublabel="in-house" color="orchid" reducedMotion={reducedMotion} />
                  </div>
                  
                  {/* Mini Schedule */}
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Today's Sessions</p>
                    <div className="space-y-1.5">
                      <ScheduleRow time="09:00" activity="Sunrise Yoga" pax="8/12" highlight />
                      <ScheduleRow time="10:30" activity="Snorkeling Safari" pax="6/8" />
                      <ScheduleRow time="14:00" activity="Cooking Class" pax="4/6" />
                    </div>
                  </div>
                  
                  {/* Mini chart */}
                  <div className="bg-muted/20 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">Weekly Bookings</span>
                      <span className="text-xs text-success font-medium">+24%</span>
                    </div>
                    <div className="flex items-end gap-1 h-8">
                      {[40, 55, 45, 70, 65, 85, 78].map((h, i) => (
                        <motion.div
                          key={i}
                          initial={reducedMotion ? { height: `${h}%` } : { height: 0 }}
                          animate={{ height: `${h}%` }}
                          transition={{ delay: 0.8 + i * 0.1, duration: 0.5 }}
                          className="flex-1 bg-primary/60 rounded-t"
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Layer 3: Floating Phone Mockups */}
              <motion.div 
                style={reducedMotion ? {} : { y: phoneY }}
                className="absolute -bottom-8 -left-4 md:-left-12 z-10"
              >
                <motion.div 
                  initial={{ opacity: 0, x: -20, rotate: -10 }}
                  animate={{ opacity: 1, x: 0, rotate: -6 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  whileHover={reducedMotion ? {} : { rotate: 0, scale: 1.02 }}
                  className="w-[140px] md:w-[160px] bg-card/90 backdrop-blur-xl rounded-2xl shadow-elevated border border-border/50 p-2"
                >
                  <div className="bg-gradient-to-br from-primary/20 to-teal-400/20 rounded-xl p-3 mb-2">
                    <p className="text-[10px] font-medium text-primary">Pre-arrival</p>
                    <p className="text-xs font-bold text-foreground mt-1">5 days to go</p>
                  </div>
                  <div className="space-y-1.5 px-1">
                    <ChecklistItem checked text="Flight details" />
                    <ChecklistItem checked text="Preferences" />
                    <ChecklistItem text="Pre-book dinner" pulse />
                  </div>
                </motion.div>
              </motion.div>
              
              <motion.div 
                style={reducedMotion ? {} : { y: phoneY }}
                className="absolute -bottom-4 -right-2 md:-right-8 z-10"
              >
                <motion.div 
                  initial={{ opacity: 0, x: 20, rotate: 6 }}
                  animate={{ opacity: 1, x: 0, rotate: 3 }}
                  transition={{ delay: 0.7, duration: 0.6 }}
                  whileHover={reducedMotion ? {} : { rotate: 0, scale: 1.02 }}
                  className="w-[140px] md:w-[160px] bg-card/90 backdrop-blur-xl rounded-2xl shadow-elevated border border-border/50 p-2"
                >
                  <div className="text-center py-2">
                    <p className="text-[10px] text-muted-foreground">Tonight</p>
                    <p className="text-sm font-bold text-foreground">Book Dinner</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2 space-y-1">
                    <TimeSlot time="18:30" spots="4 left" />
                    <TimeSlot time="19:30" spots="2 left" active />
                    <TimeSlot time="20:30" spots="6 left" />
                  </div>
                </motion.div>
              </motion.div>
              
              {/* Additional floating element - Itinerary card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9, duration: 0.6 }}
                className="absolute -top-4 -right-4 md:-right-12 w-[120px] bg-card/90 backdrop-blur-xl rounded-xl shadow-lg border border-border/50 p-2 z-10"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-3 w-3 text-primary" />
                  <span className="text-[9px] font-medium text-foreground">Today</span>
                </div>
                <div className="space-y-1">
                  <MiniItineraryItem time="09:00" title="Yoga" icon={<Star className="h-2 w-2" />} />
                  <MiniItineraryItem time="12:30" title="Lunch" icon={<UtensilsCrossed className="h-2 w-2" />} />
                  <MiniItineraryItem time="15:00" title="Spa" icon={<Users className="h-2 w-2" />} />
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function StatMini({ label, value, sublabel, color, reducedMotion }: { label: string; value: number; sublabel: string; color: string; reducedMotion: boolean }) {
  const colorClasses: Record<string, string> = {
    primary: 'text-primary',
    sunset: 'text-sunset',
    lagoon: 'text-lagoon',
    orchid: 'text-orchid',
  };
  
  const [displayValue, setDisplayValue] = useState(reducedMotion ? value : 0);
  
  useEffect(() => {
    if (reducedMotion) return;
    const duration = 1500;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const timeout = setTimeout(tick, 500);
    return () => clearTimeout(timeout);
  }, [value, reducedMotion]);
  
  return (
    <div className="bg-muted/30 rounded-lg p-2 text-center hover:bg-muted/40 transition-colors">
      <p className="text-lg font-bold text-foreground">{displayValue}</p>
      <p className={`text-[10px] font-medium ${colorClasses[color]}`}>{label}</p>
      <p className="text-[9px] text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function ScheduleRow({ time, activity, pax, highlight }: { time: string; activity: string; pax: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-xs py-1 px-1 rounded ${highlight ? 'bg-primary/10' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-mono">{time}</span>
        <span className="text-foreground font-medium">{activity}</span>
      </div>
      <span className="text-primary font-medium">{pax}</span>
    </div>
  );
}

function ChecklistItem({ text, checked, pulse }: { text: string; checked?: boolean; pulse?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${checked ? 'bg-success border-success' : 'border-muted-foreground/30'} ${pulse ? 'animate-pulse' : ''}`}>
        {checked && <span className="text-success-foreground text-[8px]">✓</span>}
      </div>
      <span className={`text-[10px] ${checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{text}</span>
    </div>
  );
}

function TimeSlot({ time, spots, active }: { time: string; spots: string; active?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-2 py-1 rounded transition-colors ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}>
      <span className={`text-[10px] font-medium ${active ? '' : 'text-foreground'}`}>{time}</span>
      <span className={`text-[9px] ${active ? '' : 'text-muted-foreground'}`}>{spots}</span>
    </div>
  );
}

function MiniItineraryItem({ time, title, icon }: { time: string; title: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[8px] text-muted-foreground w-8">{time}</span>
      <div className="text-primary">{icon}</div>
      <span className="text-[9px] text-foreground">{title}</span>
    </div>
  );
}
