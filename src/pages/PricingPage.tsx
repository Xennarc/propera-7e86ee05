import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { LogIn } from 'lucide-react';

import { PricingHeroSection } from '@/components/pricing/PricingHeroSection';
import { PricingPlanGrid } from '@/components/pricing/PricingPlanGrid';
import { PricingValueSection } from '@/components/pricing/PricingValueSection';
import { PricingComparisonTable } from '@/components/pricing/PricingComparisonTable';
import { PricingScenarioGuide } from '@/components/pricing/PricingScenarioGuide';
import { PricingEliteSpotlight } from '@/components/pricing/PricingEliteSpotlight';
import { PricingFAQSection } from '@/components/pricing/PricingFAQSection';
import { PricingCTASection } from '@/components/pricing/PricingCTASection';

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
      'Guest web portal (no app download)',
      'Activity & excursion bookings',
      'Restaurant reservations with live capacity',
      'Guest PIN management for portal access',
      'Staff console for day-to-day operations',
      'In-app notifications',
      'Basic reporting dashboard',
    ],
    whoItsFor: 'Ideal for boutique and smaller resorts moving away from spreadsheets.',
  },
  {
    id: 'professional',
    name: 'Professional',
    badge: 'Most popular',
    badgeVariant: 'popular' as const,
    price: 'From $400/mo',
    description: 'Full operations platform with advanced scheduling, guest engagement, and detailed analytics.',
    features: [
      'Everything in Essential',
      'Recurring schedules for activities & restaurants',
      'Pre-arrival booking links',
      'Guest stay feedback collection',
      'Multi-language portal (EN/ZH)',
      'Custom resort branding',
      'Detailed reports with CSV export',
    ],
    whoItsFor: 'Best for island resorts with multiple outlets needing coordination.',
  },
  {
    id: 'elite',
    name: 'Elite',
    badge: 'Data-driven excellence',
    badgeVariant: 'elite' as const,
    price: 'From $700/mo',
    description: 'Transform your resort with AI-powered analytics, revenue intelligence, and guest loyalty programs.',
    features: [
      'Everything in Professional',
      'AI Revenue Coach with recommendations',
      'Sales performance & revenue attribution',
      'Guest segment analysis & behaviour insights',
      'Guest loyalty program with tiers & rewards',
      'Booking health diagnostics',
      'Dedicated success management',
    ],
    whoItsFor: 'For data-driven resort leaders maximising revenue and guest loyalty.',
  },
];

const COMPARISON_FEATURES = [
  { name: 'Guest web portal', essential: true, professional: true, elite: true },
  { name: 'Activity & restaurant bookings', essential: true, professional: true, elite: true },
  { name: 'Booking cancellation', essential: true, professional: true, elite: true },
  { name: 'Booking modification', essential: false, professional: true, elite: true },
  { name: 'Guest notifications', essential: true, professional: true, elite: true },
  { name: 'Stay feedback collection', essential: false, professional: true, elite: true },
  { name: 'Multi-language portal', essential: false, professional: true, elite: true },
  { name: 'Pre-arrival booking', essential: false, professional: true, elite: true },
  { name: 'Custom branding', essential: false, professional: true, elite: true },
  { name: 'Guest records & PIN management', essential: true, professional: true, elite: true },
  { name: 'CSV guest import', essential: false, professional: true, elite: true },
  { name: 'Guest 360° profile', essential: false, professional: true, elite: true },
  { name: 'Guest requests queue', essential: false, professional: true, elite: true },
  { name: 'Recurring schedules', essential: false, professional: true, elite: true },
  { name: 'Closure day management', essential: false, professional: true, elite: true },
  { name: "Today's opportunities", essential: false, professional: true, elite: true },
  { name: 'In-stay upsell suggestions', essential: false, professional: true, elite: true },
  { name: 'Booking source tracking', essential: false, professional: true, elite: true },
  { name: 'Basic reports', essential: true, professional: true, elite: true },
  { name: 'Operational reports (activities, restaurants)', essential: false, professional: true, elite: true },
  { name: 'Guest & feedback reports', essential: false, professional: true, elite: true },
  { name: 'CSV export', essential: false, professional: true, elite: true },
  { name: 'Sales performance analytics', essential: false, professional: false, elite: true },
  { name: 'Revenue attribution by source', essential: false, professional: false, elite: true },
  { name: 'Guest segment analysis', essential: false, professional: false, elite: true },
  { name: 'Cancellation loss tracking', essential: false, professional: false, elite: true },
  { name: 'AI Revenue Coach', essential: false, professional: false, elite: true },
  { name: 'AI-powered insights on all reports', essential: false, professional: false, elite: true },
  { name: 'Loyalty program', essential: false, professional: false, elite: true },
  { name: 'Loyalty tiers & rewards', essential: false, professional: false, elite: true },
  { name: 'Loyalty member management', essential: false, professional: false, elite: true },
  { name: 'Booking health check', essential: false, professional: false, elite: true },
];

const FAQS = [
  {
    question: 'Which plan is right for our resort?',
    answer: 'It depends on your outlets and complexity. Essential suits smaller resorts with activities and dining. Professional is ideal for island resorts with spa, dive and watersports. Elite is for multi-property brands or those wanting AI and advanced analytics.',
  },
  {
    question: 'Can we change plans later?',
    answer: 'Absolutely. You can upgrade or downgrade your plan at any time. Upgrades take effect immediately, and downgrades apply at the end of your current billing period.',
  },
  {
    question: 'Do you support resorts in different countries and time zones?',
    answer: 'Yes, Propera is built for global resort operations. Each property can have its own timezone, currency display, and language settings.',
  },
  {
    question: 'How long does implementation usually take?',
    answer: 'Most resorts are live within 1–2 weeks. Complex multi-outlet setups may take 3–4 weeks. We work around your schedule to minimise disruption.',
  },
  {
    question: 'Can we pilot Propera with one property first?',
    answer: 'Yes, many groups start with a single property to validate the fit before rolling out to additional resorts. We support phased implementations.',
  },
  {
    question: 'What if we need custom integrations?',
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
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <ProperaMark size={40} className="text-primary" />
            <span className="text-xl font-bold text-foreground tracking-tight">Propera</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex rounded-full px-4 font-medium">
              <Link to="/">Home</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex rounded-full px-4 font-medium">
              <Link to="/about">About</Link>
            </Button>
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button asChild size="sm" className="rounded-full px-5 font-semibold shadow-md">
              <Link to="/guest/login">
                <LogIn className="h-4 w-4 mr-2" />
                Guest Login
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <PricingHeroSection />
        <PricingPlanGrid plans={PLANS} />
        <PricingValueSection />
        <PricingComparisonTable features={COMPARISON_FEATURES} />
        <PricingScenarioGuide />
        <PricingEliteSpotlight />
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
