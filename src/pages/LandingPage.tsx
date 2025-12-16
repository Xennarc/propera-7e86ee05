import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHead, PROPERA_WEBSITE_SCHEMA, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { LogIn, Menu, X } from 'lucide-react';
import { useState } from 'react';

// Landing page sections
import { HeroSection } from '@/components/landing/HeroSection';
import { WhyProperaSection } from '@/components/landing/WhyProperaSection';
import { ProductTourSection } from '@/components/landing/ProductTourSection';
import { GlobalResortsSection } from '@/components/landing/GlobalResortsSection';
import { MetricsSection } from '@/components/landing/MetricsSection';
import { PersonasSection } from '@/components/landing/PersonasSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { FinalCTASection } from '@/components/landing/FinalCTASection';

// Landing page structured data
const LANDING_PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Propera - The Operating System for Resort Stays',
  description: 'Multi-resort booking platform connecting guest apps and staff consoles for activities, dining, loyalty, and operations worldwide.',
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

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="The Operating System for Resort Stays | Propera"
        description="Propera connects your staff console and guest app into one live system for bookings, operations, and loyalty – across every property you run. Built for world-class resorts worldwide."
        canonicalUrl="/"
        keywords="resort booking platform, resort management software, guest experience platform, multi-resort operations, resort activities booking, restaurant reservations, resort loyalty program"
        structuredData={[PROPERA_WEBSITE_SCHEMA, PROPERA_ORGANIZATION_SCHEMA, LANDING_PAGE_SCHEMA]}
      />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between" aria-label="Main navigation">
          <div className="flex items-center gap-3">
            <ProperaMark size={40} className="text-primary" />
            <span className="text-xl font-bold text-foreground tracking-tight">Propera</span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#product-tour" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Product
            </a>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
          </div>
          
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button asChild variant="ghost" size="sm">
              <Link to="/guest/login">
                Guest Portal
              </Link>
            </Button>
            <Button asChild size="sm" className="rounded-full px-5 font-semibold">
              <Link to="/auth">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
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
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background border-b border-border/30 py-4">
            <div className="container mx-auto px-4 flex flex-col gap-4">
              <a 
                href="#product-tour" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Product
              </a>
              <Link 
                to="/pricing" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link 
                to="/about" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                About
              </Link>
              <hr className="border-border/30" />
              <Link 
                to="/guest/login" 
                className="text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                Guest Portal
              </Link>
              <Button asChild size="sm" className="w-full">
                <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </Link>
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main>
        <HeroSection />
        <WhyProperaSection />
        <ProductTourSection />
        <GlobalResortsSection />
        <MetricsSection />
        <PersonasSection />
        <TestimonialsSection />
        <FinalCTASection />
      </main>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <ProperaMark size={36} className="text-primary" />
                <span className="font-bold text-foreground">Propera</span>
              </div>
              <p className="text-sm text-muted-foreground">
                The operating system for world-class resort stays.
              </p>
            </div>
            
            {/* Product */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#product-tour" className="hover:text-foreground transition-colors">Features</a></li>
                <li><Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link></li>
                <li><Link to="/guest/login" className="hover:text-foreground transition-colors">Guest Portal</Link></li>
              </ul>
            </div>
            
            {/* Company */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/about" className="hover:text-foreground transition-colors">About</Link></li>
                <li><a href="mailto:hello@propera.cc" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            
            {/* Get Started */}
            <div>
              <h4 className="font-semibold text-foreground mb-4">Get Started</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/auth" className="hover:text-foreground transition-colors">Sign In</Link></li>
                <li><Link to="/guest/find" className="hover:text-foreground transition-colors">Find Your Resort</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Propera. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
