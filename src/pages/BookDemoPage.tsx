import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  CheckCircle2,
  Clock,
  Smartphone,
  Users,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Zap
} from 'lucide-react';
import { DemoWizard } from '@/components/demo/DemoWizard';
import { LiveDemoQualifier } from '@/components/demo/LiveDemoQualifier';

const TRUST_CHIPS = [
  'White-label guest portal',
  'Live availability',
  'Multi-department scheduling',
  'Staff + guest views stay in sync',
];

const DEMO_FEATURES = [
  {
    icon: <Smartphone className="h-6 w-6" />,
    title: 'Guest portal that feels premium',
    description: 'Guests browse, filter, book, and manage bookings without calling your desk.',
  },
  {
    icon: <Clock className="h-6 w-6" />,
    title: 'Live capacity and clean scheduling',
    description: 'Sessions and slots stay accurate. No "double booked but… maybe?" moments.',
  },
  {
    icon: <Users className="h-6 w-6" />,
    title: 'Department-ready workflows',
    description: 'Dive, watersports, spa, excursions, dining — each with the right constraints.',
  },
  {
    icon: <RefreshCw className="h-6 w-6" />,
    title: 'Staff view + guest view stay aligned',
    description: 'When staff updates availability, the guest side reflects it immediately.',
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: 'A calmer daily operation',
    description: 'Less messaging. Fewer mistakes. More time for the guest experience.',
  },
];

const STEPS = [
  { number: '1', title: 'Create your demo workspace', description: 'We set up a sample resort with real workflows.' },
  { number: '2', title: 'Follow the guided checklist', description: 'Reach the "first guest booking" moment fast.' },
  { number: '3', title: 'Go live when ready', description: 'Upgrade, brand it, invite staff, and launch.' },
];

const FAQS = [
  {
    question: 'Do I need to talk to someone to try it?',
    answer: 'No. The instant demo is designed to stand on its own. If you want a walkthrough, you can book one.',
  },
  {
    question: "What's included in the instant demo?",
    answer: 'A demo resort workspace with sample activities, sessions, dining slots, guests, and example bookings — plus a guided checklist so you can test the full flow.',
  },
  {
    question: 'Can I use my own branding?',
    answer: 'Yes. You can add your logo and brand color in the demo to see how it feels guest-side.',
  },
  {
    question: 'Does the guest portal work on phones?',
    answer: "Yes — it's built mobile-first, because that's where guests live.",
  },
  {
    question: 'Can multiple departments use it?',
    answer: "That's the point. Propera is built for shared resort operations across departments, while keeping each team's workflow clean.",
  },
  {
    question: 'What happens after the demo?',
    answer: "If you're ready, you can upgrade and convert the same workspace into a live resort setup — no need to start over.",
  },
  {
    question: 'Is this built for Maldives-style island resorts?',
    answer: 'Yes. The UX and workflows are designed for fast-moving teams, limited time, and high guest expectations — the island reality.',
  },
];

const BOOK_DEMO_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Book a Propera Demo | Resort Bookings, Scheduling & Guest Portal',
  description: 'See how Propera streamlines resort activities, spa, excursions and dining—live availability, guest self-service, and real-time operations. Try instantly or book a walkthrough.',
  url: 'https://propera.cc/book-demo',
};

