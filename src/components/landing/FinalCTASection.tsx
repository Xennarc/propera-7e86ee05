import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowRight, MessageCircle, Smartphone, Monitor, BarChart3 } from 'lucide-react';

export function FinalCTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-teal-400/10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container relative mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
              Ready to give your resort a{' '}
              <span className="text-gradient bg-gradient-to-r from-primary to-teal-400 bg-clip-text text-transparent">
                connected brain?
              </span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Unify guest experience, staff operations, and portfolio insights in one platform — built for resorts worldwide.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Button asChild size="lg" className="text-base px-8 h-14 rounded-xl shadow-lg hover:shadow-xl transition-all">
                <Link to="/auth">
                  Book a live demo
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" className="text-base px-8 h-14 rounded-xl" asChild>
                <Link to="/pricing">
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Talk to our team
                </Link>
              </Button>
            </div>
            
            {/* Stack Diagram */}
            <div className="relative max-w-md mx-auto">
              <div className="flex flex-col gap-3">
                <StackLayer 
                  icon={<BarChart3 className="h-5 w-5" />}
                  label="Admin & Analytics"
                  description="Portfolio insights"
                  variant="top"
                />
                <StackLayer 
                  icon={<Monitor className="h-5 w-5" />}
                  label="Staff Console"
                  description="Operations & bookings"
                  variant="middle"
                />
                <StackLayer 
                  icon={<Smartphone className="h-5 w-5" />}
                  label="Guest App"
                  description="Pre-arrival to checkout"
                  variant="bottom"
                />
              </div>
              
              {/* Connection line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-teal-400 to-primary -translate-x-1/2 -z-10" />
            </div>
            
            <p className="text-sm text-muted-foreground mt-8">
              All connected by Propera
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function StackLayer({ 
  icon, 
  label, 
  description, 
  variant 
}: { 
  icon: React.ReactNode; 
  label: string; 
  description: string;
  variant: 'top' | 'middle' | 'bottom';
}) {
  const bgClasses = {
    top: 'bg-primary/10 border-primary/30',
    middle: 'bg-card border-border',
    bottom: 'bg-teal-400/10 border-teal-400/30',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className={`flex items-center gap-4 p-4 rounded-xl border ${bgClasses[variant]} shadow-sm`}
    >
      <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center text-primary">
        {icon}
      </div>
      <div className="text-left">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}
