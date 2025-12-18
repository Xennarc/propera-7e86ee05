import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play, ChevronDown, Users, UtensilsCrossed, Calendar, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { memo, useRef, useState, useEffect, useCallback } from 'react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';

// Memoize static sub-components to prevent re-renders
const StatMini = memo(function StatMini({ 
  label, 
  value, 
  sublabel, 
  color, 
  shouldAnimate 
}: { 
  label: string; 
  value: number; 
  sublabel: string; 
  color: string; 
  shouldAnimate: boolean;
}) {
  const colorClasses: Record<string, string> = {
    primary: 'text-primary',
    sunset: 'text-sunset',
    lagoon: 'text-lagoon',
    orchid: 'text-orchid',
  };
  
  const [displayValue, setDisplayValue] = useState(shouldAnimate ? 0 : value);
  const hasAnimated = useRef(false);
  
  useEffect(() => {
    if (!shouldAnimate || hasAnimated.current) {
      setDisplayValue(value);
      return;
    }
    hasAnimated.current = true;
    const duration = 1200;
    const startTime = performance.now();
    let rafId: number;
    
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(eased * value));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    
    const timeout = setTimeout(() => {
      rafId = requestAnimationFrame(tick);
    }, 400);
    
    return () => {
      clearTimeout(timeout);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [value, shouldAnimate]);
  
  return (
    <div className="bg-muted/30 rounded-lg p-2 text-center hover:bg-muted/40 transition-colors">
      <p className="text-lg font-bold text-foreground">{displayValue}</p>
      <p className={`text-[10px] font-medium ${colorClasses[color]}`}>{label}</p>
      <p className="text-[9px] text-muted-foreground">{sublabel}</p>
    </div>
  );
});

const ScheduleRow = memo(function ScheduleRow({ 
  time, 
  activity, 
  pax, 
  highlight 
}: { 
  time: string; 
  activity: string; 
  pax: string; 
  highlight?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between text-xs py-1 px-1 rounded ${highlight ? 'bg-primary/10' : ''}`}>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-mono">{time}</span>
        <span className="text-foreground font-medium">{activity}</span>
      </div>
      <span className="text-primary font-medium">{pax}</span>
    </div>
  );
});

const ChecklistItem = memo(function ChecklistItem({ 
  text, 
  checked, 
  pulse 
}: { 
  text: string; 
  checked?: boolean; 
  pulse?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${checked ? 'bg-success border-success' : 'border-muted-foreground/30'} ${pulse ? 'animate-pulse' : ''}`}>
        {checked && <span className="text-success-foreground text-[8px]">✓</span>}
      </div>
      <span className={`text-[10px] ${checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{text}</span>
    </div>
  );
});

const TimeSlot = memo(function TimeSlot({ 
  time, 
  spots, 
  active 
}: { 
  time: string; 
  spots: string; 
  active?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-2 py-1 rounded transition-colors ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'}`}>
      <span className={`text-[10px] font-medium ${active ? '' : 'text-foreground'}`}>{time}</span>
      <span className={`text-[9px] ${active ? '' : 'text-muted-foreground'}`}>{spots}</span>
    </div>
  );
});

const MiniItineraryItem = memo(function MiniItineraryItem({ 
  time, 
  title, 
  icon 
}: { 
  time: string; 
  title: string; 
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[8px] text-muted-foreground w-8">{time}</span>
      <div className="text-primary">{icon}</div>
      <span className="text-[9px] text-foreground">{title}</span>
    </div>
  );
});

