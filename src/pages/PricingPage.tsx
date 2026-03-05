import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { MarketingLayout } from '@/components/layout/MarketingLayout';

import { PricingHeroSection } from '@/components/pricing/PricingHeroSection';
import { PricingPlanGrid } from '@/components/pricing/PricingPlanGrid';
import { PricingComparisonMatrix } from '@/components/pricing/PricingComparisonMatrix';
import { ResortSizeSelector } from '@/components/pricing/ResortSizeSelector';
import { PricingSwitchSection } from '@/components/pricing/PricingSwitchSection';
import { PricingFAQSection } from '@/components/pricing/PricingFAQSection';
import { PricingCTASection } from '@/components/pricing/PricingCTASection';
import { PricingStackComparison } from '@/components/pricing/PricingStackComparison';
...

      <PricingHeroSection />
      <ResortSizeSelector value={resortSize} onChange={setResortSize} />
      <PricingPlanGrid plans={plans} resortSize={resortSize} />
      <PricingSwitchSection />
      <PricingComparisonMatrix />
      <PricingStackComparison />
      <PricingFAQSection faqs={FAQS} />
      <PricingCTASection />
    </MarketingLayout>
  );
}
