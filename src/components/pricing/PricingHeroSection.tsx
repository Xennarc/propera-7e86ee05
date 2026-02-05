import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Calendar, Users, BarChart3, Smartphone, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';
import { FloatingUIChip } from '@/components/illustrations/FloatingUIChip';
import { ActivityCalendarShowcase } from '@/components/illustrations/ActivityCalendarShowcase';

const VALUE_CHIPS = [
  'Unlimited staff',
  'Multi-resort ready',
  'Real-time sync',
  'Feature flag control',
];

// Preview content
const previewTabs = [
  { id: 'dashboard', icon: BarChart3, label: 'Dashboard' },
  { id: 'bookings', icon: Calendar, label: 'Bookings' },
  { id: 'guests', icon: Users, label: 'Guests' },
];

const dashboardStats = [
  { label: 'Activities', value: '24', change: '+3' },
  { label: 'Dining', value: '18', change: '+5' },
  { label: 'Capacity', value: '92%', change: '↑' },
];

const bookingItems = [
  { name: 'Sunset Cruise', time: '4:00 PM', guests: 4 },
  { name: 'Spa Treatment', time: '2:30 PM', guests: 2 },
  { name: 'Snorkel Trip', time: '9:00 AM', guests: 6 },
];

export function PricingHeroSection() {
  const { shouldAnimate } = useAnimationPreference();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notificationVisible, setNotificationVisible] = useState(false);

  // Auto-cycle tabs (slower interval for performance)
  useEffect(() => {
    if (!shouldAnimate) return;
    
    const tabInterval = setInterval(() => {
      setActiveTab(prev => {
        const currentIndex = previewTabs.findIndex(t => t.id === prev);
        return previewTabs[(currentIndex + 1) % previewTabs.length].id;
      });
    }, 6000);

    const notifTimeout = setTimeout(() => setNotificationVisible(true), 2500);

    return () => {
      clearInterval(tabInterval);
      clearTimeout(notifTimeout);
    };
  }, [shouldAnimate]);

  const scrollToPlans = () => {
    document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-[70vh] md:min-h-[80vh] flex items-center overflow-hidden pt-20 md:pt-28 pb-12 md:pb-16 bg-background">
      {/* Midnight gradient base */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-midnight-900/50 dark:to-midnight-950" />
      
      {/* Lime glow spotlight - hidden on mobile */}
      <div className="absolute top-20 right-1/4 w-[400px] md:w-[600px] h-[400px] md:h-[600px] bg-lime-400/8 dark:bg-lime-400/10 rounded-full blur-[100px] md:blur-[150px] pointer-events-none hidden sm:block" />
      {/* Blurple glow - hidden on mobile */}
      <div className="absolute bottom-0 left-1/4 w-[300px] md:w-[500px] h-[300px] md:h-[500px] bg-blurple-500/6 dark:bg-blurple-500/8 rounded-full blur-[80px] md:blur-[130px] pointer-events-none hidden sm:block" />
      {/* Teal accent - hidden on mobile */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-teal-400/5 dark:bg-teal-400/8 rounded-full blur-[60px] md:blur-[100px] pointer-events-none hidden sm:block" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left - Copy */}
          <div className="text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 md:mb-6 leading-[1.1] tracking-tight">
              Pricing, made simple.
            </h1>
            
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 mb-6 md:mb-8">
              Three tiers — Essential, Professional, Elite — each built on real resort operations, not feature bloat.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-3 sm:gap-4 mb-4 sm:justify-center lg:justify-start">
              <Button asChild size="lg" className="bg-primary text-primary-foreground rounded-full font-semibold h-12 px-6 sm:px-8 glow-lime group hover:-translate-y-0.5 transition-all w-full sm:w-auto">
                <Link to="/book-demo">
                  Book a demo
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="rounded-full font-semibold h-12 px-6 sm:px-8 border-border/50 hover:border-primary/30 w-full sm:w-auto"
                onClick={scrollToPlans}
              >
                <Zap className="mr-2 h-4 w-4 text-primary" />
                Compare plans
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Per resort, unlimited staff. See it with your branding.
            </p>

            {/* Value chips - static */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-6 md:mt-8">
              {VALUE_CHIPS.map((chip) => (
                <span key={chip} className="glass-pill text-xs">
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Right - Interactive Product Preview */}
          {/* Mobile: Activity Calendar Showcase with proper spacing */}
          <div className="lg:hidden flex justify-center mt-6">
            <ActivityCalendarShowcase className="max-w-[240px]" />
          </div>

          {/* Desktop: Full interactive preview */}
          <div className="relative hidden lg:block">
            {/* Floating status chips */}
            <FloatingUIChip
              icon={Smartphone}
              text="Guest just booked"
              subtext="Sunset Cruise"
              variant="primary"
              delay={0.8}
              className="absolute -top-8 right-12 z-10 pointer-events-none"
            />

            {notificationVisible && (
              <FloatingUIChip
                icon={Users}
                text="3 guests arriving"
                variant="success"
                delay={0}
                className="absolute bottom-8 -left-8 z-10 pointer-events-none"
              />
            )}

            <div className="relative">
              {/* Glow behind */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-teal-400/8 rounded-3xl blur-2xl scale-105" />
              
              {/* Preview card */}
              <div className="preview-frame-premium">
                {/* Tab bar */}
                <div className="flex items-center gap-1 px-4 py-3 border-b border-border/30 bg-muted/30">
                  {previewTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                        ${activeTab === tab.id 
                          ? 'bg-primary/10 text-primary' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }
                      `}
                    >
                      <tab.icon className="h-3.5 w-3.5" />
                      {tab.label}
                    </button>
                  ))}
                  <div className="flex-1" />
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                    </span>
                    <span className="text-[10px] text-success">Live</span>
                  </div>
                </div>
                
                {/* Content area with CSS transitions */}
                <div className="p-6 relative min-h-[200px]">
                  {/* Dashboard tab */}
                  <div className={`space-y-4 transition-all duration-300 ${
                    activeTab === 'dashboard' 
                      ? 'opacity-100 transform translate-x-0' 
                      : 'opacity-0 transform translate-x-8 absolute inset-6 pointer-events-none'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-teal-400/10 flex items-center justify-center">
                          <span className="text-lg">🏝️</span>
                        </div>
                        <div>
                          <div className="font-semibold text-foreground text-sm">Paradise Resort</div>
                          <div className="text-xs text-muted-foreground">Today's overview</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3">
                      {dashboardStats.map((stat, i) => (
                        <div
                          key={stat.label}
                          className={`lagoon-glass-subtle rounded-xl p-3 text-center stagger-${i + 1}`}
                        >
                          <div className="text-lg font-bold text-foreground">{stat.value}</div>
                          <div className="text-xs text-muted-foreground">{stat.label}</div>
                          <span className="text-[10px] text-success">{stat.change}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bookings tab */}
                  <div className={`space-y-3 transition-all duration-300 ${
                    activeTab === 'bookings' 
                      ? 'opacity-100 transform translate-x-0' 
                      : 'opacity-0 transform translate-x-8 absolute inset-6 pointer-events-none'
                  }`}>
                    <div className="text-sm font-medium text-foreground mb-3">Today's Bookings</div>
                    {bookingItems.map((booking, i) => (
                      <div
                        key={booking.name}
                        className={`flex items-center justify-between p-3 bg-background/60 rounded-lg border border-border/20 stagger-${i + 1}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{booking.name}</p>
                            <p className="text-xs text-muted-foreground">{booking.time}</p>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">{booking.guests} guests</span>
                      </div>
                    ))}
                  </div>

                  {/* Guests tab */}
                  <div className={`space-y-4 transition-all duration-300 ${
                    activeTab === 'guests' 
                      ? 'opacity-100 transform translate-x-0' 
                      : 'opacity-0 transform translate-x-8 absolute inset-6 pointer-events-none'
                  }`}>
                    <div className="text-sm font-medium text-foreground mb-3">Guest Activity</div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: 'Checked in', value: '42' },
                        { label: 'Arriving', value: '12' },
                        { label: 'Active bookings', value: '28' },
                        { label: 'VIP guests', value: '5' },
                      ].map((stat, i) => (
                        <div
                          key={stat.label}
                          className={`bg-background/60 rounded-lg p-3 border border-border/20 stagger-${i + 1}`}
                        >
                          <p className="text-lg font-bold text-foreground">{stat.value}</p>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
