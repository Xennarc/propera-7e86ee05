import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Calendar, Users, BarChart3, Smartphone, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAnimationPreference } from '@/hooks/useReducedMotion';
import { FloatingUIChip } from '@/components/illustrations/FloatingUIChip';

const VALUE_CHIPS = [
  'Unlimited staff',
  'Multi-resort ready',
  'Real-time sync',
  'White-label capable',
];

// Animated preview content
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

  // Auto-cycle tabs and show notifications (slower interval for performance)
  useEffect(() => {
    if (!shouldAnimate) return;
    
    const tabInterval = setInterval(() => {
      setActiveTab(prev => {
        const currentIndex = previewTabs.findIndex(t => t.id === prev);
        return previewTabs[(currentIndex + 1) % previewTabs.length].id;
      });
    }, 6000); // Increased from 4s to 6s for less CPU usage

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
    <section className="relative min-h-[80vh] flex items-center overflow-hidden pt-28 pb-16 hero-premium-bg grain-overlay">
      {/* TideGlow spotlights */}
      <div className="absolute top-20 right-1/4 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-teal-400/6 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-lagoon-500/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center max-w-6xl mx-auto">
          {/* Left - Copy - instant load, no delay */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
              Pricing, made simple.
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mx-auto lg:mx-0 mb-8">
              Propera brings guests, teams, and schedules into one elegant system — so every day runs smoothly.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4 mb-4">
              <Button asChild size="lg" className="btn-cta-premium rounded-xl font-semibold h-12 px-8 text-primary-foreground group">
                <Link to="/book-demo">
                  Book a demo
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="btn-ghost-premium rounded-xl font-semibold h-12 px-8"
                onClick={scrollToPlans}
              >
                <Zap className="mr-2 h-4 w-4 text-primary" />
                Compare plans
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              See how it looks with your resort's branding.
            </p>

            {/* Value chips - static for instant load */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-8">
              {VALUE_CHIPS.map((chip) => (
                <span key={chip} className="glass-pill text-xs">
                  {chip}
                </span>
              ))}
            </div>
          </div>

          {/* Right - Interactive Product Preview */}
          <div className="relative hidden lg:block">
            {/* Floating status chips - repositioned to not overlap, pointer-events-none */}
            <FloatingUIChip
              icon={Smartphone}
              text="Guest just booked"
              subtext="Sunset Cruise"
              variant="primary"
              delay={0.8}
              className="absolute -top-8 right-12 z-10 pointer-events-none"
            />

            <AnimatePresence>
              {notificationVisible && (
                <FloatingUIChip
                  icon={Users}
                  text="3 guests arriving"
                  variant="success"
                  delay={0}
                  className="absolute bottom-8 -left-8 z-10 pointer-events-none"
                />
              )}
            </AnimatePresence>

            <div className="relative">
              {/* Glow behind */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/15 to-teal-400/8 rounded-3xl blur-2xl scale-105" />
              
              {/* Preview card */}
              <div className={`preview-frame-premium ${shouldAnimate ? 'animate-gentle-float' : ''}`}>
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
                
                {/* Content area */}
                <div className="p-6">
                  <AnimatePresence mode="wait">
                    {activeTab === 'dashboard' && (
                      <motion.div
                        key="dashboard"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
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
                            <motion.div
                              key={stat.label}
                              initial={shouldAnimate ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.1 }}
                              className="lagoon-glass-subtle rounded-xl p-3 text-center"
                            >
                              <div className="text-lg font-bold text-foreground">{stat.value}</div>
                              <div className="text-xs text-muted-foreground">{stat.label}</div>
                              <span className="text-[10px] text-success">{stat.change}</span>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {activeTab === 'bookings' && (
                      <motion.div
                        key="bookings"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-3"
                      >
                        <div className="text-sm font-medium text-foreground mb-3">Today's Bookings</div>
                        {bookingItems.map((booking, i) => (
                          <motion.div
                            key={booking.name}
                            initial={shouldAnimate ? { opacity: 0, x: -10 } : { opacity: 1, x: 0 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center justify-between p-3 bg-background/60 rounded-lg border border-border/20"
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
                          </motion.div>
                        ))}
                      </motion.div>
                    )}

                    {activeTab === 'guests' && (
                      <motion.div
                        key="guests"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-4"
                      >
                        <div className="text-sm font-medium text-foreground mb-3">Guest Activity</div>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'Checked in', value: '42' },
                            { label: 'Arriving', value: '12' },
                            { label: 'Active bookings', value: '28' },
                            { label: 'VIP guests', value: '5' },
                          ].map((stat, i) => (
                            <motion.div
                              key={stat.label}
                              initial={shouldAnimate ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.1 }}
                              className="bg-background/60 rounded-lg p-3 border border-border/20"
                            >
                              <p className="text-lg font-bold text-foreground">{stat.value}</p>
                              <p className="text-xs text-muted-foreground">{stat.label}</p>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ribbon divider */}
      <div className="absolute bottom-0 left-0 right-0 h-px">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      </div>
    </section>
  );
}
