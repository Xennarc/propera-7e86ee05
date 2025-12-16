import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, Activity, UtensilsCrossed, CalendarDays, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const tourSteps = [
  {
    id: 'prearrival',
    icon: Plane,
    title: 'Pre-arrival',
    caption: 'Guests confirm details, share preferences, and pre-book from home.',
    mockup: <PrearrivalMockup />,
  },
  {
    id: 'activities',
    icon: Activity,
    title: 'Activities & Experiences',
    caption: 'Staff create sessions once; guests see live availability.',
    mockup: <ActivitiesMockup />,
  },
  {
    id: 'dining',
    icon: UtensilsCrossed,
    title: 'Dining & Restaurants',
    caption: 'Guests pick times that work; staff see accurate covers instantly.',
    mockup: <DiningMockup />,
  },
  {
    id: 'itinerary',
    icon: CalendarDays,
    title: 'In-stay Itinerary',
    caption: "Guests always know what's next; staff don't have to chase.",
    mockup: <ItineraryMockup />,
  },
  {
    id: 'insights',
    icon: TrendingUp,
    title: 'Loyalty & Insights',
    caption: 'Identify high-value guests and use real data to design future offers.',
    mockup: <InsightsMockup />,
  },
];

export function ProductTourSection() {
  const [activeStep, setActiveStep] = useState(0);
  
  const nextStep = () => setActiveStep(prev => (prev + 1) % tourSteps.length);
  const prevStep = () => setActiveStep(prev => (prev - 1 + tourSteps.length) % tourSteps.length);
  
  return (
    <section id="product-tour" className="py-24 bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-card/50 to-transparent" />
      
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
        
        {/* Step Navigation */}
        <div className="flex justify-center gap-2 mb-8 overflow-x-auto pb-2">
          {tourSteps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(index)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                index === activeStep 
                  ? 'bg-primary text-primary-foreground shadow-lg' 
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              <step.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{step.title}</span>
            </button>
          ))}
        </div>
        
        {/* Tour Content */}
        <div className="relative max-w-5xl mx-auto">
          <div className="bg-card rounded-3xl border border-border/50 shadow-elevated overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="grid md:grid-cols-5 gap-0"
              >
                {/* Mockup - 3 cols */}
                <div className="md:col-span-3 bg-muted/20 p-6 md:p-8 min-h-[400px] flex items-center justify-center">
                  {tourSteps[activeStep].mockup}
                </div>
                
                {/* Caption - 2 cols */}
                <div className="md:col-span-2 p-6 md:p-8 flex flex-col justify-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-6">
                    {(() => {
                      const Icon = tourSteps[activeStep].icon;
                      return <Icon className="h-7 w-7" />;
                    })()}
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-3">
                    {tourSteps[activeStep].title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    {tourSteps[activeStep].caption}
                  </p>
                  
                  {/* Nav buttons */}
                  <div className="flex items-center gap-3">
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
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function PrearrivalMockup() {
  return (
    <div className="w-full max-w-[280px] mx-auto">
      <div className="bg-card rounded-2xl shadow-lg border border-border/50 overflow-hidden">
        <div className="bg-gradient-to-r from-primary to-teal-400 p-4 text-primary-foreground">
          <p className="text-xs opacity-80">Welcome to</p>
          <p className="text-lg font-bold">Azure Shores Resort</p>
        </div>
        <div className="p-4 space-y-3">
          <div className="text-center py-3 bg-primary/10 rounded-xl">
            <p className="text-3xl font-bold text-primary">5</p>
            <p className="text-xs text-muted-foreground">days until arrival</p>
          </div>
          <div className="space-y-2">
            <CheckRow checked text="Flight details confirmed" />
            <CheckRow checked text="Dietary preferences set" />
            <CheckRow text="Pre-book a sunset dinner" />
            <CheckRow text="Reserve spa treatment" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivitiesMockup() {
  return (
    <div className="w-full max-w-md mx-auto space-y-3">
      {/* Staff view */}
      <div className="bg-card rounded-xl shadow-md border border-border/50 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Staff Console</p>
        <div className="space-y-2">
          <SessionRow time="09:00" name="Sunrise Yoga" pax="8/12" status="open" />
          <SessionRow time="10:30" name="Snorkeling Safari" pax="8/8" status="full" />
          <SessionRow time="14:00" name="Cooking Class" pax="4/6" status="open" />
        </div>
      </div>
      {/* Guest overlay */}
      <div className="bg-card rounded-xl shadow-lg border-2 border-primary/30 p-3 transform translate-x-4">
        <p className="text-xs font-medium text-primary mb-2">Guest just booked!</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Sunrise Yoga</p>
            <p className="text-xs text-muted-foreground">Tomorrow, 09:00</p>
          </div>
          <div className="bg-success/10 text-success text-xs font-medium px-2 py-1 rounded-full">
            Confirmed
          </div>
        </div>
      </div>
    </div>
  );
}

function DiningMockup() {
  return (
    <div className="w-full max-w-md mx-auto grid grid-cols-2 gap-3">
      {/* Restaurant view */}
      <div className="bg-card rounded-xl shadow-md border border-border/50 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">The Ocean Grill</p>
        <div className="space-y-1.5">
          <SlotRow time="18:30" covers="12/24" />
          <SlotRow time="19:00" covers="20/24" highlight />
          <SlotRow time="19:30" covers="8/24" />
        </div>
      </div>
      {/* Guest booking */}
      <div className="bg-card rounded-xl shadow-md border border-border/50 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">Guest Booking</p>
        <div className="bg-muted/30 rounded-lg p-2 mb-2">
          <p className="text-sm font-semibold text-foreground">Tonight</p>
          <p className="text-xs text-muted-foreground">2 guests</p>
        </div>
        <div className="space-y-1">
          <TimeOption time="18:30" available />
          <TimeOption time="19:00" selected />
          <TimeOption time="19:30" available />
        </div>
      </div>
    </div>
  );
}

function ItineraryMockup() {
  return (
    <div className="w-full max-w-[280px] mx-auto">
      <div className="bg-card rounded-2xl shadow-lg border border-border/50 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-lg font-bold text-foreground">My Day</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sunset to-coral-400" />
        </div>
        <div className="space-y-3">
          <ItineraryItem time="09:00" title="Sunrise Yoga" location="Beach Deck" type="activity" />
          <ItineraryItem time="12:30" title="Lunch" location="Pool Bar" type="dining" />
          <ItineraryItem time="15:00" title="Spa Treatment" location="Wellness Center" type="spa" />
          <ItineraryItem time="19:30" title="Dinner" location="Ocean Grill" type="dining" />
        </div>
      </div>
    </div>
  );
}

function InsightsMockup() {
  return (
    <div className="w-full max-w-md mx-auto grid grid-cols-2 gap-3">
      {/* Loyalty card */}
      <div className="bg-gradient-to-br from-sunset to-coral-400 rounded-xl p-4 text-white">
        <p className="text-xs opacity-80">Gold Member</p>
        <p className="text-2xl font-bold mt-1">2,450</p>
        <p className="text-xs opacity-80">points</p>
        <div className="mt-3 bg-white/20 rounded-full h-2">
          <div className="bg-white rounded-full h-2 w-3/4" />
        </div>
        <p className="text-[10px] mt-1 opacity-70">550 to Platinum</p>
      </div>
      {/* Analytics */}
      <div className="bg-card rounded-xl shadow-md border border-border/50 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-2">This Week</p>
        <div className="space-y-2">
          <MetricRow label="Bookings" value="+24%" positive />
          <MetricRow label="Revenue" value="$18.2k" />
          <MetricRow label="Repeat guests" value="42%" />
        </div>
      </div>
    </div>
  );
}

// Helper components
function CheckRow({ text, checked }: { text: string; checked?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${checked ? 'bg-success text-success-foreground' : 'border-2 border-muted-foreground/30'}`}>
        {checked && '✓'}
      </div>
      <span className={`text-sm ${checked ? 'text-muted-foreground' : 'text-foreground'}`}>{text}</span>
    </div>
  );
}

function SessionRow({ time, name, pax, status }: { time: string; name: string; pax: string; status: 'open' | 'full' }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-mono w-10">{time}</span>
        <span className="text-sm text-foreground">{name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{pax}</span>
        <div className={`w-2 h-2 rounded-full ${status === 'full' ? 'bg-destructive' : 'bg-success'}`} />
      </div>
    </div>
  );
}

function SlotRow({ time, covers, highlight }: { time: string; covers: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 px-2 rounded ${highlight ? 'bg-warning/10' : ''}`}>
      <span className="text-xs text-foreground">{time}</span>
      <span className={`text-xs ${highlight ? 'text-warning font-medium' : 'text-muted-foreground'}`}>{covers}</span>
    </div>
  );
}

function TimeOption({ time, available, selected }: { time: string; available?: boolean; selected?: boolean }) {
  return (
    <div className={`py-1.5 px-2 rounded text-center text-xs ${selected ? 'bg-primary text-primary-foreground' : available ? 'bg-muted/50 text-foreground' : 'bg-muted/20 text-muted-foreground'}`}>
      {time}
    </div>
  );
}

function ItineraryItem({ time, title, location, type }: { time: string; title: string; location: string; type: string }) {
  const colors: Record<string, string> = {
    activity: 'bg-primary',
    dining: 'bg-sunset',
    spa: 'bg-orchid',
  };
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${colors[type]}`} />
        <div className="w-0.5 flex-1 bg-border" />
      </div>
      <div className="pb-3">
        <p className="text-xs text-muted-foreground">{time}</p>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{location}</p>
      </div>
    </div>
  );
}

function MetricRow({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${positive ? 'text-success' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}
