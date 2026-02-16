import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { updateServiceWorker } from '@/lib/pwa-registration';

// Routes where we should NOT interrupt with update prompts
const UNSAFE_ROUTES = ['/guest/book', '/guest/checkout', '/guest/buggy/request'];

export function GuestUpdatePrompt() {
  const location = useLocation();
  const pendingUpdate = useRef(false);

  useEffect(() => {
    const isSafe = !UNSAFE_ROUTES.some((r) => location.pathname.startsWith(r));

    // If there's a pending update and we navigated to a safe route, show toast
    if (pendingUpdate.current && isSafe) {
      pendingUpdate.current = false;
      showUpdateToast();
    }
  }, [location.pathname]);

  useEffect(() => {
    const handler = () => {
      const isSafe = !UNSAFE_ROUTES.some((r) => location.pathname.startsWith(r));
      if (!isSafe) {
        // Store as pending — will fire on next safe navigation
        pendingUpdate.current = true;
        return;
      }
      showUpdateToast();
    };

    window.addEventListener('pwa-update-available', handler);
    return () => window.removeEventListener('pwa-update-available', handler);
  }, [location.pathname]);

  return null;
}

function showUpdateToast() {
  toast('A new version is available', {
    duration: Infinity,
    action: {
      label: 'Refresh',
      onClick: () => updateServiceWorker(),
    },
  });
}