// Staff Dashboard Mockup - memoized to prevent re-renders
const StaffDashboardMockup = memo(function StaffDashboardMockup({ 
  shouldAnimate 
}: { 
  shouldAnimate: boolean;
}) {
  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-elevated border border-border/50 p-4 transform rotate-1 hover:rotate-0 transition-transform duration-500 will-change-transform">
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
            <span className={`${shouldAnimate ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-success opacity-75`} />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
          </span>
          <span className="text-[10px] text-success font-medium">Live</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {/* Stats Row */}
        <div className="grid grid-cols-4 gap-2">
          <StatMini label="Activities" value={12} sublabel="sessions" color="primary" shouldAnimate={shouldAnimate} />
          <StatMini label="Covers" value={156} sublabel="dining" color="sunset" shouldAnimate={shouldAnimate} />
          <StatMini label="Pre-arrival" value={8} sublabel="guests" color="lagoon" shouldAnimate={shouldAnimate} />
          <StatMini label="VIP" value={3} sublabel="in-house" color="orchid" shouldAnimate={shouldAnimate} />
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
        
        {/* Mini chart - CSS-only bars for performance */}
        <div className="bg-muted/20 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Weekly Bookings</span>
            <span className="text-xs text-success font-medium">+24%</span>
          </div>
          <div className="flex items-end gap-1 h-8">
            {[40, 55, 45, 70, 65, 85, 78].map((h, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/60 rounded-t transition-all duration-500"
                style={{ height: `${h}%`, transitionDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

// Floating phone cards - lazy loaded after main content
const FloatingPhoneCards = memo(function FloatingPhoneCards({ 
  shouldAnimate 
}: { 
  shouldAnimate: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  
  // Defer mounting to after initial paint
  useEffect(() => {
    const timer = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);
  
  if (!mounted) {
    // Reserve space to prevent CLS
    return (
      <>
        <div className="absolute -bottom-8 -left-4 md:-left-12 z-10 w-[140px] md:w-[160px] h-[140px] md:h-[160px]" />
        <div className="absolute -bottom-4 -right-2 md:-right-8 z-10 w-[140px] md:w-[160px] h-[140px] md:h-[160px]" />
      </>
    );
  }
  
  return (
    <>
      {/* Pre-arrival phone */}
      <motion.div 
        className="absolute -bottom-8 -left-4 md:-left-12 z-10"
        initial={shouldAnimate ? { opacity: 0, x: -20 } : { opacity: 1, x: 0 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <div className="w-[140px] md:w-[160px] bg-card/90 backdrop-blur-xl rounded-2xl shadow-elevated border border-border/50 p-2 transform -rotate-6 hover:rotate-0 transition-transform will-change-transform">
          <div className="bg-gradient-to-br from-primary/20 to-teal-400/20 rounded-xl p-3 mb-2">
            <p className="text-[10px] font-medium text-primary">Pre-arrival</p>
            <p className="text-xs font-bold text-foreground mt-1">5 days to go</p>
          </div>
          <div className="space-y-1.5 px-1">
            <ChecklistItem checked text="Flight details" />
            <ChecklistItem checked text="Preferences" />
            <ChecklistItem text="Pre-book dinner" pulse={shouldAnimate} />
          </div>
        </div>
      </motion.div>
      
      {/* Booking phone */}
      <motion.div 
        className="absolute -bottom-4 -right-2 md:-right-8 z-10"
        initial={shouldAnimate ? { opacity: 0, x: 20 } : { opacity: 1, x: 0 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div className="w-[140px] md:w-[160px] bg-card/90 backdrop-blur-xl rounded-2xl shadow-elevated border border-border/50 p-2 transform rotate-3 hover:rotate-0 transition-transform will-change-transform">
          <div className="text-center py-2">
            <p className="text-[10px] text-muted-foreground">Tonight</p>
            <p className="text-sm font-bold text-foreground">Book Dinner</p>
          </div>
          <div className="bg-muted/30 rounded-lg p-2 space-y-1">
            <TimeSlot time="18:30" spots="4 left" />
            <TimeSlot time="19:30" spots="2 left" active />
            <TimeSlot time="20:30" spots="6 left" />
          </div>
        </div>
      </motion.div>
      
      {/* Itinerary card - hidden on mobile for performance */}
      <motion.div
        initial={shouldAnimate ? { opacity: 0, y: 20 } : { opacity: 1, y: 0 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
        className="absolute -top-4 -right-4 md:-right-12 w-[120px] bg-card/90 backdrop-blur-xl rounded-xl shadow-lg border border-border/50 p-2 z-10 hidden md:block"
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
    </>
  );
});

export function HeroSection() {
  const { shouldAnimate, reducedMotion } = useAnimationPreference();

  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
      {/* Layer 1: Background - Static for performance */}
      <div className="absolute inset-0">
        {/* Main gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        
        {/* Atmospheric orbs - CSS only, no JS */}
        <div className="absolute top-1/4 right-0 w-[600px] md:w-[900px] h-[600px] md:h-[900px] bg-primary/8 rounded-full blur-[120px] md:blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] md:w-[700px] h-[500px] md:h-[700px] bg-teal-400/10 rounded-full blur-[100px] md:blur-[120px] pointer-events-none" />
        
        {/* Subtle grid pattern - CSS background */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                              linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>
      
      <div className="container relative mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left: Copy - Prioritize for LCP */}
          <motion.div 
            initial={shouldAnimate ? { opacity: 0, y: 30 } : { opacity: 1, y: 0 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-xl relative z-10"
          >
            <motion.div 
              initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 border border-primary/20 backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className={`${shouldAnimate ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full bg-primary opacity-75`} />
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
            
            {/* Scroll indicator - hidden on mobile */}
            <a 
              href="#why-propera"
              className="hidden lg:flex items-center gap-2 mt-12 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
            >
              <span className="text-sm">Scroll to explore</span>
              <motion.div
                animate={shouldAnimate ? { y: [0, 5, 0] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ChevronDown className="h-4 w-4" />
              </motion.div>
            </a>
          </motion.div>
          
          {/* Right: Product Canvas - Reserve space for CLS prevention */}
          <motion.div 
            initial={shouldAnimate ? { opacity: 0, scale: 0.95 } : { opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative lg:pl-8"
            style={{ minHeight: '400px' }} // Reserve space
          >
            <div className="relative">
              {/* Main Staff Dashboard - LCP element */}
              <StaffDashboardMockup shouldAnimate={shouldAnimate} />
              
              {/* Floating phones - deferred loading */}
              <FloatingPhoneCards shouldAnimate={shouldAnimate} />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
