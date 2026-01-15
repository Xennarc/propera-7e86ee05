import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { LogIn, Menu, X } from 'lucide-react';
import { PublicBackdrop } from '@/components/public/PublicBackdrop';

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
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      <PublicBackdrop />
      <SEOHead 
        title="About Us - Our Story & Mission" 
        description="Propera connects resort operations and guest experience into one platform. Learn our story and mission to transform resorts worldwide." 
        canonicalUrl="/about" 
        keywords="about propera, resort technology company, hospitality software, guest experience platform, multi-resort management" 
        structuredData={[PROPERA_ORGANIZATION_SCHEMA, ABOUT_PAGE_SCHEMA]} 
      />

      {/* Header with scroll effect */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-sm' 
          : 'bg-background/60 backdrop-blur-md'
      }`}>
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <ProperaMark size={40} className="text-primary" />
            <span className="text-xl font-bold text-foreground tracking-tight">Propera</span>
          </Link>
          
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link to="/about" className="text-sm text-foreground font-medium">
              About
            </Link>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button asChild size="sm" className="hidden sm:flex rounded-full px-5 font-semibold shadow-md">
              <Link to="/guest/login">
                <LogIn className="h-4 w-4 mr-2" />
                Guest Login
              </Link>
            </Button>
            
            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </nav>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border/50 px-4 py-4 space-y-4">
            <Link 
              to="/" 
              className="block text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/pricing" 
              className="block text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <Link 
              to="/about" 
              className="block text-foreground font-medium"
              onClick={() => setMobileMenuOpen(false)}
            >
              About
            </Link>
            <Button asChild size="sm" className="w-full rounded-full font-semibold">
              <Link to="/guest/login" onClick={() => setMobileMenuOpen(false)}>
                <LogIn className="h-4 w-4 mr-2" />
                Guest Login
              </Link>
            </Button>
          </div>
        )}
      </header>

      <main>
        <AboutHero />
        <OriginSection />
        <FlowJourney />
        <DesignPhilosophy />
        <GlobalReadyGallery />
        <TrustSection />
        <PrinciplesSection />
        <FoundersNote />
        <AboutFinalCTA />
      </main>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <Link to="/" className="flex items-center gap-3">
              <ProperaMark size={36} className="text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-foreground">Propera</span>
                <span className="text-xs text-muted-foreground">Your resort, perfectly in sync.</span>
              </div>
            </Link>
            <div className="flex items-center gap-8 text-sm text-muted-foreground">
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
