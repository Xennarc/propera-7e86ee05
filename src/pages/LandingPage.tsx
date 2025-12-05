import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  IconCalendar, 
  IconClock,
  IconStay,
  IconArrow,
  WaveDivider,
  IconSnorkeling,
} from '@/components/icons/ProperaIcons';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { QrCode, LogIn, Sparkles, ChevronRight, UtensilsCrossed } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ProperaMark size={40} className="text-primary" />
            <span className="text-xl font-bold text-foreground tracking-tight">Propera</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button asChild size="sm" className="rounded-full px-5 font-semibold shadow-md">
              <Link to="/guest/login">
                <LogIn className="h-4 w-4 mr-2" />
                Guest Login
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-28 pb-8 md:pt-36 md:pb-16 overflow-hidden hero-pattern">
        {/* Decorative blobs */}
        <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/15 rounded-full blur-[120px] pointer-events-none" />
        
        <div className="container relative mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-5 py-2.5 rounded-full text-sm font-semibold mb-8 animate-fade-in shadow-sm border border-primary/20">
              <Sparkles className="h-4 w-4" />
              Your Digital Resort Concierge
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-display font-extrabold text-foreground mb-6 text-balance animate-slide-up">
              Plan Your Perfect Stay with{' '}
              <span className="text-gradient">Propera</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-balance animate-slide-up leading-relaxed">
              View your schedule, book activities, and reserve restaurants from your phone 
              while you stay with us. Everything you need, at your fingertips.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
              <Button asChild size="lg" className="text-base px-8 py-6 rounded-full shadow-elevated hover-glow font-semibold">
                <Link to="/guest/login">
                  <LogIn className="h-5 w-5 mr-2" />
                  Access Guest Portal
                </Link>
              </Button>
            </div>
            
            <p className="mt-8 text-sm text-muted-foreground animate-fade-in">
              Use your room number and last name to log in
            </p>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <WaveDivider variant="subtle" />
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28 bg-card relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-headline font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Make the most of your resort experience with easy access to activities, 
              dining, and your daily schedule.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            <FeatureCard
              icon={<IconSnorkeling className="h-7 w-7" />}
              title="Book Resort Activities"
              description="Snorkelling, diving, spa treatments, and exciting excursions - all bookable in seconds."
            />
            <FeatureCard
              icon={<UtensilsCrossed className="h-7 w-7" />}
              title="Reserve Restaurants"
              description="Secure your dinner reservations and special dining experiences with ease."
            />
            <FeatureCard
              icon={<IconCalendar className="h-7 w-7" />}
              title="View Your Schedule"
              description="See all your upcoming bookings in one place, organized by date and time."
            />
            <FeatureCard
              icon={<IconClock className="h-7 w-7" />}
              title="Real-time Availability"
              description="Check availability instantly - no need to call the front desk."
            />
          </div>
        </div>
      </section>

      {/* Wave transition */}
      <WaveDivider flip className="text-card" />

      {/* How It Works Section */}
      <section className="py-20 md:py-28 bg-background section-gradient-warm relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-headline font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Getting started is simple. Follow these three easy steps.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-5xl mx-auto">
            <StepCard
              number={1}
              icon={<QrCode className="h-7 w-7" />}
              title="Find the Portal"
              description="Scan the QR code in your villa or visit this page on your device."
            />
            <StepCard
              number={2}
              icon={<LogIn className="h-7 w-7" />}
              title="Log In"
              description="Enter your room number, last name, and the PIN provided at check-in."
            />
            <StepCard
              number={3}
              icon={<IconArrow className="h-7 w-7" />}
              title="Browse & Book"
              description="Explore activities and restaurants, then book with a single tap."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-card relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-accent/10 rounded-full blur-[40px] pointer-events-none" />
        
        <div className="container mx-auto px-4 relative">
          <Card className="max-w-2xl mx-auto border-primary/20 shadow-elevated card-stack overflow-hidden">
            <CardContent className="p-8 md:p-12 text-center relative">
              <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8 shadow-sm">
                <IconStay className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Already Staying With Us?
              </h2>
              <p className="text-muted-foreground mb-8 text-lg">
                Access your personalized guest portal to view your bookings, 
                explore activities, and make reservations.
              </p>
              <Button asChild size="lg" className="text-base px-8 rounded-full font-semibold shadow-md">
                <Link to="/guest/login">
                  Go to Guest Login
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-background border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ProperaMark size={36} className="text-primary" />
              <span className="font-bold text-foreground">Propera</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span>© {new Date().getFullYear()} Propera. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <Card className="card-luxury hover-lift group">
      <CardContent className="p-7">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
          {icon}
        </div>
        <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

function StepCard({ 
  number, 
  icon, 
  title, 
  description 
}: { 
  number: number;
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="text-center group">
      <div className="relative inline-flex mb-6">
        <div className="h-20 w-20 rounded-2xl bg-card border-2 border-border shadow-soft flex items-center justify-center text-primary group-hover:border-primary/50 transition-all duration-300">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-md">
          {number}
        </div>
      </div>
      <h3 className="text-lg font-bold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
