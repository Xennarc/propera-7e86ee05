import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
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
  Zap,
  Rocket,
  Shield,
  Waves
} from 'lucide-react';
import { LiveDemoQualifier } from '@/components/demo/LiveDemoQualifier';
import { useDemoEnter } from '@/hooks/useDemoEnter';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { cn } from '@/lib/utils';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { DemoLeadCaptureCard } from '@/components/demo/DemoLeadCaptureCard';

const TRUST_CHIPS = [
  'No signup required',
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
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'Enterprise-grade security',
    description: 'Role-based access, audit trails, and data protection built in from day one.',
  },
];

const STEPS = [
  {
    number: '1',
    title: "Click Enter — you're in",
    description: 'No signup, no email. We auto-log you into a live demo resort.',
    icon: <Rocket className="h-5 w-5" />
  },
  {
    number: '2',
    title: 'Explore as a guest or as staff',
    description: 'Browse, book, and manage from both sides. Real workflows, sample data.',
    icon: <CheckCircle2 className="h-5 w-5" />
  },
  {
    number: '3',
    title: 'Book a call when ready',
    description: 'Talk to us about rolling out Propera at your resort — on your timeline.',
    icon: <Sparkles className="h-5 w-5" />
  },
];

const FAQS = [
  {
    question: 'Do I need to sign up or share my email?',
    answer: "No. The instant demo opens immediately — no signup, no email, no password. If you'd like a follow-up, you can optionally drop your email in the form on this page.",
  },
  {
    question: "What's included in the instant demo?",
    answer: 'A shared demo resort with sample activities, sessions, dining slots, guests, and example bookings. You enter as one of three rotating personas, so you can also try it in two browser tabs as different guests.',
  },
  {
    question: 'Will my actions affect other people trying the demo?',
    answer: 'No. Each visitor gets their own isolated slot — your bookings, exits, and resets are private to you. The catalog (activities, restaurants) is shared and read-only.',
  },
  {
    question: 'Can I use my own branding?',
    answer: 'Not in the shared demo. Once you go live with your own workspace, you can add your logo and brand color and see it reflected on the guest side.',
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
    answer: "When you're ready, book a walkthrough or drop your email here. We'll provision a real workspace for your resort — branded, clean, and yours.",
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
  const [showLiveQualifier, setShowLiveQualifier] = useState(false);
  const [selectedPath, setSelectedPath] = useState<'instant' | 'walkthrough'>('instant');
  const { enter, isEntering } = useDemoEnter();

  const handleEnterGuest = () => { void enter('guest'); };
  const handleEnterStaff = () => { void enter('staff'); };

  return (
    <MarketingLayout currentPage="demo">
      <SEOHead
        title="Book a Propera Demo | Resort Bookings, Scheduling & Guest Portal"
        description="See how Propera streamlines resort activities, spa, excursions and dining—live availability, guest self-service, and real-time operations. Try instantly or book a walkthrough."
        canonicalUrl="/book-demo"
        keywords="resort booking demo, hotel software demo, guest portal demo, resort management trial"
        structuredData={[PROPERA_ORGANIZATION_SCHEMA, BOOK_DEMO_SCHEMA]}
      />

      <div className="pt-24 relative z-10">
        {/* Resume banner removed in Perfect Demo Resort flow. */}

        {/* Hero Section */}
        <section className="py-10 md:py-16 lg:py-24 xl:py-32">
          <div className="container mx-auto px-4">
            <div className="relative max-w-4xl mx-auto">
              {/* Glow effect behind panel - hidden on mobile */}
              <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-3xl rounded-3xl hidden sm:block" />
              
              <div className="relative bg-card/60 backdrop-blur-2xl rounded-2xl sm:rounded-3xl border border-border/30 p-6 sm:p-8 md:p-12 lg:p-16 shadow-elevated">
                <div className="text-center">
                  <span className="glass-pill mb-4 sm:mb-6 inline-flex items-center text-xs sm:text-sm">
                    <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-2" />
                    Propera Demo
                  </span>
                  
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-foreground mb-4 sm:mb-6 tracking-tight leading-tight">
                    Let guests book.
                    <br />
                    <span className="bg-gradient-to-r from-teal-500 via-teal-400 to-lagoon-500 bg-clip-text text-transparent">
                      Let staff breathe.
                    </span>
                  </h1>
                  
                  <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 sm:mb-8 md:mb-10 max-w-2xl mx-auto leading-relaxed">
                    Click and you're in. No signup, no email, no password — explore the full guest portal and staff console using a live demo resort with realistic data.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-4 sm:mb-6">
                    <Button 
                      size="lg" 
                      className="bg-primary text-primary-foreground rounded-full font-semibold px-6 sm:px-8 h-12 glow-lime hover:-translate-y-0.5 transition-all w-full sm:w-auto"
                      onClick={handleEnterGuest}
                      disabled={isEntering}
                      data-trigger-demo
                    >
                      {isEntering ? <LoadingSpinner size="sm" className="mr-2" /> : <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />}
                      Enter as Guest
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={handleEnterStaff}
                      disabled={isEntering}
                      className="rounded-full font-semibold px-6 sm:px-8 h-12 border-border/50 hover:border-primary/30 w-full sm:w-auto"
                      data-trigger-staff
                    >
                      {isEntering ? <LoadingSpinner size="sm" className="mr-2" /> : <Calendar className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />}
                      Enter as Staff
                    </Button>
                  </div>

                  <p className="text-xs sm:text-sm text-muted-foreground/80 mb-6 sm:mb-8 md:mb-10">
                    Instant access. No forms. Exit anytime — your slot resets automatically.
                  </p>

                  {/* Trust chips */}
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                    {TRUST_CHIPS.map((chip) => (
                      <span key={chip} className="glass-pill text-xs sm:text-sm">
                        <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5 sm:mr-2 text-primary" />
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Optional lead capture — non-blocking */}
        <DemoLeadCaptureCard />

        {/* Two Paths Section */}
        <section className="py-12 md:py-16 lg:py-20 relative">
          <div className="container mx-auto px-4">
            {/* Segmented Toggle */}
            <div className="flex justify-center mb-6 md:mb-10">
              <div className="inline-flex bg-card/80 backdrop-blur-xl rounded-xl sm:rounded-2xl p-1 sm:p-1.5 border border-border/50">
                <button
                  onClick={() => setSelectedPath('instant')}
                  className={cn(
                    "px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300",
                    selectedPath === 'instant' 
                      ? "bg-primary text-primary-foreground shadow-lg" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1.5 sm:mr-2" />
                  Instant Demo
                </button>
                <button
                  onClick={() => setSelectedPath('walkthrough')}
                  className={cn(
                    "px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300",
                    selectedPath === 'walkthrough' 
                      ? "bg-primary text-primary-foreground shadow-lg" 
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1.5 sm:mr-2" />
                  Live Walkthrough
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {/* Card A - Self-Serve Demo */}
              <Card 
                className={cn(
                  "relative overflow-hidden bg-card/60 backdrop-blur-xl border-2 rounded-3xl transition-all duration-300 hover:translate-y-[-4px]",
                  selectedPath === 'instant' 
                    ? "border-primary/50 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)]" 
                    : "border-border/30 hover:border-border/50"
                )}
              >
                <div className="absolute top-4 right-4">
                  <span className="inline-flex items-center bg-gradient-to-r from-teal-500 to-teal-400 text-primary-foreground font-semibold px-3 py-1 rounded-full text-sm">
                    <Rocket className="h-3 w-3 mr-1.5" />
                    Fastest
                  </span>
                </div>
                <CardHeader className="pt-14 pb-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl text-foreground">Instant demo workspace</CardTitle>
                  <CardDescription className="text-base text-muted-foreground/90 mt-2">
                    Spin up a guided demo resort with realistic sample data. Explore the staff console and guest portal in minutes — no calls required.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pb-8">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-sm text-foreground/90">
                      <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center mt-0.5 flex-shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span>Preloaded activities, sessions, dining slots</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-foreground/90">
                      <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center mt-0.5 flex-shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span>Guided checklist to your first guest booking</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-foreground/90">
                      <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center mt-0.5 flex-shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span>Upgrade to go live anytime</span>
                    </li>
                  </ul>
                  <Button 
                    size="lg" 
                    className="w-full bg-primary text-primary-foreground rounded-full font-semibold glow-lime"
                    onClick={handleEnterGuest}
                    disabled={isEntering}
                  >
                    Enter the Demo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground/70">
                    Instant. No signup, no email, no password.
                  </p>
                </CardContent>
              </Card>

              {/* Card B - Live Walkthrough */}
              <Card 
                className={cn(
                  "relative overflow-hidden bg-card/60 backdrop-blur-xl border-2 rounded-3xl transition-all duration-300 hover:translate-y-[-4px]",
                  selectedPath === 'walkthrough' 
                    ? "border-primary/50 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.3)]" 
                    : "border-border/30 hover:border-border/50"
                )}
              >
                <CardHeader className="pt-14 pb-4">
                  <div className="w-16 h-16 rounded-2xl bg-muted border border-border/50 flex items-center justify-center mb-5">
                    <Calendar className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-2xl text-foreground">Live walkthrough (for teams)</CardTitle>
                  <CardDescription className="text-base text-muted-foreground/90 mt-2">
                    Best if you're comparing vendors, need stakeholder buy-in, or want a tailored rollout plan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pb-8">
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3 text-sm text-foreground/90">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center mt-0.5 flex-shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span>Focused on your departments & flows</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-foreground/90">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center mt-0.5 flex-shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span>Implementation plan and timeline</span>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-foreground/90">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center mt-0.5 flex-shrink-0">
                        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span>Q&A with real scenarios</span>
                    </li>
                  </ul>
                  <Button 
                    size="lg" 
                    variant="outline"
                    className="w-full rounded-full font-semibold border-border/50 hover:border-primary/30"
                    onClick={() => setShowLiveQualifier(true)}
                  >
                    Book a Walkthrough
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <p className="text-xs text-center text-muted-foreground/70">
                    We'll ask a few quick questions first so the call is actually useful.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* What you'll see Section */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">What the demo covers</h2>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Everything you need to see how Propera works in practice.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
              {DEMO_FEATURES.map((feature, idx) => (
                <Card 
                  key={idx} 
                  className="bg-card/60 backdrop-blur-xl border-border/30 rounded-2xl hover:border-border/50 transition-all duration-300 hover:translate-y-[-2px] group"
                >
                  <CardContent className="pt-7 pb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 text-primary flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    <h3 className="font-semibold text-lg mb-2 text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Social Proof Band */}
        <section className="py-14 relative">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto bg-card/60 backdrop-blur-xl rounded-3xl border border-border/30 p-8 md:p-10 text-center">
              <div className="flex justify-center mb-5">
                <Waves className="h-8 w-8 text-primary/60" />
              </div>
              <p className="text-xl md:text-2xl font-medium text-foreground mb-3">
                Built for island resorts and fast-moving teams.
              </p>
              <p className="text-muted-foreground text-lg">
                Designed to replace spreadsheets, WhatsApp chaos, and "who booked what?" phone calls.
              </p>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center text-foreground mb-14">How it works</h2>
            <div className="max-w-4xl mx-auto relative">
              {/* Connecting line */}
              <div className="absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent hidden md:block" />
              
              <div className="grid md:grid-cols-3 gap-6">
                {STEPS.map((step, idx) => (
                  <div key={step.number} className="relative">
                    <div className="bg-card/60 backdrop-blur-xl rounded-2xl border border-border/30 p-6 text-center hover:border-border/50 transition-all duration-300 hover:translate-y-[-2px]">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-400 text-primary-foreground font-bold text-xl flex items-center justify-center mx-auto mb-5 shadow-lg">
                        {step.number}
                      </div>
                      <h3 className="font-semibold text-lg mb-2 text-foreground">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">{step.description}</p>
                    </div>
                    {/* Arrow connector for mobile */}
                    {idx < STEPS.length - 1 && (
                      <div className="flex justify-center py-3 md:hidden">
                        <ArrowRight className="h-5 w-5 text-primary/50 rotate-90" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Questions, answered</h2>
              <p className="text-muted-foreground text-lg">
                Everything you need to know before trying Propera.
              </p>
            </div>
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="space-y-3">
                {FAQS.map((faq, idx) => (
                  <AccordionItem 
                    key={idx} 
                    value={`faq-${idx}`} 
                    className="bg-card/60 backdrop-blur-xl border border-border/30 rounded-2xl px-6 data-[state=open]:border-primary/30 transition-all duration-200"
                  >
                    <AccordionTrigger className="text-left font-medium py-5 hover:no-underline text-foreground">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="py-20 relative">
          <div className="container mx-auto px-4">
            <div className="relative max-w-4xl mx-auto">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-lagoon-500/10 blur-3xl rounded-3xl" />
              
              <div className="relative bg-card/60 backdrop-blur-2xl rounded-3xl border border-primary/20 p-10 md:p-14 text-center shadow-elevated">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  See it once. Feel the difference.
                </h2>
                <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
                  Try the instant demo now — or book a walkthrough if you want a tailored rollout plan.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
                  <Button 
                    size="xl" 
                    className="btn-cta-premium rounded-2xl font-semibold px-8"
                    onClick={handleEnterGuest}
                    disabled={isEntering}
                  >
                    Enter the Demo
                    <Play className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    size="xl" 
                    variant="outline"
                    className="btn-ghost-premium rounded-2xl font-semibold px-8"
                    onClick={() => setShowLiveQualifier(true)}
                  >
                    Book a Live Walkthrough
                    <Calendar className="ml-2 h-5 w-5" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground/80">
                  You'll spend less time explaining and more time delivering the experience.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Demo wizard removed in Perfect Demo Resort flow. */}

      {/* Live Demo Qualifier Modal */}
      <LiveDemoQualifier 
        open={showLiveQualifier} 
        onOpenChange={setShowLiveQualifier} 
      />
    </MarketingLayout>
  );
}
