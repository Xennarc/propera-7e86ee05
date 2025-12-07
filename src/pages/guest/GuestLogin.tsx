import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, QrCode, HelpCircle, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { WaveDivider } from '@/components/icons/ProperaIcons';
import { ProperaMark } from '@/components/icons/ProperaLogo';
import { SEOHead } from '@/components/seo/SEOHead';

export default function GuestLogin() {
  const navigate = useNavigate();
  const { guest } = useGuestAuth();

  useEffect(() => {
    if (guest) navigate('/guest');
  }, [guest, navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHead
        title="Guest Portal Login"
        description="Access your Maldives resort guest portal. View your schedule, book activities, and reserve restaurants during your stay. Login with your room number and PIN."
        canonicalUrl="/guest/login"
        keywords="guest portal login, resort guest access, Maldives resort booking, activity booking"
      />
      
      {/* Theme toggle in top right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle className="text-muted-foreground hover:text-foreground" />
      </div>

      {/* Hero section with wave */}
      <header className="relative pt-16 pb-32 hero-pattern overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-10 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none" aria-hidden="true" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/20 rounded-full blur-[60px] pointer-events-none" aria-hidden="true" />
        
        <div className="text-center relative z-10">
          <Link to="/" className="inline-block mx-auto mb-6 hover:opacity-80 transition-opacity" aria-label="Go to Propera home page">
            <ProperaMark size={64} className="text-primary" />
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">Guest Portal</h1>
          <p className="text-muted-foreground">Access your Maldives resort experience</p>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0" aria-hidden="true">
          <WaveDivider variant="bold" />
        </div>
      </header>

      {/* Content overlapping wave */}
      <main className="flex-1 flex items-start justify-center px-4 -mt-20 relative z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Main info card */}
          <Card className="shadow-elevated border-border/40">
            <CardHeader className="pb-4 pt-8 text-center">
              <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4" aria-hidden="true">
                <QrCode className="h-7 w-7 text-primary" />
              </div>
              <CardTitle className="text-xl font-bold">Use Your Resort Link</CardTitle>
              <CardDescription className="text-base">
                To access your guest portal, please use the QR code or link provided by your resort.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5" aria-hidden="true">
                    <span className="text-sm font-bold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Check your room</p>
                    <p className="text-sm text-muted-foreground">Look for a QR code in your villa or room</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5" aria-hidden="true">
                    <span className="text-sm font-bold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Check your email</p>
                    <p className="text-sm text-muted-foreground">Your resort may have sent you a welcome email with a link</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5" aria-hidden="true">
                    <span className="text-sm font-bold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Ask the front desk</p>
                    <p className="text-sm text-muted-foreground">They can provide you with the correct link for your resort</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Help card */}
          <Card className="border-border/40">
            <CardContent className="py-5">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-secondary/50 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <Search className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">Can't find your link?</p>
                  <p className="text-sm text-muted-foreground">We can help you find your resort</p>
                </div>
                <Link to="/guest/find">
                  <Button variant="outline" size="sm">
                    Find Resort
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
          
          <p className="text-center text-sm text-muted-foreground pb-8">
            Need help? Please contact your front desk
          </p>
        </div>
      </main>
    </div>
  );
}
