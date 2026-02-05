import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { MarketingLayout } from '@/components/layout/MarketingLayout';

import { PricingHeroSection } from '@/components/pricing/PricingHeroSection';
import { PricingPlanGrid } from '@/components/pricing/PricingPlanGrid';
import { PricingComparisonMatrix } from '@/components/pricing/PricingComparisonMatrix';
import { PricingTrustSection } from '@/components/pricing/PricingTrustSection';
import { PricingAddonsSection } from '@/components/pricing/PricingAddonsSection';
import { PricingFAQSection } from '@/components/pricing/PricingFAQSection';
import { PricingCTASection } from '@/components/pricing/PricingCTASection';
import { usePricingConfig } from '@/hooks/usePricingConfig';

// ==========================================
// STATIC CONFIGURATION (non-price content)
// ==========================================

const ONBOARDING = {
  priceRange: '$2,500 – $7,500',
  label: 'per resort (one-time)',
  description: 'Includes resort setup, branding guidance, activity catalog setup, staff training, and a full test run before launch.',
};

const FAQS = [
  {
    question: 'Is pricing per resort or per user?',
    answer: 'Per resort. Every plan includes unlimited staff users — your team can grow without extra cost.',
  },
  {
    question: 'Can I turn modules on or off?',
    answer: 'Yes. Feature flags let you enable or disable modules (Transport, Requests, Loyalty, etc.) per resort, independent of your tier.',
  },
  {
    question: 'How do tiers and feature flags work together?',
    answer: 'Your subscription tier sets the baseline of available features. Feature flags allow fine-grained control within that tier, and add-ons can unlock specific capabilities outside your tier.',
  },
  {
    question: 'Do guests need to download an app?',
    answer: 'No. Propera is a mobile-first web app — guests access everything from their browser via QR code or room-based login. No app store required.',
  },
  {
    question: "What's included in onboarding?",
    answer: 'Resort setup, branding configuration, activity and dining catalog setup, staff training, and a full test run before launch.',
  },
  {
    question: 'Can we start with Essential and upgrade later?',
    answer: 'Absolutely. Many resorts start with Essential, then upgrade to Professional or Elite as operations grow. All data carries forward.',
  },
  {
    question: 'Do you support custom resort branding?',
    answer: 'Yes. On Professional and Elite, you can customize colors, logos, typography, and the guest login experience to match your resort identity.',
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
  // Fetch pricing from DB with safe fallback to defaults
  const { plans, addons } = usePricingConfig();

  return (
    <MarketingLayout currentPage="pricing">
      <SEOHead
        title="Pricing - Resort Booking Platform Plans"
        description="Simple, transparent pricing for modern resorts. Choose from Essential, Professional, or Elite plans to streamline guest bookings, staff operations, and analytics."
        canonicalUrl="/pricing"
        keywords="resort booking pricing, hotel booking software pricing, resort management plans, guest portal pricing"
        structuredData={[PROPERA_ORGANIZATION_SCHEMA, PRICING_PAGE_SCHEMA]}
      />

      <PricingHeroSection />
      <PricingPlanGrid plans={plans} />
      <PricingComparisonMatrix />
      <PricingTrustSection />
      <PricingAddonsSection addons={addons} onboarding={ONBOARDING} />
      <PricingFAQSection faqs={FAQS} />
      <PricingCTASection />
    </MarketingLayout>
  );
}
