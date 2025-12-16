import { motion } from 'framer-motion';
import { Calendar, BarChart3, Users, Award, MessageSquare, Clock, FileSpreadsheet, Smartphone } from 'lucide-react';

export function WhyProperaSection() {
  return (
    <section className="py-24 bg-card relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/3 to-transparent" />
      
      <div className="container relative mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Why resorts choose Propera
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Transform scattered tools and manual processes into one connected system
          </p>
        </motion.div>
        
        {/* Before / After Comparison */}
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20">
          {/* Before */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent rounded-2xl" />
            <div className="relative bg-muted/30 rounded-2xl border border-border/50 p-6 h-full">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 bg-destructive/60 rounded-full" />
                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Before Propera</span>
              </div>
              
              <div className="space-y-4">
                <ChaosItem icon={<FileSpreadsheet className="h-5 w-5" />} text="Spreadsheets for activities" />
                <ChaosItem icon={<Calendar className="h-5 w-5" />} text="Separate calendar for dining" />
                <ChaosItem icon={<MessageSquare className="h-5 w-5" />} text="WhatsApp for guest requests" />
                <ChaosItem icon={<Clock className="h-5 w-5" />} text="Manual overbooking checks" />
              </div>
              
              <div className="mt-6 pt-6 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  <span className="text-destructive font-medium">Result:</span> Manual coordination, siloed systems, lost revenue opportunities
                </p>
              </div>
            </div>
          </motion.div>
          
          {/* After */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl" />
            <div className="relative bg-card rounded-2xl border border-primary/30 p-6 h-full shadow-lg">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
                <span className="text-sm font-semibold text-primary uppercase tracking-wide">After Propera</span>
              </div>
              
              {/* Mini Dashboard */}
              <div className="bg-muted/30 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <MiniStat value="24" label="Sessions" />
                  <MiniStat value="89%" label="Occupancy" />
                  <MiniStat value="$12k" label="Revenue" />
                </div>
                <div className="h-8 bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 rounded-lg flex items-center px-3">
                  <div className="h-2 bg-primary rounded-full w-3/4" />
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Smartphone className="h-4 w-4 text-primary" />
                <span>Guest app + Staff console = live sync</span>
              </div>
              
              <div className="mt-6 pt-6 border-t border-border/50">
                <p className="text-sm text-muted-foreground">
                  <span className="text-primary font-medium">Result:</span> One connected platform for operations and guest experience
                </p>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Benefits Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

function ChaosItem({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 text-muted-foreground">
      <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground/60">
        {icon}
      </div>
      <span className="text-sm">{text}</span>
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
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
      className="bg-background rounded-2xl border border-border/50 p-6 hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
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
