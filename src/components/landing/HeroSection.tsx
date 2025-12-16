import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-24 pb-16 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
      <div className="absolute top-1/4 right-0 w-[800px] h-[800px] bg-primary/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-teal-400/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container relative mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Left: Copy */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-xl"
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 border border-primary/20">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              For world-class resorts
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
              The operating system for{' '}
              <span className="text-gradient bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                resort stays
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              Propera connects your staff console and guest app into one live system 
              for bookings, operations, and loyalty – across every property you run.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild size="lg" className="text-base px-8 h-14 rounded-xl shadow-lg hover:shadow-xl transition-all">
                <Link to="/auth">
                  Book a demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-base px-8 h-14 rounded-xl group" asChild>
                <a href="#product-tour">
                  <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  See Propera in action
                </a>
              </Button>
            </div>
          </motion.div>
          
          {/* Right: Product Mockups */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative lg:pl-8"
          >
            <div className="relative">
              {/* Staff Dashboard Mockup */}
              <div className="bg-card rounded-2xl shadow-elevated border border-border/50 p-4 transform rotate-1 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-coral-400" />
                    <div className="w-3 h-3 rounded-full bg-sunset-400" />
                    <div className="w-3 h-3 rounded-full bg-success" />
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">Staff Console — Today at a Glance</span>
                </div>
                
                <div className="space-y-3">
                  {/* Stats Row */}
                  <div className="grid grid-cols-4 gap-2">
                    <StatMini label="Activities" value="12" sublabel="sessions" color="primary" />
                    <StatMini label="Covers" value="156" sublabel="dining" color="sunset" />
                    <StatMini label="Pre-arrival" value="8" sublabel="guests" color="lagoon" />
                    <StatMini label="VIP" value="3" sublabel="in-house" color="orchid" />
                  </div>
                  
                  {/* Mini Schedule */}
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Today's Sessions</p>
                    <div className="space-y-1.5">
                      <ScheduleRow time="09:00" activity="Sunrise Yoga" pax="8/12" />
                      <ScheduleRow time="10:30" activity="Snorkeling Safari" pax="6/8" />
                      <ScheduleRow time="14:00" activity="Cooking Class" pax="4/6" />
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mobile Mockups */}
              <div className="absolute -bottom-8 -left-4 md:-left-12">
                <div className="w-[140px] md:w-[160px] bg-card rounded-2xl shadow-elevated border border-border/50 p-2 transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                  <div className="bg-primary/10 rounded-xl p-3 mb-2">
                    <p className="text-[10px] font-medium text-primary">Pre-arrival</p>
                    <p className="text-xs font-bold text-foreground mt-1">5 days to go</p>
                  </div>
                  <div className="space-y-1.5 px-1">
                    <ChecklistItem checked text="Flight details" />
                    <ChecklistItem checked text="Preferences" />
                    <ChecklistItem text="Pre-book dinner" />
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-4 -right-2 md:-right-8">
                <div className="w-[140px] md:w-[160px] bg-card rounded-2xl shadow-elevated border border-border/50 p-2 transform rotate-3 hover:rotate-0 transition-transform duration-500">
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
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function StatMini({ label, value, sublabel, color }: { label: string; value: string; sublabel: string; color: string }) {
  const colorClasses: Record<string, string> = {
    primary: 'text-primary',
    sunset: 'text-sunset',
    lagoon: 'text-lagoon',
    orchid: 'text-orchid',
  };
  
  return (
    <div className="bg-muted/30 rounded-lg p-2 text-center">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className={`text-[10px] font-medium ${colorClasses[color]}`}>{label}</p>
      <p className="text-[9px] text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function ScheduleRow({ time, activity, pax }: { time: string; activity: string; pax: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-mono">{time}</span>
        <span className="text-foreground font-medium">{activity}</span>
      </div>
      <span className="text-primary font-medium">{pax}</span>
    </div>
  );
}

function ChecklistItem({ text, checked }: { text: string; checked?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${checked ? 'bg-success border-success' : 'border-muted-foreground/30'}`}>
        {checked && <span className="text-success-foreground text-[8px]">✓</span>}
      </div>
      <span className={`text-[10px] ${checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{text}</span>
    </div>
  );
}

function TimeSlot({ time, spots, active }: { time: string; spots: string; active?: boolean }) {
  return (
    <div className={`flex items-center justify-between px-2 py-1 rounded ${active ? 'bg-primary text-primary-foreground' : ''}`}>
      <span className={`text-[10px] font-medium ${active ? '' : 'text-foreground'}`}>{time}</span>
      <span className={`text-[9px] ${active ? '' : 'text-muted-foreground'}`}>{spots}</span>
    </div>
  );
}
