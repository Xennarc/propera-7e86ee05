import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { WaveDivider } from '@/components/icons/ProperaIcons';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  Check, 
  Minus, 
  Sparkles, 
  LogIn, 
  ArrowRight, 
  Mail,
  Users,
  BarChart3,
  Headphones,
  Smartphone
} from 'lucide-react';

// ==========================================
// PRICING CONFIGURATION
// ==========================================

const PLANS = [
  {
    id: 'essential',
    name: 'Essential',
    badge: 'Get started',
    badgeVariant: 'default' as const,
    price: 'From $200/mo',
    description: 'Core tools to centralise activity and restaurant bookings in one live system.',
    features: [
      'Guest web portal (no app download needed)',
      'Activity and excursion bookings',
      'Restaurant reservations with live capacity',
      'Basic staff console for day-to-day operations',
      'Email confirmations and reminders',
      'Standard support during business hours',
    ],
    whoItsFor: 'Ideal for boutique and smaller resorts who want to move away from manual spreadsheets and WhatsApp chaos.',
    problemSolved: 'Focus on centralising guest-facing booking for activities and restaurants. Emphasise ease of use and minimal change management.',
    details: {
      guestExperience: [
        'Guests can browse and book activities and dining from their phone.',
        'No app download required – access via QR code or link.',
      ],
      staffOperations: [
        'Live list of bookings for activities and restaurants.',
        'Simple capacity controls to avoid overbooking.',
      ],
      analytics: [
        'Basic booking counts per outlet and date.',
      ],
      support: [
        'Standard email support and basic onboarding.',
      ],
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    badge: 'Most popular',
    badgeVariant: 'popular' as const,
    price: 'From $400/mo',
    description: 'Full operations platform for typical island resorts with spa and watersports.',
    features: [
      'Everything in Essential',
      'Spa & wellness bookings',
      'Watersports and dive centre scheduling',
      'Department-level daily schedules',
      'Basic revenue & performance analytics',
      'Priority support',
    ],
    whoItsFor: 'Best for standalone island resorts with spa, watersports and dive operations.',
    problemSolved: 'Brings all departments into one shared system, ensuring seamless coordination between dive centre, spa, watersports, and F&B.',
    details: {
      guestExperience: [
        'Single portal for activities, spa, watersports, dive and restaurants.',
        'Clear booking confirmations and reminders by email.',
      ],
      staffOperations: [
        'Department-level daily schedules (dive centre, spa, watersports, F&B).',
        'Assign capacities, time slots and resources across outlets.',
      ],
      analytics: [
        'Outlet performance overview (activities, spa, watersports, dining).',
        'Identify under-utilised time slots and top-selling experiences.',
      ],
      support: [
        'Priority support and more hands-on onboarding.',
      ],
    },
  },
  {
    id: 'elite',
    name: 'Elite',
    badge: 'For ambitious brands',
    badgeVariant: 'elite' as const,
    price: 'From $700/mo',
    description: 'Advanced guest experience, AI and analytics for multi-resort brands and high-touch operations.',
    features: [
      'Everything in Professional',
      'AI-powered guest concierge',
      'WhatsApp/SMS confirmations and reminders',
      'Multi-resort HQ dashboard',
      'Advanced analytics and exportable reports',
      'Dedicated onboarding & success management',
    ],
    whoItsFor: 'Designed for high-end and multi-resort brands that want AI guest assistance and deeper analytics.',
    problemSolved: 'Emphasise AI concierge, messaging and HQ-level control for multi-property groups looking to standardise and optimise operations.',
    details: {
      guestExperience: [
        'AI concierge that answers common questions and suggests activities.',
        'WhatsApp/SMS confirmations and reminders for key bookings.',
      ],
      staffOperations: [
        'Cross-resort overview for multi-property groups.',
        'Faster communication with guests via automation, reducing phone calls.',
      ],
      analytics: [
        'Multi-resort performance dashboards.',
        'Export-friendly reports for finance and management.',
      ],
      support: [
        'Dedicated onboarding, success calls and best-practice guidance.',
      ],
    },
  },
];

const COMPARISON_FEATURES = [
  { name: 'Guest web portal', essential: true, professional: true, elite: true },
  { name: 'Activities & excursions', essential: true, professional: true, elite: true },
  { name: 'Restaurant bookings', essential: true, professional: true, elite: true },
  { name: 'Spa & wellness bookings', essential: false, professional: true, elite: true },
  { name: 'Watersports & dive scheduling', essential: false, professional: true, elite: true },
  { name: 'Department-level daily schedules', essential: false, professional: true, elite: true },
  { name: 'Basic analytics', essential: true, professional: true, elite: true },
  { name: 'Advanced analytics & exports', essential: false, professional: false, elite: true },
  { name: 'AI concierge', essential: false, professional: false, elite: true },
  { name: 'WhatsApp/SMS messaging', essential: false, professional: false, elite: true },
  { name: 'Multi-resort HQ dashboard', essential: false, professional: false, elite: true },
  { name: 'Support level', essential: 'Standard', professional: 'Priority', elite: 'Dedicated' },
];

const FAQS = [
  {
    question: 'Which plan is right for our resort?',
    answer: 'It depends on your outlets and complexity. Essential suits smaller resorts with activities and dining. Professional is ideal for island resorts with spa, dive and watersports. Elite is for multi-property brands or those wanting AI and advanced analytics. We\'re happy to advise – just request a demo.',
  },
  {
    question: 'Can we change plans later?',
    answer: 'Absolutely. You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, and downgrades apply at the end of your current billing period.',
  },
  {
    question: 'Do you offer discounts for multiple resorts?',
    answer: 'Yes, we offer volume pricing for multi-property groups. Contact our sales team for a custom quote based on your portfolio size.',
  },
  {
    question: "What's included in the setup fee?",
    answer: 'Setup includes initial configuration, data import, staff training sessions, and a dedicated onboarding manager (for Professional and Elite). Essential includes self-serve setup with email support.',
  },
  {
    question: 'How long does onboarding usually take?',
    answer: 'Most resorts are live within 1–2 weeks. Complex multi-outlet setups may take 3–4 weeks. We work around your schedule to minimise disruption.',
  },
  {
    question: 'Do you integrate with our existing PMS?',
    answer: 'We offer integrations with popular property management systems. Contact us to discuss your specific PMS and integration requirements.',
  },
];

const PRICING_PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Propera Pricing - Resort Booking Platform Plans',
  description: 'Simple, transparent pricing plans for modern resorts. Choose Essential, Professional, or Elite based on your resort operations.',
  url: 'https://propera.cc/pricing',
};

