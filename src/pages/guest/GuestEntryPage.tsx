import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { getLastResort } from '@/lib/guest-resort-context';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { ProperaLoader } from '@/components/icons/ProperaLogo';

/**
 * /guest/entry — Canonical entry point for the Guest Portal.
 *
 * Resolves auth state + resort context and redirects:
 *  • Authenticated → /guest (or `next` param)
 *  • Unauthenticated + known resort → /resort/{slug}/guest/login
 *  • Unauthenticated + unknown resort → /guest/find
 */
export default function GuestEntryPage() {
  const { guest, loading } = useGuestAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const next = searchParams.get('next') || '';
  const expired = searchParams.get('expired') === '1';

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
    } else {
      const params = new URLSearchParams();
      if (next) params.set('returnTo', next);
      if (expired) params.set('expired', '1');
      const qs = params.toString();
      navigate(GUEST_ROUTES.FIND_RESORT + (qs ? `?${qs}` : ''), { replace: true });
    }
  }, [loading, guest, navigate, next, expired]);

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
