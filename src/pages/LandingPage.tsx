import { lazy, Suspense } from 'react';
import { SEOHead, PROPERA_WEBSITE_SCHEMA, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { MarketingLayout } from '@/components/layout/MarketingLayout';

// Eagerly load critical above-fold components only
import { HomeHero } from '@/components/landing/HomeHero';
import { WhyProperaCards } from '@/components/landing/WhyProperaCards';
import { HomeFinalCTA } from '@/components/landing/HomeFinalCTA';

// Lazy load all below-fold sections (including framer-motion heavy ones)
const PlatformModules = lazy(() => import('@/components/landing/PlatformModules'));
const HowItWorks = lazy(() => import('@/components/landing/HowItWorks'));
const GlobalReady = lazy(() => import('@/components/landing/GlobalReady'));
const PricingTeaser = lazy(() => import('@/components/landing/PricingTeaser').then(m => ({ default: m.PricingTeaser })));
const TrustStrip = lazy(() => import('@/components/landing/TrustStrip').then(m => ({ default: m.TrustStrip })));

// Simple loading fallback
const SectionFallback = () => (
  <div className="py-24 flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
  </div>
);

// Landing page structured data
const LANDING_PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Propera - Resort Operations, Beautifully Organized',
  description: 'Propera brings guests, teams, schedules, and bookings into one elegant system — so service feels effortless.',
  url: 'https://propera.cc/',
  mainEntity: {
    '@type': 'SoftwareApplication',
    name: 'Propera',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      category: 'Resort Operations Software'
    }
  }
};

export default function LandingPage() {
  return (
    <MarketingLayout currentPage="home">
      <SEOHead
        title="Resort Operations, Beautifully Organized | Propera"
        description="Propera brings guests, teams, schedules, and bookings into one elegant system — so service feels effortless. Built for resorts worldwide."
        canonicalUrl="/"
        keywords="resort booking platform, resort management software, guest experience platform, multi-resort operations, resort activities booking, restaurant reservations"
        structuredData={[PROPERA_WEBSITE_SCHEMA, PROPERA_ORGANIZATION_SCHEMA, LANDING_PAGE_SCHEMA]}
      />
      
      <HomeHero />
      <WhyProperaCards />
      
      {/* Lazy loaded sections */}
      <Suspense fallback={<SectionFallback />}>
        <PlatformModules />
      </Suspense>
      <div className="bg-card/20">
        <Suspense fallback={<SectionFallback />}>
          <HowItWorks />
        </Suspense>
      </div>
      <Suspense fallback={<SectionFallback />}>
        <GlobalReady />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <PricingTeaser />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <TrustStrip />
      </Suspense>
      
      <HomeFinalCTA />
    </MarketingLayout>
  );
}
