import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHead, PROPERA_WEBSITE_SCHEMA, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { Menu, X } from 'lucide-react';
import { useState, useEffect, lazy, Suspense } from 'react';

// Eagerly load above-fold components
import { HomeHero } from '@/components/landing/HomeHero';
import { WhyProperaCards } from '@/components/landing/WhyProperaCards';
import { PricingTeaser } from '@/components/landing/PricingTeaser';
import { TrustStrip } from '@/components/landing/TrustStrip';
import { HomeFinalCTA } from '@/components/landing/HomeFinalCTA';

// Lazy load below-fold heavy sections
const PlatformModules = lazy(() => import('@/components/landing/PlatformModules'));
const HowItWorks = lazy(() => import('@/components/landing/HowItWorks'));
const GlobalReady = lazy(() => import('@/components/landing/GlobalReady'));

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Track scroll for nav background
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Resort Operations, Beautifully Organized | Propera"
        description="Propera brings guests, teams, schedules, and bookings into one elegant system — so service feels effortless. Built for resorts worldwide."
        canonicalUrl="/"
        keywords="resort booking platform, resort management software, guest experience platform, multi-resort operations, resort activities booking, restaurant reservations"
        structuredData={[PROPERA_WEBSITE_SCHEMA, PROPERA_ORGANIZATION_SCHEMA, LANDING_PAGE_SCHEMA]}
      />
      
      {/* Header - translucent becoming solid on scroll */}
      <header 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled 
            ? 'bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm' 
            : 'bg-background/60 backdrop-blur-md border-b border-transparent'
        }`}
      >
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between" aria-label="Main navigation">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <ProperaMark size={40} className="text-primary" />
            <span className="text-xl font-bold text-foreground tracking-tight">Propera</span>
          </div>
          
          {/* Center: Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a 
              href="#platform-overview" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Product
            </a>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
          </div>
          
          {/* Right: CTAs */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">
                Sign In
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-full px-5 font-semibold">
              <Link to="/book-demo">
                Book a demo
              </Link>
            </Button>
          </div>
          
          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </nav>
        
        {/* Mobile Menu - Drawer style */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background/98 backdrop-blur-xl border-b border-border/50 py-6">
            <div className="container mx-auto px-4 flex flex-col gap-4">
              <a 
                href="#platform-overview" 
                className="text-base text-foreground hover:text-primary transition-colors py-3 border-b border-border/30"
                onClick={() => setMobileMenuOpen(false)}
              >
                Product
              </a>
              <Link 
                to="/pricing" 
                className="text-base text-foreground hover:text-primary transition-colors py-3 border-b border-border/30"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link 
                to="/about" 
                className="text-base text-foreground hover:text-primary transition-colors py-3 border-b border-border/30"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <div className="pt-4 space-y-3">
                <Button asChild variant="outline" size="lg" className="w-full rounded-xl">
                  <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button asChild size="lg" className="w-full rounded-xl">
                  <Link to="/book-demo" onClick={() => setMobileMenuOpen(false)}>
                    Book a demo
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content - Premium page structure */}
      <main>
        <HomeHero />
        <WhyProperaCards />
        
        {/* Lazy loaded sections */}
        <Suspense fallback={<SectionFallback />}>
          <PlatformModules />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <HowItWorks />
        </Suspense>
        <Suspense fallback={<SectionFallback />}>
          <GlobalReady />
        </Suspense>
        
        <PricingTeaser />
        <TrustStrip />
        <HomeFinalCTA />
      </main>

      {/* Footer - Premium */}
      <footer className="footer-premium py-14">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <ProperaMark size={36} className="text-primary" />
                <span className="font-bold text-foreground text-lg">Propera</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Resort operations, beautifully organized.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-5">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#platform-overview" className="hover:text-foreground transition-colors">Features</a></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/guest/login" className="hover:text-foreground transition-colors">Guest Portal</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-5">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><a href="mailto:hello@propera.io" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-5">Get Started</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link></li>
                <li><Link to="/guest/find" className="hover:text-foreground transition-colors">Find Your Resort</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Propera. All rights reserved.
            </p>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