// ==========================================
// COMPONENT
// ==========================================

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Pricing - Resort Booking Platform Plans"
        description="Simple, transparent pricing for modern resorts. Choose from Essential, Professional, or Elite plans to streamline guest bookings, staff operations, and analytics."
        canonicalUrl="/pricing"
        keywords="resort booking pricing, hotel booking software pricing, resort management plans, guest portal pricing"
        structuredData={[PROPERA_ORGANIZATION_SCHEMA, PRICING_PAGE_SCHEMA]}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between" aria-label="Main navigation">
          <Link to="/" className="flex items-center gap-3">
            <ProperaMark size={40} className="text-primary" />
            <span className="text-xl font-bold text-foreground tracking-tight">Propera</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link 
              to="/pricing" 
              className="hidden sm:inline-flex text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            >
              Pricing
            </Link>
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button asChild size="sm" className="rounded-full px-5 font-semibold shadow-md">
              <Link to="/guest/login" aria-label="Access guest login portal">
                <LogIn className="h-4 w-4 mr-2" aria-hidden="true" />
                Guest Login
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-28 pb-16 md:pt-36 md:pb-24 overflow-hidden hero-pattern" aria-labelledby="pricing-hero-heading">
          <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" aria-hidden="true" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/20 rounded-full blur-[80px] pointer-events-none" aria-hidden="true" />

          <div className="container relative mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-5 py-2.5 rounded-full text-sm font-semibold mb-8 animate-fade-in shadow-sm border border-primary/20">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Pricing
              </div>

              <h1 id="pricing-hero-heading" className="text-4xl md:text-5xl lg:text-display font-extrabold text-foreground mb-6 text-balance animate-slide-up">
                Simple, transparent plans for{' '}
                <span className="text-gradient">modern resorts</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto text-balance animate-slide-up leading-relaxed">
                Propera connects your guests, staff and outlets in one live system. Choose a plan that matches your resort today, and scale into AI and analytics when you're ready.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
                <Button asChild size="lg" className="text-base px-8 py-6 rounded-full shadow-elevated hover-glow font-semibold">
                  <a href="mailto:hello@propera.cc?subject=Demo Request">
                    Request a demo
                    <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                  </a>
                </Button>
                <a 
                  href="mailto:hello@propera.cc?subject=Custom Plan Inquiry" 
                  className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Talk to us about custom plans
                </a>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0" aria-hidden="true">
            <WaveDivider variant="subtle" />
          </div>
        </section>

        {/* Plan Cards Section */}
        <section className="py-20 md:py-28 bg-card relative" aria-labelledby="plans-heading">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-6xl mx-auto">
              {PLANS.map((plan) => (
                <PlanCard key={plan.id} plan={plan} />
              ))}
            </div>
          </div>
        </section>

        {/* Wave transition */}
        <WaveDivider flip className="text-card" aria-hidden="true" />

        {/* Detailed Per-Tier Explanation */}
        <section className="py-20 md:py-28 bg-background section-gradient-warm" aria-labelledby="details-heading">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 id="details-heading" className="text-3xl md:text-headline font-bold text-foreground mb-4">
                What's included in each plan
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                A deeper look at features and benefits for each tier.
              </p>
            </div>

            <div className="space-y-12 max-w-4xl mx-auto">
              {PLANS.map((plan) => (
                <PlanDetailBlock key={plan.id} plan={plan} />
              ))}
            </div>
          </div>
        </section>

        {/* Comparison Table Section */}
        <section className="py-20 md:py-28 bg-card" aria-labelledby="compare-heading">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 id="compare-heading" className="text-3xl md:text-headline font-bold text-foreground mb-4">
                Compare plans
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                See which features are included in each plan at a glance.
              </p>
            </div>

            <div className="max-w-4xl mx-auto overflow-x-auto">
              <ComparisonTable />
            </div>
          </div>
        </section>

        {/* Wave transition */}
        <WaveDivider flip className="text-card" aria-hidden="true" />

        {/* FAQ Section */}
        <section className="py-20 md:py-28 bg-background" aria-labelledby="faq-heading">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 id="faq-heading" className="text-3xl md:text-headline font-bold text-foreground mb-4">
                Frequently asked questions
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                Common questions from resort operators like you.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                {FAQS.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left font-semibold text-foreground hover:text-primary">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 md:py-28 bg-card relative overflow-hidden" aria-labelledby="final-cta-heading">
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[60px] pointer-events-none" aria-hidden="true" />
          <div className="absolute bottom-0 left-0 w-60 h-60 bg-accent/10 rounded-full blur-[40px] pointer-events-none" aria-hidden="true" />

          <div className="container mx-auto px-4 relative">
            <Card className="max-w-2xl mx-auto border-primary/20 shadow-elevated card-stack overflow-hidden">
              <CardContent className="p-8 md:p-12 text-center relative">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-8 shadow-sm" aria-hidden="true">
                  <Sparkles className="h-10 w-10 text-primary" />
                </div>
                <h2 id="final-cta-heading" className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                  Ready to see Propera in action?
                </h2>
                <p className="text-muted-foreground mb-8 text-lg">
                  Share a few details about your resort and we'll walk you through the best plan for your operations.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button asChild size="lg" className="text-base px-8 rounded-full font-semibold shadow-md">
                    <a href="mailto:hello@propera.cc?subject=Demo Request">
                      Request a demo
                      <ArrowRight className="ml-2 h-5 w-5" aria-hidden="true" />
                    </a>
                  </Button>
                  <a 
                    href="mailto:hello@propera.cc" 
                    className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Mail className="h-4 w-4" />
                    Or email us directly
                  </a>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-10 bg-background border-t border-border/50">
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
              <Link to="/pricing" className="hover:text-primary transition-colors">Pricing</Link>
              <span>© {new Date().getFullYear()} Propera. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ==========================================
// SUB-COMPONENTS
// ==========================================

function PlanCard({ plan }: { plan: typeof PLANS[0] }) {
  const isPopular = plan.badgeVariant === 'popular';

  return (
    <Card className={`relative flex flex-col h-full transition-all duration-200 hover:shadow-elevated ${
      isPopular ? 'border-primary shadow-elevated ring-2 ring-primary/20' : 'border-border/50'
    }`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full shadow-md">
          Most popular
        </div>
      )}
      <CardContent className="p-6 md:p-8 flex flex-col flex-1">
        {/* Badge */}
        <span className={`inline-flex self-start items-center px-3 py-1 rounded-full text-xs font-semibold mb-4 ${
          plan.badgeVariant === 'popular' 
            ? 'bg-primary/10 text-primary' 
            : plan.badgeVariant === 'elite'
            ? 'bg-orchid/15 text-orchid'
            : 'bg-muted text-muted-foreground'
        }`}>
          {plan.badge}
        </span>

        {/* Name & Price */}
        <h3 className="text-2xl font-bold text-foreground mb-2">{plan.name}</h3>
        <p className="text-2xl font-bold text-primary mb-4">{plan.price}</p>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{plan.description}</p>

        {/* Features */}
        <ul className="space-y-3 mb-8 flex-1">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3 text-sm">
              <Check className="h-5 w-5 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
              <span className="text-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Button asChild className={`w-full rounded-xl font-semibold ${isPopular ? '' : 'variant-outline'}`} variant={isPopular ? 'default' : 'outline'}>
          <a href="mailto:hello@propera.cc?subject=Demo Request">
            Request a demo
          </a>
        </Button>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Billed monthly. Volume pricing available.
        </p>
      </CardContent>
    </Card>
  );
}

