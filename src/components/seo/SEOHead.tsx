import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  canonicalUrl?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
  keywords?: string;
  // Geo/Local SEO
  geoRegion?: string;
  geoPlacename?: string;
  // Structured data
  structuredData?: object | object[];
}

const DEFAULT_TITLE = 'Propera | Maldives Resort Activity Booking & Operations Platform';
const DEFAULT_DESCRIPTION = 'Propera is the leading multi-resort booking and operations platform for Maldives island resorts. Real-time activity bookings, restaurant reservations, guest portal, and staff console.';
const DEFAULT_IMAGE = 'https://storage.googleapis.com/gpt-engineer-file-uploads/Pw9i6gy3BsNxT8hWRoiXMNSzcZh1/social-images/social-1765043952873-propera-logo-mark-512.png';
const SITE_URL = 'https://propera.cc';

export function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  canonicalUrl,
  ogImage = DEFAULT_IMAGE,
  ogType = 'website',
  noIndex = false,
  keywords,
  geoRegion = 'MV',
  geoPlacename = 'Maldives',
  structuredData,
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | Propera` : DEFAULT_TITLE;
  const fullCanonicalUrl = canonicalUrl ? `${SITE_URL}${canonicalUrl}` : undefined;

  // Convert structured data to array if single object
  const structuredDataArray = structuredData 
    ? (Array.isArray(structuredData) ? structuredData : [structuredData])
    : [];

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      
      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      
      {/* Canonical URL */}
      {fullCanonicalUrl && <link rel="canonical" href={fullCanonicalUrl} />}
      
      {/* Geo/Local SEO Meta Tags */}
      <meta name="geo.region" content={geoRegion} />
      <meta name="geo.placename" content={geoPlacename} />
      
      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:site_name" content="Propera" />
      {fullCanonicalUrl && <meta property="og:url" content={fullCanonicalUrl} />}
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@properaapp" />
      
      {/* Structured Data */}
      {structuredDataArray.map((data, index) => (
        <script key={index} type="application/ld+json">
          {JSON.stringify(data)}
        </script>
      ))}
    </Helmet>
  );
}

// Site-wide structured data for WebSite and Organization
export const PROPERA_WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Propera',
  url: 'https://propera.cc',
  description: 'Multi-resort booking and operations platform for Maldives island resorts',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://propera.cc/guest/find?q={search_term_string}'
    },
    'query-input': 'required name=search_term_string'
  }
};

export const PROPERA_ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Propera',
  url: 'https://propera.cc',
  logo: 'https://storage.googleapis.com/gpt-engineer-file-uploads/Pw9i6gy3BsNxT8hWRoiXMNSzcZh1/uploads/1765043941172-propera-logo-mark-512.png',
  description: 'Leading multi-resort booking and operations platform for Maldives luxury island resorts',
  sameAs: [
    'https://twitter.com/properaapp'
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    availableLanguage: ['English', 'Chinese']
  },
  areaServed: {
    '@type': 'Country',
    name: 'Maldives'
  }
};

// Helper to create Hotel/Resort structured data
export function createResortSchema(resort: {
  name: string;
  description?: string;
  code: string;
  logoUrl?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Resort',
    name: resort.name,
    description: resort.description || `${resort.name} - Luxury Maldives resort powered by Propera`,
    url: `https://propera.cc/resort/${resort.code}/guest/login`,
    image: resort.logoUrl,
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'MV',
      addressRegion: 'Maldives'
    },
    amenityFeature: [
      { '@type': 'LocationFeatureSpecification', name: 'Digital Guest Portal' },
      { '@type': 'LocationFeatureSpecification', name: 'Online Activity Booking' },
      { '@type': 'LocationFeatureSpecification', name: 'Restaurant Reservations' }
    ]
  };
}
