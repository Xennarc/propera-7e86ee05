import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Calendar, BarChart3, Users, Award, FileSpreadsheet, MessageSquare, 
  Clock, Smartphone, ArrowRight, Globe, Building2, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const storyboardPanels = [
  {
    id: 'scattered',
    title: 'From scattered tools to one live view',
    before: {
      items: [
        { icon: FileSpreadsheet, label: 'Activities in spreadsheets' },
        { icon: Calendar, label: 'Dining on a calendar' },
        { icon: MessageSquare, label: 'Guest requests via WhatsApp' },
        { icon: Clock, label: 'Manual capacity checks' },
      ],
      color: 'destructive',
    },
    after: {
      mockup: 'dashboard',
      metrics: [
        { value: '24', label: 'Sessions' },
        { value: '89%', label: 'Occupancy' },
        { value: '$12k', label: 'Revenue' },
      ],
    },
  },
  {
    id: 'availability',
    title: 'From guesswork to real-time availability',
    before: {
      items: [
        { icon: Clock, label: 'Guessing available slots' },
        { icon: MessageSquare, label: 'Calling to confirm' },
        { icon: FileSpreadsheet, label: 'Paper sign-up sheets' },
        { icon: Users, label: 'Double bookings' },
      ],
      color: 'destructive',
    },
    after: {
      mockup: 'sessions',
      sessions: [
        { time: '09:00', name: 'Yoga', pax: '8/12', status: 'open' },
        { time: '10:30', name: 'Snorkel', pax: '8/8', status: 'full' },
        { time: '14:00', name: 'Cooking', pax: '4/6', status: 'open' },
      ],
    },
  },
  {
    id: 'portfolio',
    title: 'From one property to a global portfolio',
    before: {
      items: [
        { icon: Building2, label: 'System per resort' },
        { icon: FileSpreadsheet, label: 'Manual consolidation' },
        { icon: Clock, label: 'Weekly report delays' },
        { icon: MessageSquare, label: 'Inconsistent data' },
      ],
      color: 'destructive',
    },
    after: {
      mockup: 'portfolio',
      resorts: [
        { name: 'Azure Shores', occ: '92%' },
        { name: 'Mountain Lodge', occ: '78%' },
        { name: 'City Rooftop', occ: '85%' },
      ],
    },
  },
];

