import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SEOHead, PROPERA_ORGANIZATION_SCHEMA } from '@/components/seo/SEOHead';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { LogIn } from 'lucide-react';

import { AboutHeroSection } from '@/components/about/AboutHeroSection';
import { AboutValuesSection } from '@/components/about/AboutValuesSection';
import { AboutTimelineSection } from '@/components/about/AboutTimelineSection';
import { AboutGlobalSection } from '@/components/about/AboutGlobalSection';
import { AboutProductSection } from '@/components/about/AboutProductSection';
import { AboutTeamSection } from '@/components/about/AboutTeamSection';
import { AboutCTASection } from '@/components/about/AboutCTASection';

const ABOUT_PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About Propera - Our Story & Mission',
  description: 'Learn about Propera, the global resort operations platform connecting staff, guests, and analytics across properties worldwide.',
  url: 'https://propera.cc/about'
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead 
        title="About Us - Our Story & Mission" 
        description="Propera connects resort operations and guest experience into one platform. Learn our story and mission to transform resorts worldwide." 
        canonicalUrl="/about" 
        keywords="about propera, resort technology company, hospitality software, guest experience platform, multi-resort management" 
        structuredData={[PROPERA_ORGANIZATION_SCHEMA, ABOUT_PAGE_SCHEMA]} 
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <nav className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <ProperaMark size={40} className="text-primary" />
            <span className="text-xl font-bold text-foreground tracking-tight">Propera</span>
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex rounded-full px-4 font-medium">
              <Link to="/">Home</Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="hidden sm:flex rounded-full px-4 font-medium">
              <Link to="/pricing">Pricing</Link>
            </Button>
            <ThemeToggle className="text-muted-foreground hover:text-foreground" />
            <Button asChild size="sm" className="rounded-full px-5 font-semibold shadow-md">
              <Link to="/guest/login">
                <LogIn className="h-4 w-4 mr-2" />
                Guest Login
              </Link>
            </Button>
          </div>
        </nav>
      </header>

      <main>
        <AboutHeroSection />
        <AboutValuesSection />
        <AboutTimelineSection />
        <AboutGlobalSection />
        <AboutProductSection />
        <AboutTeamSection />
        <AboutCTASection />
      </main>

      {/* Footer */}
      <footer className="py-10 bg-card border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3">
              <ProperaMark size={36} className="text-primary" />
              <div className="flex flex-col">
                <span className="font-bold text-foreground">Propera</span>
                <span className="text-xs text-muted-foreground">Your resort, perfectly in sync.</span>
              </div>
            </Link>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
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
