import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import { Plane, Activity, UtensilsCrossed, CalendarDays, TrendingUp, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tourSteps = [
  {
    id: 'prearrival',
    icon: Plane,
    title: 'Pre-arrival',
    caption: 'Guests confirm details, share preferences, and pre-book from home.',
    detailPoints: ['Flight details & ETA', 'Dietary preferences', 'Pre-book activities & dining'],
  },
  {
    id: 'activities',
    icon: Activity,
    title: 'Activities & Experiences',
    caption: 'Staff create sessions once; guests see live availability.',
    detailPoints: ['Real-time capacity', 'Instant confirmations', 'Waitlist management'],
  },
  {
    id: 'dining',
    icon: UtensilsCrossed,
    title: 'Dining & Restaurants',
    caption: 'Guests pick times that work; staff see accurate covers instantly.',
    detailPoints: ['Time slot management', 'Special requests', 'Cover forecasting'],
  },
  {
    id: 'itinerary',
    icon: CalendarDays,
    title: 'In-stay Itinerary',
    caption: "Guests always know what's next; staff don't have to chase.",
    detailPoints: ['Today view', 'Automatic updates', 'Push notifications'],
  },
  {
    id: 'insights',
    icon: TrendingUp,
    title: 'Loyalty & Insights',
    caption: 'Identify high-value guests and use real data to design future offers.',
    detailPoints: ['Points & tiers', 'Guest profiles', 'Revenue analytics'],
  },
];

export function ProductTourSection() {
  const [activeStep, setActiveStep] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { amount: 0.3 });
  const [reducedMotion, setReducedMotion] = useState(false);
  
  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);
  
  const nextStep = () => setActiveStep(prev => (prev + 1) % tourSteps.length);
  const prevStep = () => setActiveStep(prev => (prev - 1 + tourSteps.length) % tourSteps.length);
  
  return (
    <section id="product-tour" ref={sectionRef} className="py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-card/50 to-transparent" />
      
      {/* Decorative elements */}
      <div className="absolute top-1/4 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-[300px] h-[300px] bg-teal-400/5 rounded-full blur-[80px] pointer-events-none" />
      
      <div className="container relative mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            See Propera in action
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From pre-arrival planning to checkout, every touchpoint connected
          </p>
        </motion.div>
        
        <div className="grid lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
          {/* Left: Sticky Step Navigation */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-32 space-y-2">
              {tourSteps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(index)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all ${
                    index === activeStep 
                      ? 'bg-primary/10 border border-primary/30' 
                      : 'bg-transparent hover:bg-muted/50 border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                    index === activeStep 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold truncate ${index === activeStep ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.title}
                    </p>
                    {index === activeStep && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="text-sm text-muted-foreground mt-1 line-clamp-2"
                      >
                        {step.caption}
                      </motion.p>
                    )}
                  </div>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === activeStep 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                </button>
              ))}
              
              {/* Mobile Nav */}
              <div className="flex items-center justify-center gap-3 mt-6 lg:hidden">
                <Button variant="outline" size="icon" onClick={prevStep} className="rounded-full">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex gap-1">
                  {tourSteps.map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-2 h-2 rounded-full transition-colors ${i === activeStep ? 'bg-primary' : 'bg-muted'}`} 
                    />
                  ))}
                </div>
                <Button variant="outline" size="icon" onClick={nextStep} className="rounded-full">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          {/* Right: Mockup Display */}
          <div className="lg:col-span-8">
            <div className="bg-card rounded-3xl border border-border/50 shadow-elevated overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  className="p-6 md:p-8"
                >
                  {/* Title overlay */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      {(() => {
                        const Icon = tourSteps[activeStep].icon;
                        return <Icon className="h-6 w-6" />;
                      })()}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">
                        {tourSteps[activeStep].title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {tourSteps[activeStep].caption}
                      </p>
                    </div>
                  </div>
                  
                  {/* Mockup */}
                  <div className="bg-muted/20 rounded-2xl p-6 min-h-[300px] flex items-center justify-center">
                    {activeStep === 0 && <PrearrivalMockup reducedMotion={reducedMotion} />}
                    {activeStep === 1 && <ActivitiesMockup reducedMotion={reducedMotion} />}
                    {activeStep === 2 && <DiningMockup reducedMotion={reducedMotion} />}
                    {activeStep === 3 && <ItineraryMockup reducedMotion={reducedMotion} />}
                    {activeStep === 4 && <InsightsMockup reducedMotion={reducedMotion} />}
                  </div>
                  
                  {/* Detail points */}
                  <div className="flex flex-wrap gap-3 mt-6">
                    {tourSteps[activeStep].detailPoints.map((point, i) => (
                      <motion.div
                        key={point}
                        initial={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + i * 0.1 }}
                        className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-full text-sm"
                      >
                        <Check className="h-3 w-3" />
                        {point}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PrearrivalMockup({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="w-full max-w-[280px] mx-auto">
      <div className="bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-teal-400 p-4 text-primary-foreground">
          <p className="text-xs opacity-80">Welcome to</p>
          <p className="text-lg font-bold">Azure Shores Resort</p>
        </div>
        <div className="p-4 space-y-3">
          <motion.div 
            initial={reducedMotion ? {} : { scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="text-center py-3 bg-primary/10 rounded-xl"
          >
            <motion.p 
              initial={reducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-primary"
            >
              5
            </motion.p>
            <p className="text-xs text-muted-foreground">days until arrival</p>
          </motion.div>
          <div className="space-y-2">
            <CheckRow checked text="Flight details confirmed" delay={0.4} reducedMotion={reducedMotion} />
            <CheckRow checked text="Dietary preferences set" delay={0.5} reducedMotion={reducedMotion} />
            <CheckRow text="Pre-book a sunset dinner" delay={0.6} reducedMotion={reducedMotion} pulse />
            <CheckRow text="Reserve spa treatment" delay={0.7} reducedMotion={reducedMotion} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivitiesMockup({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      {/* Staff view */}
      <motion.div 
        initial={reducedMotion ? {} : { y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl shadow-md border border-border/50 p-3"
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-muted-foreground">Staff Console</p>
          <div className="flex items-center gap-1">
            <span className="relative flex h-2 w-2">
              <span className={`${reducedMotion ? '' : 'animate-ping'} absolute inline-flex h-full w-full rounded-full bg-success opacity-75`} />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-[10px] text-success">Live</span>
          </div>
        </div>
        <div className="space-y-2">
          <SessionRow time="09:00" name="Sunrise Yoga" pax="8/12" status="open" delay={0.3} reducedMotion={reducedMotion} />
          <SessionRow time="10:30" name="Snorkeling Safari" pax="8/8" status="full" delay={0.4} reducedMotion={reducedMotion} />
          <SessionRow time="14:00" name="Cooking Class" pax="4/6" status="open" delay={0.5} reducedMotion={reducedMotion} />
        </div>
      </motion.div>
      {/* Guest overlay */}
      <motion.div 
        initial={reducedMotion ? {} : { x: 20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-card rounded-xl shadow-lg border-2 border-primary/30 p-3 transform translate-x-4"
      >
        <p className="text-xs font-medium text-primary mb-2">Guest just booked!</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Sunrise Yoga</p>
            <p className="text-xs text-muted-foreground">Tomorrow, 09:00</p>
          </div>
          <motion.div 
            initial={reducedMotion ? {} : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.8, type: 'spring' }}
            className="bg-success/10 text-success text-xs font-medium px-2 py-1 rounded-full"
          >
            Confirmed
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}

function DiningMockup({ reducedMotion }: { reducedMotion: boolean }) {
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  
  useEffect(() => {
    if (reducedMotion) {
      setSelectedTime('19:00');
      return;
    }
    const timer = setTimeout(() => setSelectedTime('19:00'), 800);
    return () => clearTimeout(timer);
  }, [reducedMotion]);
  
  return (
    <div className="w-full max-w-md mx-auto grid grid-cols-2 gap-3">
      {/* Restaurant view */}
      <motion.div 
        initial={reducedMotion ? {} : { y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl shadow-md border border-border/50 p-3"
      >
        <p className="text-xs font-medium text-muted-foreground mb-2">The Ocean Grill</p>
        <div className="space-y-1.5">
          <SlotRow time="18:30" covers="12/24" reducedMotion={reducedMotion} />
          <SlotRow time="19:00" covers={selectedTime ? '21/24' : '20/24'} highlight={!!selectedTime} reducedMotion={reducedMotion} />
          <SlotRow time="19:30" covers="8/24" reducedMotion={reducedMotion} />
        </div>
      </motion.div>
      {/* Guest booking */}
      <motion.div 
        initial={reducedMotion ? {} : { y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-xl shadow-md border border-border/50 p-3"
      >
        <p className="text-xs font-medium text-muted-foreground mb-2">Guest Booking</p>
        <div className="bg-muted/30 rounded-lg p-2 mb-2">
          <p className="text-sm font-semibold text-foreground">Tonight</p>
          <p className="text-xs text-muted-foreground">2 guests</p>
        </div>
        <div className="space-y-1">
          <TimeOption time="18:30" available />
          <TimeOption time="19:00" selected={selectedTime === '19:00'} />
          <TimeOption time="19:30" available />
        </div>
      </motion.div>
    </div>
  );
}

function ItineraryMockup({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <div className="w-full max-w-[280px] mx-auto">
      <motion.div 
        initial={reducedMotion ? {} : { y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-card rounded-2xl shadow-lg border border-border/50 p-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-lg font-bold text-foreground">My Day</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sunset to-coral-400" />
        </div>
        <div className="space-y-3">
          <ItineraryItem time="09:00" title="Sunrise Yoga" location="Beach Deck" type="activity" delay={0.3} reducedMotion={reducedMotion} />
          <ItineraryItem time="12:30" title="Lunch" location="Pool Bar" type="dining" delay={0.4} reducedMotion={reducedMotion} />
          <ItineraryItem time="15:00" title="Spa Treatment" location="Wellness Center" type="spa" delay={0.5} reducedMotion={reducedMotion} />
          <ItineraryItem time="19:30" title="Dinner" location="Ocean Grill" type="dining" delay={0.6} reducedMotion={reducedMotion} />
        </div>
      </motion.div>
    </div>
  );
}

function InsightsMockup({ reducedMotion }: { reducedMotion: boolean }) {
  const [points, setPoints] = useState(reducedMotion ? 2450 : 0);
  
  useEffect(() => {
    if (reducedMotion) return;
    const duration = 1500;
    const target = 2450;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setPoints(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    const timeout = setTimeout(tick, 500);
    return () => clearTimeout(timeout);
  }, [reducedMotion]);
  
  return (
    <div className="w-full max-w-md mx-auto grid grid-cols-2 gap-3">
      {/* Loyalty card */}
      <motion.div 
        initial={reducedMotion ? {} : { scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-sunset to-coral-400 rounded-xl p-4 text-primary-foreground relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.2),_transparent)]" />
        <p className="text-xs opacity-80 relative">Gold Member</p>
        <p className="text-2xl font-bold mt-1 relative">{points.toLocaleString()}</p>
        <p className="text-xs opacity-80 relative">points</p>
        <div className="mt-3 bg-white/20 rounded-full h-2 relative">
          <motion.div 
            initial={reducedMotion ? { width: '75%' } : { width: 0 }}
            animate={{ width: '75%' }}
            transition={{ delay: 0.5, duration: 1 }}
            className="bg-white rounded-full h-2" 
          />
        </div>
        <p className="text-[10px] mt-1 opacity-70 relative">550 to Platinum</p>
        
        {/* Glow effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute inset-0 bg-white/20 rounded-xl"
        />
      </motion.div>
      {/* Analytics */}
      <motion.div 
        initial={reducedMotion ? {} : { y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-xl shadow-md border border-border/50 p-3"
      >
        <p className="text-xs font-medium text-muted-foreground mb-2">This Week</p>
        <div className="space-y-2">
          <MetricRow label="Bookings" value="+24%" positive delay={0.4} reducedMotion={reducedMotion} />
          <MetricRow label="Revenue" value="$18.2k" delay={0.5} reducedMotion={reducedMotion} />
          <MetricRow label="Repeat guests" value="42%" delay={0.6} reducedMotion={reducedMotion} />
        </div>
      </motion.div>
    </div>
  );
}

// Helper components
function CheckRow({ text, checked, pulse, delay = 0, reducedMotion }: { text: string; checked?: boolean; pulse?: boolean; delay?: number; reducedMotion: boolean }) {
  return (
    <motion.div 
      initial={reducedMotion ? {} : { opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center gap-2"
    >
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${checked ? 'bg-success text-success-foreground' : 'border-2 border-muted-foreground/30'} ${pulse && !reducedMotion ? 'animate-pulse' : ''}`}>
        {checked && '✓'}
      </div>
      <span className={`text-sm ${checked ? 'text-muted-foreground' : 'text-foreground'}`}>{text}</span>
    </motion.div>
  );
}

