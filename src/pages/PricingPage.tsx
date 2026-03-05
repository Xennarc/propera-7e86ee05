import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { MarketingLayout } from '@/components/layout/MarketingLayout';

import { PricingHeroSection } from '@/components/pricing/PricingHeroSection';
import { PricingPlanGrid } from '@/components/pricing/PricingPlanGrid';
import { PricingComparisonMatrix } from '@/components/pricing/PricingComparisonMatrix';
import { ResortSizeSelector } from '@/components/pricing/ResortSizeSelector';
import { PricingTrustSection } from '@/components/pricing/PricingTrustSection';
import { PricingSwitchSection } from '@/components/pricing/PricingSwitchSection';
import { PricingFAQSection } from '@/components/pricing/PricingFAQSection';
import { PricingCTASection } from '@/components/pricing/PricingCTASection';
import { PricingPromiseSection } from '@/components/pricing/PricingPromiseSection';
import { usePricingConfig } from '@/hooks/usePricingConfig';
import { useResortSize } from '@/hooks/useResortSize';

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
  const { plans, addons } = usePricingConfig();
  const [resortSize, setResortSize] = useResortSize();

  return (
    <MarketingLayout currentPage="pricing">
      <SEOHead
        title="Pricing — Replace Your Resort Stack | Propera"
        description="One platform for pre-arrival, bookings, dining, room service, housekeeping, transport, loyalty, and department operations. Simple plans that scale with your resort."
        canonicalUrl="/pricing"
        keywords="resort operating system pricing, resort booking platform plans, resort ops software, guest experience platform pricing"
        structuredData={[PROPERA_ORGANIZATION_SCHEMA, PRICING_PAGE_SCHEMA]}
      />

      <PricingHeroSection />
      <ResortSizeSelector value={resortSize} onChange={setResortSize} />
      <PricingPlanGrid plans={plans} resortSize={resortSize} />
      <PricingPromiseSection />
      <PricingSwitchSection />
      <PricingComparisonMatrix />
      <PricingTrustSection />
      <PricingFAQSection faqs={FAQS} />
      <PricingCTASection />
    </MarketingLayout>
  );
}
