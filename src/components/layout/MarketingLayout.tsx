import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { Menu, X } from 'lucide-react';

interface MarketingLayoutProps {
  children: React.ReactNode;
  currentPage?: 'home' | 'pricing' | 'about' | 'demo';
}

export function MarketingLayout({ children, currentPage }: MarketingLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: '/', label: 'Home', key: 'home' },
    { href: '/pricing', label: 'Pricing', key: 'pricing' },
    { href: '/about', label: 'About', key: 'about' },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Fixed canvas background */}
      <div className="marketing-canvas" />
      
      {/* Glow blobs - fixed position for continuous feel */}
      <div className="marketing-glow-hero" />
      <div className="marketing-glow-mid" />
      <div className="marketing-glow-cta" />
      
      {/* Subtle grain overlay */}
      <div className="fixed inset-0 pointer-events-none grain-overlay opacity-20 dark:opacity-30" />

      {/* Scrollable content */}
      <div className="relative z-10">
        {/* Header - glassmorphism with gradient stroke */}
        <header 
          className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
            scrolled 
              ? 'surface-glass-strong shadow-lg shadow-black/5 dark:shadow-black/20' 
              : 'bg-transparent backdrop-blur-sm'
          }`}
        >
          <nav className="container mx-auto px-4 py-4 flex items-center justify-between" aria-label="Main navigation">
            {/* Left: Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <ProperaMark size={40} className="text-primary transition-transform duration-300 group-hover:scale-105" />
              <span className="text-xl font-bold text-foreground tracking-tight">Propera</span>
            </Link>
            
            {/* Center: Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link 
                  key={link.key}
                  to={link.href} 
                  className={`text-sm transition-colors ${
                    currentPage === link.key 
                      ? 'text-primary font-medium' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
            
            {/* Right: CTAs */}
            <div className="hidden md:flex items-center gap-3">
              <ThemeToggle className="text-muted-foreground hover:text-foreground" />
              <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                <Link to="/auth">
                  Sign In
                </Link>
              </Button>
              <Button asChild size="sm" className="rounded-full px-5 font-semibold glow-lime">
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
          
          {/* Mobile Menu - Drawer style with glassmorphism */}
          {mobileMenuOpen && (
            <div className="md:hidden surface-glass-strong py-6 border-t border-border/20 pb-safe">
              <div className="container mx-auto px-4 flex flex-col gap-2">
                {navLinks.map((link) => (
                  <Link 
                    key={link.key}
                    to={link.href} 
                    className={`text-base py-4 min-h-[48px] flex items-center transition-colors ${
                      currentPage === link.key 
                        ? 'text-primary font-medium' 
                        : 'text-foreground hover:text-primary'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="pt-4 space-y-3">
                  <Button asChild variant="outline" size="lg" className="w-full rounded-full h-12">
                    <Link to="/auth" onClick={() => setMobileMenuOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                  <Button asChild size="lg" className="w-full rounded-full glow-lime h-12">
                    <Link to="/book-demo" onClick={() => setMobileMenuOpen(false)}>
                      Book a demo
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Main content */}
        <main>{children}</main>

        {/* Footer - seamless with canvas */}
        <footer className="relative py-10 md:py-14 pb-safe">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-10 mb-10">
              <div className="col-span-2 md:col-span-1">
                <Link to="/" className="flex items-center gap-3 mb-4">
                  <ProperaMark size={36} className="text-primary" />
                  <span className="font-bold text-foreground text-lg">Propera</span>
                </Link>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Resort operations, beautifully organized.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-4 md:mb-5">Product</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><a href="/#platform-overview" className="hover:text-foreground transition-colors py-1 inline-block">Features</a></li>
                  <li><Link to="/pricing" className="hover:text-foreground transition-colors py-1 inline-block">Pricing</Link></li>
                  <li><Link to="/guest/login" className="hover:text-foreground transition-colors py-1 inline-block">Guest Portal</Link></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-4 md:mb-5">Company</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><Link to="/about" className="hover:text-foreground transition-colors py-1 inline-block">About</Link></li>
                  <li><a href="mailto:hello@propera.io" className="hover:text-foreground transition-colors py-1 inline-block">Contact</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="font-semibold text-foreground mb-4 md:mb-5">Get Started</h4>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li><Link to="/auth" className="hover:text-foreground transition-colors py-1 inline-block">Sign In</Link></li>
                  <li><Link to="/guest/find" className="hover:text-foreground transition-colors py-1 inline-block">Find Your Resort</Link></li>
                </ul>
              </div>
            </div>
            
            <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} Propera. All rights reserved.
              </p>
              <div className="flex items-center gap-8 text-sm text-muted-foreground">
                <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
                <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
