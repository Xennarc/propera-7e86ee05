import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Waves, 
  UtensilsCrossed, 
  Calendar, 
  Clock, 
  QrCode, 
  LogIn, 
  CheckCircle2,
  Palmtree,
  Compass,
  Sparkles
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <Palmtree className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">Propera</span>
          </div>
          <Button asChild variant="default" size="sm">
            <Link to="/guest/login">
              <LogIn className="h-4 w-4 mr-2" />
              Guest Login
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/20" />
        <div className="absolute top-20 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary/30 rounded-full blur-3xl" />
        
        <div className="container relative mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
              <Sparkles className="h-4 w-4" />
              Your Digital Resort Concierge
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 text-balance animate-slide-up">
              Plan Your Perfect Stay with{' '}
              <span className="text-gradient">Propera</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto text-balance animate-slide-up">
              View your schedule, book activities, and reserve restaurants from your phone 
              while you stay with us. Everything you need, at your fingertips.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
              <Button asChild size="lg" className="text-base px-8 py-6 shadow-elevated hover-glow">
                <Link to="/guest/login">
                  <LogIn className="h-5 w-5 mr-2" />
                  Access Guest Portal
                </Link>
              </Button>
            </div>
            
            <p className="mt-6 text-sm text-muted-foreground animate-fade-in">
              Use your room number and last name to log in
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-card border-y border-border/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Make the most of your resort experience with easy access to activities, 
              dining, and your daily schedule.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Waves className="h-6 w-6" />}
              title="Book Resort Activities"
              description="Snorkelling, diving, spa treatments, and exciting excursions - all bookable in seconds."
            />
            <FeatureCard
              icon={<UtensilsCrossed className="h-6 w-6" />}
              title="Reserve Restaurants"
              description="Secure your dinner reservations and special dining experiences with ease."
            />
            <FeatureCard
              icon={<Calendar className="h-6 w-6" />}
              title="View Your Schedule"
              description="See all your upcoming bookings in one place, organized by date and time."
            />
            <FeatureCard
              icon={<Clock className="h-6 w-6" />}
              title="Real-time Availability"
              description="Check availability instantly - no need to call the front desk."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How It Works
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Getting started is simple. Follow these three easy steps.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <StepCard
              number={1}
              icon={<QrCode className="h-6 w-6" />}
              title="Find the Portal"
              description="Scan the QR code in your villa or visit this page on your device."
            />
            <StepCard
              number={2}
              icon={<LogIn className="h-6 w-6" />}
              title="Log In"
              description="Enter your room number, last name, and the PIN provided at check-in."
            />
            <StepCard
              number={3}
              icon={<Compass className="h-6 w-6" />}
              title="Browse & Book"
              description="Explore activities and restaurants, then book with a single tap."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/10 via-background to-secondary/20">
        <div className="container mx-auto px-4">
          <Card className="max-w-2xl mx-auto border-primary/20 shadow-elevated">
            <CardContent className="p-8 md:p-12 text-center">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Palmtree className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                Already Staying With Us?
              </h2>
              <p className="text-muted-foreground mb-8">
                Access your personalized guest portal to view your bookings, 
                explore activities, and make reservations.
              </p>
              <Button asChild size="lg" className="text-base px-8">
                <Link to="/guest/login">
                  Go to Guest Login
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-card border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Palmtree className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-foreground">Propera</span>
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
    <Card className="card-luxury hover-lift">
      <CardContent className="p-6">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 text-primary">
          {icon}
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
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
    <div className="text-center">
      <div className="relative inline-flex mb-4">
        <div className="h-16 w-16 rounded-2xl bg-card border border-border shadow-soft flex items-center justify-center text-primary">
          {icon}
        </div>
        <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center">
          {number}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