export function WhyProperaSection() {
  const [activePanel, setActivePanel] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  
  useEffect(() => {
    setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const scrollToPanel = (index: number) => {
    setActivePanel(index);
    if (scrollRef.current) {
      const panelWidth = scrollRef.current.scrollWidth / storyboardPanels.length;
      scrollRef.current.scrollTo({ left: panelWidth * index, behavior: 'smooth' });
    }
  };

  return (
    <section id="why-propera" className="py-24 bg-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      
      <div className="container relative mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why resorts choose Propera
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transform scattered tools and manual processes into one connected system
          </p>
        </motion.div>
        
        {/* Storyboard Navigation */}
        <div className="flex justify-center items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full hidden md:flex"
            onClick={() => scrollToPanel(Math.max(0, activePanel - 1))}
            disabled={activePanel === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex gap-2">
            {storyboardPanels.map((_, i) => (
              <button
                key={i}
                onClick={() => scrollToPanel(i)}
                className={`h-2 rounded-full transition-all ${
                  i === activePanel ? 'w-8 bg-primary' : 'w-2 bg-muted hover:bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          
          <Button 
            variant="outline" 
            size="icon" 
            className="rounded-full hidden md:flex"
            onClick={() => scrollToPanel(Math.min(storyboardPanels.length - 1, activePanel + 1))}
            disabled={activePanel === storyboardPanels.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Horizontal Storyboard */}
        <div 
          ref={scrollRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 scrollbar-hide -mx-4 px-4"
          onScroll={(e) => {
            const el = e.currentTarget;
            const panelWidth = el.scrollWidth / storyboardPanels.length;
            const newActive = Math.round(el.scrollLeft / panelWidth);
            if (newActive !== activePanel) setActivePanel(newActive);
          }}
        >
          {storyboardPanels.map((panel, index) => (
            <motion.div
              key={panel.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="flex-shrink-0 w-[calc(100vw-3rem)] md:w-[calc(100vw-6rem)] lg:w-[900px] snap-center"
            >
              <div className="bg-background rounded-3xl border border-border/50 shadow-lg overflow-hidden">
                <div className="p-6 border-b border-border/50 text-center">
                  <h3 className="text-xl md:text-2xl font-bold text-foreground">{panel.title}</h3>
                </div>
                
                <div className="grid md:grid-cols-2">
                  {/* Before Panel */}
                  <div className="p-6 md:p-8 border-r border-border/50 bg-muted/20 relative">
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <div className="w-3 h-3 bg-destructive/60 rounded-full" />
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Before</span>
                    </div>
                    
                    <div className="mt-8 space-y-4">
                      {panel.before.items.map((item, i) => (
                        <motion.div
                          key={i}
                          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.2 + i * 0.1 }}
                          className="flex items-center gap-3 text-muted-foreground"
                        >
                          <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground/60">
                            <item.icon className="h-5 w-5" />
                          </div>
                          <span className="text-sm">{item.label}</span>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Chaos visual */}
                    <div className="absolute bottom-4 right-4 opacity-10">
                      <div className="w-16 h-16 border-2 border-dashed border-destructive rounded-lg rotate-12" />
                    </div>
                  </div>
                  
                  {/* After Panel */}
                  <div className="p-6 md:p-8 relative">
                    <div className="absolute top-4 left-4 flex items-center gap-2">
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                      <span className="text-xs font-semibold text-primary uppercase tracking-wide">After</span>
                    </div>
                    
                    {/* Arrow connector */}
                    <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex w-12 h-12 bg-card rounded-full border border-border items-center justify-center shadow-lg z-10">
                      <ArrowRight className="h-5 w-5 text-primary" />
                    </div>
                    
                    <div className="mt-8">
                      {panel.after.mockup === 'dashboard' && (
                        <DashboardMockup metrics={panel.after.metrics!} reducedMotion={reducedMotion} />
                      )}
                      {panel.after.mockup === 'sessions' && (
                        <SessionsMockup sessions={panel.after.sessions!} reducedMotion={reducedMotion} />
                      )}
                      {panel.after.mockup === 'portfolio' && (
                        <PortfolioMockup resorts={panel.after.resorts!} reducedMotion={reducedMotion} />
                      )}
                    </div>
                    
                    {/* Glow effect */}
                    <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        
        {/* Benefits Grid */}
        <div className="mt-20 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <BenefitCard
            icon={<Users className="h-6 w-6" />}
            title="One guest journey"
            description="From pre-arrival to check-out"
            outcome="Fewer calls, more bookings"
            mockup={
              <div className="flex items-center gap-1 mt-2">
                <div className="h-1 bg-primary rounded-full flex-1" />
                <div className="h-1 bg-primary/60 rounded-full flex-1" />
                <div className="h-1 bg-primary/30 rounded-full flex-1" />
                <div className="h-1 bg-muted rounded-full flex-1" />
              </div>
            }
          />
          <BenefitCard
            icon={<Calendar className="h-6 w-6" />}
            title="Real-time coordination"
            description="Every department, in sync"
            outcome="No more double bookings"
            mockup={
              <div className="grid grid-cols-3 gap-1 mt-2">
                {[1,2,3,4,5,6].map(i => (
                  <div key={i} className={`h-3 rounded ${i <= 4 ? 'bg-primary/40' : 'bg-muted'}`} />
                ))}
              </div>
            }
          />
          <BenefitCard
            icon={<BarChart3 className="h-6 w-6" />}
            title="Multi-resort control"
            description="One view, all properties"
            outcome="Portfolio-wide insights"
            mockup={
              <div className="flex items-end gap-1 h-6 mt-2">
                <div className="flex-1 bg-primary/30 rounded-t h-3" />
                <div className="flex-1 bg-primary/50 rounded-t h-4" />
                <div className="flex-1 bg-primary rounded-t h-6" />
                <div className="flex-1 bg-primary/70 rounded-t h-5" />
              </div>
            }
          />
          <BenefitCard
            icon={<Award className="h-6 w-6" />}
            title="Loyalty & personalization"
            description="Know your guests"
            outcome="Higher repeat bookings"
            mockup={
              <div className="flex items-center gap-2 mt-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sunset to-coral-400 flex items-center justify-center text-[10px] text-white font-bold">VIP</div>
                <div className="text-[10px] text-muted-foreground">2,450 pts</div>
              </div>
            }
          />
        </div>
      </div>
    </section>
  );
}

function DashboardMockup({ metrics, reducedMotion }: { metrics: { value: string; label: string }[]; reducedMotion: boolean }) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-4 shadow-md">
      <div className="grid grid-cols-3 gap-3 mb-3">
        {metrics.map((m, i) => (
          <motion.div
            key={i}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="text-center"
          >
            <p className="text-xl font-bold text-foreground">{m.value}</p>
            <p className="text-[10px] text-muted-foreground">{m.label}</p>
          </motion.div>
        ))}
      </div>
      <div className="h-8 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-lg flex items-center px-3">
        <motion.div 
          initial={reducedMotion ? { width: '75%' } : { width: 0 }}
          whileInView={{ width: '75%' }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className="h-2 bg-primary rounded-full" 
        />
      </div>
      <div className="flex items-center gap-2 mt-3 text-sm text-foreground">
        <Smartphone className="h-4 w-4 text-primary" />
        <span>Guest app + Staff console = live sync</span>
      </div>
    </div>
  );
}

function SessionsMockup({ sessions, reducedMotion }: { sessions: { time: string; name: string; pax: string; status: string }[]; reducedMotion: boolean }) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-4 shadow-md">
      <p className="text-xs font-medium text-muted-foreground mb-3">Today's Sessions</p>
      <div className="space-y-2">
        {sessions.map((s, i) => (
          <motion.div
            key={i}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, x: 10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono w-10">{s.time}</span>
              <span className="text-sm text-foreground font-medium">{s.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{s.pax}</span>
              <div className={`w-2 h-2 rounded-full ${s.status === 'full' ? 'bg-destructive' : 'bg-success'}`} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PortfolioMockup({ resorts, reducedMotion }: { resorts: { name: string; occ: string }[]; reducedMotion: boolean }) {
  return (
    <div className="bg-card rounded-xl border border-border/50 p-4 shadow-md">
      <div className="flex items-center gap-2 mb-3">
        <Globe className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-muted-foreground">Portfolio Overview</span>
      </div>
      <div className="space-y-2">
        {resorts.map((r, i) => (
          <motion.div
            key={i}
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="flex items-center justify-between py-1.5 px-2 rounded bg-muted/30"
          >
            <span className="text-sm text-foreground font-medium">{r.name}</span>
            <span className="text-sm text-primary font-bold">{r.occ}</span>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Total avg</span>
        <span className="text-sm text-success font-bold">85%</span>
      </div>
    </div>
  );
}

function BenefitCard({ 
  icon, 
  title, 
  description, 
  outcome,
  mockup 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  outcome: string;
  mockup: React.ReactNode;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -4, boxShadow: '0 20px 40px -20px hsl(var(--primary) / 0.2)' }}
      className="bg-background rounded-2xl border border-border/50 p-6 hover:border-primary/30 transition-all duration-300 group"
    >
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      {mockup}
      <p className="text-xs font-medium text-primary mt-4">{outcome}</p>
    </motion.div>
  );
}
