import { useCallback } from 'react';
import { toast } from 'sonner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Guard network-dependent actions when offline.
 * Usage:
 *   const { isOnline, guardAction } = useOfflineActionGuard();
 *   guardAction(() => submitBooking(), "Booking requires an internet connection.");
 */
export function useOfflineActionGuard() {
  const isOnline = useOnlineStatus();

  const guardAction = useCallback(
    (action: () => void, message?: string) => {
      if (!isOnline) {
        toast.error(message || "You're offline. This action requires an internet connection.");
        return;
      }
      action();
    },
    [isOnline],
  );

  return { isOnline, guardAction };
}
