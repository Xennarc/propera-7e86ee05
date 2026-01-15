import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { MarketingLayout } from '@/components/layout/MarketingLayout';

import { AboutHero } from '@/components/about/AboutHero';
import { OriginSection } from '@/components/about/OriginSection';
import { FlowJourney } from '@/components/about/FlowJourney';
import { DesignPhilosophy } from '@/components/about/DesignPhilosophy';
import { GlobalReadyGallery } from '@/components/about/GlobalReadyGallery';
import { TrustSection } from '@/components/about/TrustSection';
import { PrinciplesSection } from '@/components/about/PrinciplesSection';
import { FoundersNote } from '@/components/about/FoundersNote';
import { AboutFinalCTA } from '@/components/about/AboutFinalCTA';

const ABOUT_PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About Propera - Our Story & Mission',
  description: 'Learn about Propera, the global resort operations platform connecting staff, guests, and analytics across properties worldwide.',
  url: 'https://propera.cc/about'
};

export default function AboutPage() {
  return (
    <MarketingLayout currentPage="about">
      <SEOHead 
        title="About Us - Our Story & Mission" 
        description="Propera connects resort operations and guest experience into one platform. Learn our story and mission to transform resorts worldwide." 
        canonicalUrl="/about" 
        keywords="about propera, resort technology company, hospitality software, guest experience platform, multi-resort management" 
        structuredData={[PROPERA_ORGANIZATION_SCHEMA, ABOUT_PAGE_SCHEMA]} 
      />

      <AboutHero />
      <OriginSection />
      <FlowJourney />
      <DesignPhilosophy />
      <GlobalReadyGallery />
      <TrustSection />
      <PrinciplesSection />
      <FoundersNote />
      <AboutFinalCTA />
    </MarketingLayout>
  );
}