export default function BookDemoPage() {
  const [showDemoWizard, setShowDemoWizard] = useState(false);
  const [showLiveQualifier, setShowLiveQualifier] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Book a Propera Demo | Resort Bookings, Scheduling & Guest Portal"
        description="See how Propera streamlines resort activities, spa, excursions and dining—live availability, guest self-service, and real-time operations. Try instantly or book a walkthrough."
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
              <span className="text-sm text-primary font-medium px-4">Demo</span>
            </div>
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button asChild variant="ghost" size="sm" className="rounded-full font-medium">
              <Link to="/staff/auth">Sign in</Link>
            </Button>
          </div>
        </nav>
      </header>

      <main className="pt-24">
        {/* Hero Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <Badge variant="outline" className="mb-6 text-primary border-primary/30">
                Propera Demo
              </Badge>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 tracking-tight">
                Let guests book. Let staff breathe.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8">
                Propera is a modern guest booking and operations hub for island resorts — activities, spa, excursions, and dining — with real-time availability and a clean guest portal.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                <Button 
                  size="lg" 
                  className="rounded-full font-semibold px-8 h-12"
                  onClick={() => setShowDemoWizard(true)}
                  data-trigger-demo
                >
                  Try Propera Now (10 min)
                  <Play className="ml-2 h-4 w-4" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  className="rounded-full font-semibold px-8 h-12"
                  onClick={() => setShowLiveQualifier(true)}
                  data-trigger-qualifier
                >
                  Book a Live Walkthrough
                  <Calendar className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <p className="text-sm text-muted-foreground mb-10">
                No pressure. No long forms. Your demo workspace is created instantly.
              </p>

              {/* Trust chips */}
              <div className="flex flex-wrap justify-center gap-3">
                {TRUST_CHIPS.map((chip) => (
                  <Badge key={chip} variant="secondary" className="py-1.5 px-3 text-sm font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-primary" />
                    {chip}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Two Paths Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {/* Card A - Self-Serve Demo */}
              <Card className="relative overflow-hidden border-2 border-primary/20 bg-primary/5">
                <div className="absolute top-4 right-4">
                  <Badge className="bg-primary text-primary-foreground">Recommended</Badge>
                </div>
                <CardHeader className="pt-12">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                    <Zap className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Instant demo workspace</CardTitle>
                  <CardDescription className="text-base">
                    Spin up a guided demo resort with realistic sample data. Explore the staff console and guest portal in minutes — no calls required.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Preloaded activities, sessions, dining slots</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Guided checklist to your first guest booking</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>Upgrade to go live anytime</span>
                    </li>
                  </ul>
                  <Button 
                    size="lg" 
                    className="w-full rounded-full font-semibold"
                    onClick={() => setShowDemoWizard(true)}
                  >
                    Create My Demo Workspace
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Takes ~60 seconds to start. Uses your email only to create access.
                  </p>
                </CardContent>
              </Card>

              {/* Card B - Live Walkthrough */}
              <Card className="border border-border">
                <CardHeader className="pt-12">
                  <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
                    <Calendar className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-2xl">Live walkthrough (for teams)</CardTitle>
                  <CardDescription className="text-base">
                    Best if you're comparing vendors, need stakeholder buy-in, or want a tailored rollout plan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span>Focused on your departments & flows</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span>Implementation plan and timeline</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span>Q&A with real scenarios</span>
                    </li>
                  </ul>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full rounded-full font-semibold"
                    onClick={() => setShowLiveQualifier(true)}
                  >
                    Book a Walkthrough
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    We'll ask a few quick questions first so the call is actually useful.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* What you'll see Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">What the demo covers</h2>
            <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12">
              Everything you need to see how Propera works in practice.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {DEMO_FEATURES.map((feature, idx) => (
                <Card key={idx} className="bg-background border-border/50">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof Band */}
        <section className="py-12 bg-muted/30 border-y border-border/50">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <p className="text-lg font-medium text-foreground mb-2">
              Built for island resorts and fast-moving teams.
            </p>
            <p className="text-muted-foreground">
              Designed to replace spreadsheets, WhatsApp chaos, and "who booked what?" phone calls.
            </p>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {STEPS.map((step) => (
                <div key={step.number} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-xl flex items-center justify-center mx-auto mb-4">
                    {step.number}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-4">Questions, answered</h2>
            <p className="text-muted-foreground text-center mb-10">
              Everything you need to know before trying Propera.
            </p>
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-4">
                {FAQS.map((faq, idx) => (
                  <AccordionItem key={idx} value={`faq-${idx}`} className="bg-background border rounded-lg px-6">
                    <AccordionTrigger className="text-left font-medium py-4 hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              See it once. Feel the difference.
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Try the instant demo now — or book a walkthrough if you want a tailored rollout plan.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
              <Button 
                size="lg" 
                className="rounded-full font-semibold px-8 h-12"
                onClick={() => setShowDemoWizard(true)}
              >
                Try Propera Now (10 min)
                <Play className="ml-2 h-4 w-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="rounded-full font-semibold px-8 h-12"
                onClick={() => setShowLiveQualifier(true)}
              >
                Book a Live Walkthrough
                <Calendar className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              You'll spend less time explaining and more time delivering the experience.
            </p>
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
              <Link to="/staff/auth" className="hover:text-primary transition-colors">Staff Login</Link>
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
