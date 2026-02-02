import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Toggle for debug logging
const DEBUG_REALTIME = false;

interface UseUnifiedGuestRealtimeOptions {
  guestId: string;
  resortId: string;
  enabled?: boolean;
}

type TablePayload = RealtimePostgresChangesPayload<Record<string, unknown>> & {
  table?: string;
};

// Debounce timers per domain
interface DebouncedInvalidators {
  notifications: ReturnType<typeof setTimeout> | null;
  transport: ReturnType<typeof setTimeout> | null;
  activities: ReturnType<typeof setTimeout> | null;
  dining: ReturnType<typeof setTimeout> | null;
  requests: ReturnType<typeof setTimeout> | null;
  prearrival: ReturnType<typeof setTimeout> | null;
}

const DEBOUNCE_MS = 300;

/**
 * Unified guest realtime subscription hook.
 * Subscribes to all guest-relevant tables in a single channel,
 * reducing connection count by ~85% compared to individual subscriptions.
 */
export function useUnifiedGuestRealtime({
  guestId,
  resortId,
  enabled = true,
}: UseUnifiedGuestRealtimeOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const debouncersRef = useRef<DebouncedInvalidators>({
    notifications: null,
    transport: null,
    activities: null,
    dining: null,
    requests: null,
    prearrival: null,
  });

  // Clear all debounce timers
  const clearDebouncers = useCallback(() => {
    Object.values(debouncersRef.current).forEach((timer) => {
      if (timer) clearTimeout(timer);
    });
    debouncersRef.current = {
      notifications: null,
      transport: null,
      activities: null,
      dining: null,
      requests: null,
      prearrival: null,
    };
  }, []);

  // Debounced invalidation helper
  const debouncedInvalidate = useCallback(
    (domain: keyof DebouncedInvalidators, queryKeys: string[][]) => {
      if (debouncersRef.current[domain]) {
        clearTimeout(debouncersRef.current[domain]!);
      }

      debouncersRef.current[domain] = setTimeout(() => {
        if (DEBUG_REALTIME) {
          console.debug(`[UnifiedRealtime] Invalidating ${domain}:`, queryKeys);
        }
        queryKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });
        debouncersRef.current[domain] = null;
      }, DEBOUNCE_MS);
    },
    [queryClient]
  );

  // Domain handlers
  const handleNotifications = useCallback(
    (payload: TablePayload) => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Notifications event:', payload);
      }
      debouncedInvalidate('notifications', [
        ['guest-notifications', guestId],
        ['guest-unread-count', guestId],
      ]);
    },
    [guestId, debouncedInvalidate]
  );

  const handleTransport = useCallback(
    (payload: TablePayload) => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Transport event:', payload);
      }

      // Invalidate transport query keys
      debouncedInvalidate('transport', [
        ['guest-buggy-requests', guestId],
        ['guest-active-ride', guestId],
        ['transport-requests', resortId],
      ]);

      // Show toast for ride status changes (preserve existing behavior)
      if (payload.eventType === 'UPDATE' && payload.new) {
        const newStatus = (payload.new as Record<string, unknown>).status as string | undefined;
        const oldStatus = (payload.old as Record<string, unknown>)?.status as string | undefined;

        if (newStatus && newStatus !== oldStatus) {
          const statusMessages: Record<string, string> = {
            ASSIGNED: 'A driver has been assigned to your ride',
            EN_ROUTE: 'Your ride is on the way',
            ARRIVED: 'Your ride has arrived!',
            COMPLETED: 'Your ride has been completed',
            CANCELLED: 'Your ride request has been cancelled',
          };

          const message = statusMessages[newStatus];
          if (message) {
            toast.info(message, { duration: 4000 });
          }
        }
      }
    },
    [guestId, resortId, debouncedInvalidate]
  );

  const handleActivities = useCallback(
    (payload: TablePayload) => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Activities event:', payload);
      }
      debouncedInvalidate('activities', [
        ['guest-activity-bookings', guestId],
        ['activity-bookings', resortId],
        ['activity-sessions', resortId],
        ['activities-with-sessions', resortId],
      ]);
    },
    [guestId, resortId, debouncedInvalidate]
  );

  const handleDining = useCallback(
    (payload: TablePayload) => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Dining event:', payload);
      }
      debouncedInvalidate('dining', [
        ['guest-dining-reservations', guestId],
        ['dining-reservations', resortId],
        ['dining-slots', resortId],
        ['restaurant-time-slots', resortId],
      ]);
    },
    [guestId, resortId, debouncedInvalidate]
  );

  const handleRequests = useCallback(
    (payload: TablePayload) => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Requests event:', payload);
      }
      debouncedInvalidate('requests', [
        ['guest-service-requests', guestId],
        ['service-requests', resortId],
      ]);
    },
    [guestId, resortId, debouncedInvalidate]
  );

  const handlePrearrival = useCallback(
    (payload: TablePayload) => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Prearrival event:', payload);
      }
      debouncedInvalidate('prearrival', [
        ['prearrival-data', guestId],
        ['prearrival-profile', guestId],
        ['prearrival-history', guestId],
      ]);
    },
    [guestId, debouncedInvalidate]
  );

  // Central event router
  const handleEvent = useCallback(
    (payload: TablePayload) => {
      const table = payload.table;

      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Event received:', { table, eventType: payload.eventType });
      }

      switch (table) {
        case 'notifications':
          handleNotifications(payload);
          break;
        case 'buggy_requests':
          handleTransport(payload);
          break;
        case 'activity_bookings':
        case 'activity_sessions':
          handleActivities(payload);
          break;
        case 'restaurant_reservations':
        case 'restaurant_time_slots':
          handleDining(payload);
          break;
        case 'service_requests':
          handleRequests(payload);
          break;
        case 'prearrival_profiles':
          handlePrearrival(payload);
          break;
        default:
          if (DEBUG_REALTIME) {
            console.debug('[UnifiedRealtime] Unhandled table:', table);
          }
      }
    },
    [handleNotifications, handleTransport, handleActivities, handleDining, handleRequests, handlePrearrival]
  );

  // Table configurations
  const tableConfigs = useMemo(
    () => [
      // Guest-filtered tables
      { table: 'notifications', filter: `guest_id=eq.${guestId}` },
      { table: 'buggy_requests', filter: `guest_id=eq.${guestId}` },
      { table: 'activity_bookings', filter: `guest_id=eq.${guestId}` },
      { table: 'restaurant_reservations', filter: `guest_id=eq.${guestId}` },
      { table: 'service_requests', filter: `guest_id=eq.${guestId}` },
      { table: 'prearrival_profiles', filter: `guest_id=eq.${guestId}` },
      // Resort-filtered tables (availability)
      { table: 'activity_sessions', filter: `resort_id=eq.${resortId}` },
      { table: 'restaurant_time_slots', filter: `resort_id=eq.${resortId}` },
    ],
    [guestId, resortId]
  );

  useEffect(() => {
    if (!enabled || !guestId || !resortId) {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Skipping subscription:', { enabled, guestId, resortId });
      }
      return;
    }

    const channelName = `guest-unified-${resortId}-${guestId}`;

    if (DEBUG_REALTIME) {
      console.debug('[UnifiedRealtime] Creating channel:', channelName);
    }

    // Create single channel
    const channel = supabase.channel(channelName);
    channelRef.current = channel;

    // Attach subscription for each table
    tableConfigs.forEach(({ table, filter }) => {
      channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter,
        },
        handleEvent
      );
    });

    // Subscribe to channel
    channel.subscribe((status, err) => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Subscription status:', status);
      }
      if (err) {
        console.error('[UnifiedRealtime] Subscription error:', err);
      }
    });

    // Cleanup
    return () => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Cleaning up channel:', channelName);
      }
      clearDebouncers();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, guestId, resortId, tableConfigs, handleEvent, clearDebouncers]);

  return {
    channelRef,
    isActive: enabled && !!guestId && !!resortId,
  };
}