function SessionRow({ time, name, pax, status, delay = 0, reducedMotion }: { time: string; name: string; pax: string; status: 'open' | 'full'; delay?: number; reducedMotion: boolean }) {
  return (
    <motion.div 
      initial={reducedMotion ? {} : { opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex items-center justify-between py-1"
    >
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-mono w-10">{time}</span>
        <span className="text-sm text-foreground">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{pax}</span>
        <div className={`w-2 h-2 rounded-full ${status === 'full' ? 'bg-destructive' : 'bg-success'}`} />
      </div>
    </motion.div>
  );
}

function SlotRow({ time, covers, highlight, reducedMotion }: { time: string; covers: string; highlight?: boolean; reducedMotion: boolean }) {
  return (
    <motion.div 
      animate={highlight ? { backgroundColor: 'hsl(var(--warning) / 0.1)' } : {}}
      className={`flex items-center justify-between py-1 px-2 rounded transition-colors`}
    >
      <span className="text-xs text-foreground">{time}</span>
      <span className={`text-xs ${highlight ? 'text-warning font-medium' : 'text-muted-foreground'}`}>{covers}</span>
    </motion.div>
  );
}

function TimeOption({ time, available, selected }: { time: string; available?: boolean; selected?: boolean }) {
  return (
    <motion.div 
      animate={selected ? { scale: [1, 1.05, 1] } : {}}
      className={`py-1.5 px-2 rounded text-center text-xs transition-colors ${selected ? 'bg-primary text-primary-foreground' : available ? 'bg-muted/50 text-foreground' : 'bg-muted/20 text-muted-foreground'}`}
    >
      {time}
    </motion.div>
  );
}

function ItineraryItem({ time, title, location, type, delay = 0, reducedMotion }: { time: string; title: string; location: string; type: string; delay?: number; reducedMotion: boolean }) {
  const colors: Record<string, string> = {
    activity: 'bg-primary',
    dining: 'bg-sunset',
    spa: 'bg-orchid',
  };
  return (
    <motion.div 
      initial={reducedMotion ? {} : { opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="flex gap-3"
    >
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${colors[type]}`} />
        <div className="w-0.5 flex-1 bg-border" />
      </div>
      <div className="pb-3">
        <p className="text-xs text-muted-foreground">{time}</p>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{location}</p>
      </div>
    </motion.div>
  );
}

function MetricRow({ label, value, positive, delay = 0, reducedMotion }: { label: string; value: string; positive?: boolean; delay?: number; reducedMotion: boolean }) {
  return (
    <motion.div 
      initial={reducedMotion ? {} : { opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="flex items-center justify-between"
    >
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${positive ? 'text-success' : 'text-foreground'}`}>{value}</span>
    </motion.div>
  );
}
