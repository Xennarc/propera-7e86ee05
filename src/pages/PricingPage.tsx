import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { ProperaMark } from '@/components/icons/ProperaLogo';

import { PricingHeroSection } from '@/components/pricing/PricingHeroSection';
import { PricingPlanGrid } from '@/components/pricing/PricingPlanGrid';
import { PricingComparisonMatrix } from '@/components/pricing/PricingComparisonMatrix';
import { PricingTrustSection } from '@/components/pricing/PricingTrustSection';
import { PricingAddonsSection } from '@/components/pricing/PricingAddonsSection';
import { PricingFAQSection } from '@/components/pricing/PricingFAQSection';
import { PricingCTASection } from '@/components/pricing/PricingCTASection';

// ==========================================
// PRICING CONFIGURATION (DO NOT CHANGE PRICES)
// ==========================================

const PLANS = [
  {
    id: 'essential',
    name: 'Essential',
    badge: 'Get started',
    badgeVariant: 'default' as const,
    price: '$499',
    priceUnit: 'per resort / month',
    description: 'For boutique resorts launching a clean digital booking experience.',
    features: [
      'Guest Portal + Staff Console',
      'Activities, Excursions & Spa bookings',
      'Guest profiles + pre-arrival details',
      'Live availability + capacity controls',
      'Email notifications (via your configured sender)',
      'Standard support',
    ],
    usage: 'Includes up to 1,500 guest stays / month',
    overage: 'Overage: $0.10 per guest stay',
    cta: 'Start with Essential',
    whoItsFor: 'Ideal for boutique resorts moving away from spreadsheets.',
  },
  {
    id: 'professional',
    name: 'Professional',
    badge: 'Most popular',
    badgeVariant: 'popular' as const,
    price: '$899',
    priceUnit: 'per resort / month',
    description: 'Our most popular plan for full resort operations.',
    features: [
      'Everything in Essential, plus:',
      'Restaurant bookings + request routing',
      'Department views for smoother daily ops',
      'Advanced scheduling controls (sessions, time slots, limits)',
      'Role-based access (so not everyone becomes admin)',
      'Analytics: bookings, utilization, cancellations',
    ],
    usage: 'Includes up to 3,000 guest stays / month',
    overage: 'Overage: $0.08 per guest stay',
    cta: 'Choose Professional',
    whoItsFor: 'Best for island resorts with multiple outlets needing coordination.',
  },
  {
    id: 'enterprise',
    name: 'Elite',
    badge: 'Premium control',
    badgeVariant: 'elite' as const,
    price: '$1,499',
    priceUnit: 'per resort / month',
    description: 'For high-volume resorts and groups that want premium control.',
    features: [
      'Everything in Professional, plus:',
      'Enhanced white-label branding options',
      'Priority support + faster response times',
      'Advanced analytics + performance reporting',
      'Integration readiness (API/webhooks available)',
      'Optional SLA packages',
    ],
    usage: 'Includes up to 6,000 guest stays / month',
    overage: 'Overage: $0.06 per guest stay',
    cta: 'Talk to Sales',
    whoItsFor: 'For high-volume resorts and groups that want premium control.',
  },
];

const ADDONS = [
  { name: 'Loyalty Program Suite', price: '$299 / month', description: 'Guest rewards, tier management, and return visit tracking.' },
  { name: 'Analytics Plus', price: '$199 / month', description: 'Executive dashboards & deeper insights.' },
  { name: 'Premium Support', price: '$199 / month', description: 'Priority channels & extended coverage.' },
  { name: 'Managed Content', price: 'from $150 / month', description: 'We maintain your activity catalog & seasonal updates.' },
];

const ONBOARDING = {
  priceRange: '$2,500 – $7,500',
  label: 'per resort (one-time)',
  description: 'Includes resort setup, branding guidance, activity catalog setup, staff training, and a full test run before launch.',
};

const FAQS = [
  {
    question: 'Do you charge per staff user?',
    answer: "No. Unlimited staff on every plan — your team can grow without extra cost.",
  },
  {
    question: 'What is a "guest stay"?',
    answer: 'One reservation counted once per month. It keeps pricing fair as occupancy changes.',
  },
  {
    question: 'Can guests book from their phones?',
    answer: 'Yes. Propera is mobile-first and designed for real resort conditions.',
  },
  {
    question: 'Can we start with one resort and expand?',
    answer: 'Absolutely. Many groups start with one property, then roll out after seeing results.',
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
              <Button asChild variant="ghost" size="sm" className="rounded-full px-4 font-medium text-primary">
                <Link to="/pricing">Pricing</Link>
              </Button>
            </div>
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
          </div>
        </nav>
      </header>

      <main>
        <PricingHeroSection />
        <PricingPlanGrid plans={PLANS} />
        <PricingComparisonMatrix />
        <PricingTrustSection />
        <PricingAddonsSection addons={ADDONS} onboarding={ONBOARDING} />
        <PricingFAQSection faqs={FAQS} />
        <PricingCTASection />
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
    </div>
  );
}
