import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { MarketingLayout } from '@/components/layout/MarketingLayout';

import { PricingHeroSection } from '@/components/pricing/PricingHeroSection';
import { PricingPlanGrid } from '@/components/pricing/PricingPlanGrid';
import { PricingComparisonMatrix } from '@/components/pricing/PricingComparisonMatrix';
import { PricingSwitchSection } from '@/components/pricing/PricingSwitchSection';
import { PricingFAQSection } from '@/components/pricing/PricingFAQSection';
import { PricingCTASection } from '@/components/pricing/PricingCTASection';
import { PricingStackComparison } from '@/components/pricing/PricingStackComparison';
import { usePricingConfig } from '@/hooks/usePricingConfig';
import { useResortSize } from '@/hooks/useResortSize';

const FAQS = [
  {
    question: 'What counts as a guest stay?',
    answer: "A guest stay is one room stay from check-in to check-out. If two guests share a room, it's still one stay.",
  },
  {
    question: 'Do you charge per staff user?',
    answer: 'No. Plans include unlimited staff users. Use role-based access to control permissions.',
  },
  {
    question: 'Can we start small and expand to new departments?',
    answer: "Yes. Propera is modular — add departments like spa, dive, kids club, or dining without reworking the guest experience.",
  },
  {
    question: 'Do we need integrations to get value?',
    answer: "Not to start. You can go live with Propera's guest portal and operations tools first. Integrations can be added when you're ready.",
  },
  {
    question: 'How fast can we go live?',
    answer: 'Most resorts can go live in days, depending on menus/services setup and training.',
  },
  {
    question: 'Is Propera white-label?',
    answer: 'White-label branding is included in Elite, and available in more limited form in lower tiers depending on your needs.',
  },
  {
    question: 'Can we handle low season?',
    answer: 'Yes. Seasonal Flex lets you scale down temporarily and scale back up without losing setup.',
  },
];

const PRICING_PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Propera Pricing - Resort Booking Platform Plans',
  description: 'Simple, transparent pricing plans for modern resorts. Choose Essential, Professional, or Elite based on your resort operations.',
  url: 'https://propera.cc/pricing',
};

export default function PricingPage() {
  const { plans } = usePricingConfig();
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
      <PricingPlanGrid plans={plans} resortSize={resortSize} onResortSizeChange={setResortSize} />
      <PricingSwitchSection />
      <PricingComparisonMatrix />
      <PricingStackComparison />
      <PricingFAQSection faqs={FAQS} />
      <PricingCTASection />
    </MarketingLayout>
  );
}
