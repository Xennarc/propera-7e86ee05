import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { updateServiceWorker } from '@/lib/pwa-registration';

// Routes where we should NOT interrupt with update prompts
const UNSAFE_ROUTES = ['/guest/book', '/guest/checkout', '/guest/buggy/request'];

export function GuestUpdatePrompt() {
  const location = useLocation();

  useEffect(() => {
    const handler = () => {
      // Don't prompt during active booking flows
      const isSafe = !UNSAFE_ROUTES.some((r) => location.pathname.startsWith(r));
      if (!isSafe) {
        // Re-listen — will fire again on next navigation
        return;
      }

      toast('A new version is available', {
        duration: Infinity,
        action: {
          label: 'Refresh',
          onClick: () => updateServiceWorker(),
        },
      });
    };

    window.addEventListener('pwa-update-available', handler);
    return () => window.removeEventListener('pwa-update-available', handler);
  }, [location.pathname]);

  return null;
}
