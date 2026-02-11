import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, CalendarCheck, MapPinOff } from 'lucide-react';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { SEOHead } from '@/components/seo/SEOHead';

export default function GuestNotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error('Guest 404: attempted to access non-existent guest route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <SEOHead
        title="Page Not Found"
        description="The page you're looking for doesn't exist in the guest portal."
        noIndex={true}
      />
      <Card className="w-full max-w-sm border-border/30 shadow-xl rounded-3xl">
        <CardContent className="flex flex-col items-center py-10 px-6 text-center">
          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
            <MapPinOff className="h-8 w-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Found</h1>
          <p className="text-muted-foreground text-sm mb-6">
            We couldn't find this page. It may have been moved or doesn't exist.
          </p>
          <div className="flex flex-col gap-3 w-full">
            <Button asChild className="w-full gap-2">
              <Link to={GUEST_ROUTES.HOME}>
                <Home className="h-4 w-4" />
                Go Home
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full gap-2">
              <Link to={GUEST_ROUTES.BOOKINGS}>
                <CalendarCheck className="h-4 w-4" />
                My Bookings
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
