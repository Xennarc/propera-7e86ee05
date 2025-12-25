import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { 
  Play, 
  Calendar, 
  Waves, 
  Ship, 
  Sparkles, 
  UtensilsCrossed,
  CheckCircle2,
  Clock,
  Smartphone,
  Users,
  FileText,
  ArrowRight
} from 'lucide-react';
import { DemoWizard } from '@/components/demo/DemoWizard';
import { LiveDemoQualifier } from '@/components/demo/LiveDemoQualifier';

const SUPPORTED_CATEGORIES = [
  { icon: Waves, label: 'Dive Centers', color: 'text-[hsl(var(--lagoon-500))]' },
  { icon: Ship, label: 'Watersports', color: 'text-[hsl(var(--teal-500))]' },
  { icon: Sparkles, label: 'Spa & Wellness', color: 'text-[hsl(var(--orchid-500))]' },
  { icon: UtensilsCrossed, label: 'Restaurants', color: 'text-[hsl(var(--sand-500))]' },
];

const FAQS = [
  {
    question: 'How long does setup take?',
    answer: 'With our self-serve demo, you can be up and running in 10 minutes. Full onboarding with your real data typically takes 1-2 weeks, depending on your catalog size.',
  },
  {
    question: 'What devices does Propera work on?',
    answer: 'Propera is mobile-first and works on any device with a modern browser. Staff can use tablets at the front desk, and guests can book from their phones.',
  },
  {
    question: 'Is training required for staff?',
    answer: 'The interface is intuitive enough that most staff get comfortable within a day. We provide video guides and optional live training sessions for larger teams.',
  },
  {
    question: 'Can you import our existing guest data?',
    answer: 'Yes! We support CSV imports for guest lists and booking history. Our team can also help migrate data from common PMS systems during onboarding.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Our self-serve demo gives you 14 days of full access with sample data. You can upgrade anytime to keep your setup and switch to live mode.',
  },
];

const BOOK_DEMO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Book a Demo - Propera Resort Booking Platform',
  description: 'Try Propera instantly with a 10-minute self-serve demo, or book a live walkthrough with our team.',
  url: 'https://propera.cc/book-demo',
};

export default function BookDemoPage() {
  const [showDemoWizard, setShowDemoWizard] = useState(false);
  const [showLiveQualifier, setShowLiveQualifier] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Book a Demo - See Propera in Action"
        description="Try Propera instantly with a 10-minute self-serve demo, or book a live walkthrough with our team. Perfect for dive centers, watersports, spa, and restaurants."
        canonicalUrl="/book-demo"
        keywords="resort booking demo, hotel software demo, guest portal demo, resort management trial"
        structuredData={[PROPERA_ORGANIZATION_SCHEMA, BOOK_DEMO_SCHEMA]}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <ProperaMark size={40} className="text-primary" />
            <span className="text-xl font-bold text-foreground tracking-tight">Propera</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1">
              <Button asChild variant="ghost" size="sm" className="rounded-full px-4 font-medium">
                <Link to="/">Home</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="rounded-full px-4 font-medium">
                <Link to="/about">About</Link>
              </Button>
              <Button asChild variant="ghost" size="sm" className="rounded-full px-4 font-medium">
                <Link to="/pricing">Pricing</Link>
              </Button>
            </div>
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
          </div>
        </nav>
      </header>

      <main className="pt-24">
        {/* Hero Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
                See Propera in action
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Experience how Propera transforms resort operations. Try it yourself or get a guided tour.
              </p>
            </div>

            {/* CTA Cards */}
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-16">
              {/* Primary: Self-Serve Demo */}
              <Card className="relative overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 hover:border-primary/50 transition-all duration-300 group">
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    <Clock className="h-3.5 w-3.5" />
                    10 minutes
                  </span>
                </div>
                <CardHeader className="pt-12">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Play className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Try Propera Now</CardTitle>
                  <CardDescription className="text-base">
                    Get instant access to a fully-loaded demo resort. Explore the staff console, guest portal, and see real data in action.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      No credit card required
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Pre-loaded with sample activities & guests
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      14-day full access
                    </li>
                  </ul>
                  <Button 
                    size="lg" 
                    className="w-full rounded-full font-semibold"
                    onClick={() => setShowDemoWizard(true)}
                  >
                    Start Free Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* Secondary: Live Walkthrough */}
              <Card className="border border-border/50 hover:border-border transition-all duration-300 group">
                <CardHeader className="pt-12">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Calendar className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-2xl">Book a Live Walkthrough</CardTitle>
                  <CardDescription className="text-base">
                    Get a personalized demo tailored to your resort's needs. Our team will answer your questions and show relevant features.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      1-on-1 with our team
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Customized to your operations
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      30-minute video call
                    </li>
                  </ul>
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="w-full rounded-full font-semibold"
                    onClick={() => setShowLiveQualifier(true)}
                  >
                    Schedule Call
                    <Calendar className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Trust Section */}
            <div className="text-center mb-16">
              <p className="text-sm text-muted-foreground mb-6 uppercase tracking-wider font-medium">
                Works for
              </p>
              <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                {SUPPORTED_CATEGORIES.map(({ icon: Icon, label, color }) => (
                  <div key={label} className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50">
                    <Icon className={`h-5 w-5 ${color}`} />
                    <span className="text-sm font-medium text-foreground">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 bg-muted/30 border-y border-border/50">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
                Frequently Asked Questions
              </h2>
              <Accordion type="single" collapsible className="w-full">
                {FAQS.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`} className="border-border/50">
                    <AccordionTrigger className="text-left text-foreground hover:text-primary">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-4">
              Ready to streamline your resort?
            </h2>
            <p className="text-muted-foreground mb-6">
              Join resorts around the world using Propera to delight guests.
            </p>
            <Button 
              size="lg" 
              className="rounded-full font-semibold px-8"
              onClick={() => setShowDemoWizard(true)}
            >
              Start Free Demo
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-10 bg-card border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3">
              <ProperaMark size={36} className="text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-foreground">Propera</span>
                <span className="text-xs text-muted-foreground">Your resort, perfectly in sync.</span>
              </div>
            </Link>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">Home</Link>
              <Link to="/about" className="hover:text-primary transition-colors">About</Link>
              <Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
              <span>© {new Date().getFullYear()} Propera</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo Wizard Modal */}
      <DemoWizard 
        open={showDemoWizard} 
        onOpenChange={setShowDemoWizard} 
      />

      {/* Live Demo Qualifier Modal */}
      <LiveDemoQualifier 
        open={showLiveQualifier} 
        onOpenChange={setShowLiveQualifier} 
      />
    </div>
  );
}