function PlanDetailBlock({ plan }: { plan: typeof PLANS[0] }) {
  const iconClass = "h-5 w-5 text-primary flex-shrink-0";

  return (
    <Card className="card-luxury p-6 md:p-8">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-foreground mb-2">{plan.name}</h3>
        <p className="text-sm text-primary font-medium mb-3">{plan.whoItsFor}</p>
        <p className="text-muted-foreground text-sm leading-relaxed">{plan.problemSolved}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DetailCategory
          icon={<Smartphone className={iconClass} />}
          title="Guest Experience"
          items={plan.details.guestExperience}
        />
        <DetailCategory
          icon={<Users className={iconClass} />}
          title="Staff Operations"
          items={plan.details.staffOperations}
        />
        <DetailCategory
          icon={<BarChart3 className={iconClass} />}
          title="Analytics & Reporting"
          items={plan.details.analytics}
        />
        <DetailCategory
          icon={<Headphones className={iconClass} />}
          title="Support"
          items={plan.details.support}
        />
      </div>
    </Card>
  );
}

function DetailCategory({ 
  icon, 
  title, 
  items 
}: { 
  icon: React.ReactNode; 
  title: string; 
  items: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h4 className="font-semibold text-foreground text-sm">{title}</h4>
      </div>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="h-4 w-4 text-success flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ComparisonTable() {
  return (
    <div className="rounded-2xl border border-border/50 overflow-hidden bg-background">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted/50">
            <th className="text-left py-4 px-4 md:px-6 font-semibold text-foreground">Feature</th>
            <th className="text-center py-4 px-3 md:px-6 font-semibold text-foreground">Essential</th>
            <th className="text-center py-4 px-3 md:px-6 font-semibold text-primary bg-primary/5">Professional</th>
            <th className="text-center py-4 px-3 md:px-6 font-semibold text-foreground">Elite</th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON_FEATURES.map((feature, index) => (
            <tr key={index} className="border-t border-border/30 hover:bg-muted/20 transition-colors">
              <td className="py-4 px-4 md:px-6 text-foreground font-medium">{feature.name}</td>
              <td className="py-4 px-3 md:px-6 text-center">
                <FeatureValue value={feature.essential} />
              </td>
              <td className="py-4 px-3 md:px-6 text-center bg-primary/5">
                <FeatureValue value={feature.professional} />
              </td>
              <td className="py-4 px-3 md:px-6 text-center">
                <FeatureValue value={feature.elite} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeatureValue({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-muted-foreground text-xs font-medium">{value}</span>;
  }
  if (value) {
    return (
      <span className="inline-flex items-center justify-center">
        <Check className="h-5 w-5 text-success" aria-label="Included" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center">
      <Minus className="h-5 w-5 text-muted-foreground/40" aria-label="Not included" />
    </span>
  );
}
