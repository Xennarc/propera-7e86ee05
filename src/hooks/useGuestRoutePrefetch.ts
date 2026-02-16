import { useEffect, useRef } from 'react';

/**
 * Prefetches key guest route chunks during idle time after login.
 * Uses <link rel="prefetch"> to warm the browser cache for lazy-loaded routes.
 */
const PREFETCH_PATHS = [
  '/guest/activities',
  '/guest/restaurants',
  '/guest/bookings',
];

export function useGuestRoutePrefetch() {
  const prefetched = useRef(false);

  useEffect(() => {
    if (prefetched.current) return;
    prefetched.current = true;

    const schedule = typeof requestIdleCallback === 'function'
      ? (cb: () => void) => requestIdleCallback(cb, { timeout: 4000 })
      : (cb: () => void) => setTimeout(cb, 2000);

    schedule(() => {
      PREFETCH_PATHS.forEach((path) => {
        // Check if link already exists
        if (document.querySelector(`link[rel="prefetch"][href="${path}"]`)) return;
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = path;
        link.as = 'document';
        document.head.appendChild(link);
      });
    });
  }, []);
}
