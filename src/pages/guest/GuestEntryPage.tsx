import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { getLastResort } from '@/lib/guest-resort-context';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { ProperaLoader, ProperaMark } from '@/components/icons/ProperaLogo';
import { Button } from '@/components/ui/button';
import { Search, LogIn } from 'lucide-react';

/**
 * /guest/entry — Canonical entry point for the Guest Portal.
 *
 * Resolves auth state + resort context and redirects:
 *  • Authenticated → /guest (or `next` param)
 *  • Unauthenticated + known resort → /resort/{slug}/guest/login
 *  • Unauthenticated + unknown resort → /guest/find
 *
 * When launched from PWA (source=pwa) while signed out with no resort context,
 * shows a friendly landing screen instead of instant redirect.
 */
export default function GuestEntryPage() {
  const { guest, loading } = useGuestAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPwaLanding, setShowPwaLanding] = useState(false);

  const next = searchParams.get('next') || '';
  const expired = searchParams.get('expired') === '1';
  const isPwaLaunch = searchParams.get('source') === 'pwa';

  useEffect(() => {
    if (loading) return;

    if (guest) {
      // Authenticated — go to intended destination or home
      navigate(next || GUEST_ROUTES.HOME, { replace: true });
      return;
    }

    // Not authenticated — resolve resort context
    const lastResort = getLastResort();

    if (lastResort?.slug) {
      const loginPath = `/resort/${encodeURIComponent(lastResort.slug)}/guest/login`;
      const params = new URLSearchParams();
      if (next) params.set('returnTo', next);
      if (expired) params.set('expired', '1');
      const qs = params.toString();
      navigate(loginPath + (qs ? `?${qs}` : ''), { replace: true });
    } else if (isPwaLaunch) {
      // PWA launch with no resort context — show friendly landing
      setShowPwaLanding(true);
    } else {
      const params = new URLSearchParams();
      if (next) params.set('returnTo', next);
      if (expired) params.set('expired', '1');
      const qs = params.toString();
      navigate(GUEST_ROUTES.FIND_RESORT + (qs ? `?${qs}` : ''), { replace: true });
    }
  }, [loading, guest, navigate, next, expired, isPwaLaunch]);

  // PWA signed-out landing
  if (showPwaLanding) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-6 text-center gap-6">
        <ProperaMark size={56} className="text-primary" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">Welcome to Propera</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Your resort experience in one place. Find your resort to get started.
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button asChild size="lg" className="w-full gap-2">
            <Link to={GUEST_ROUTES.FIND_RESORT}>
              <Search className="h-4 w-4" />
              Find your resort
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full gap-2">
            <Link to={GUEST_ROUTES.LOGIN}>
              <LogIn className="h-4 w-4" />
              Log in
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  // Premium loading screen while resolving
  return (
    <div className="flex min-h-screen items-center justify-center bg-background hero-pattern">
      <ProperaLoader
        size={64}
        text={expired ? 'Session expired — reconnecting…' : 'Reconnecting…'}
      />
    </div>
  );
}
