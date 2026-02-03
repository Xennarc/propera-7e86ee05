import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Debug via query param: ?debugRealtime=1
const DEBUG_REALTIME = typeof window !== 'undefined' && 
  new URLSearchParams(window.location.search).get('debugRealtime') === '1';

interface UseUnifiedGuestRealtimeOptions {
  guestId: string;
  resortId: string;
  enabled?: boolean;
}

type TablePayload = RealtimePostgresChangesPayload<Record<string, unknown>> & {
  table?: string;
};

// Domain types for batching
type Domain = 'notifications' | 'transport' | 'activities' | 'dining' | 'requests' | 'prearrival';

// Debounce timers per domain
interface DebouncedInvalidators {
  notifications: ReturnType<typeof setTimeout> | null;
  transport: ReturnType<typeof setTimeout> | null;
  activities: ReturnType<typeof setTimeout> | null;
  dining: ReturnType<typeof setTimeout> | null;
  requests: ReturnType<typeof setTimeout> | null;
  prearrival: ReturnType<typeof setTimeout> | null;
}

// Dirty flags for batching
interface DirtyFlags {
  notifications: boolean;
  transport: boolean;
  activities: boolean;
  dining: boolean;
  requests: boolean;
  prearrival: boolean;
}

// Event dedupe entry
interface DedupeEntry {
  timestamp: number;
}

const DEBOUNCE_MS = 300;
const DEDUPE_WINDOW_MS = 1500; // 1.5 seconds
const TOAST_COOLDOWN_MS = 3000; // 3 seconds between transport toasts

/**
 * Generate dedupe key from payload
 */
function getDedupeKey(payload: TablePayload): string {
  const table = payload.table || 'unknown';
  const eventType = payload.eventType || 'unknown';
  const recordId = (payload.new as Record<string, unknown>)?.id || 
                   (payload.old as Record<string, unknown>)?.id || 
                   'unknown';
  return `${table}:${recordId}:${eventType}`;
}

/**
 * Unified guest realtime subscription hook.
 * Subscribes to all guest-relevant tables in a single channel,
 * reducing connection count by ~85% compared to individual subscriptions.
 * 
 * Performance features:
 * - Event deduplication (ignores same event within 1.5s)
 * - Domain batching (consolidates invalidations per debounce window)
 * - Toast rate limiting (prevents spam on rapid status changes)
 */
// Diagnostic state exposed for debug badge
export interface RealtimeDiagnostics {
  channelName: string | null;
  lastEvent: { table: string; timestamp: Date } | null;
  eventCounts: Record<string, number>;
}

export function useUnifiedGuestRealtime({
  guestId,
  resortId,
  enabled = true,
}: UseUnifiedGuestRealtimeOptions) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  
  // Diagnostic tracking refs (for debug badge)
  const eventCountsRef = useRef<Record<string, number>>({});
  const lastEventRef = useRef<{ table: string; timestamp: Date } | null>(null);
  
  // Debounce timers per domain
  const debouncersRef = useRef<DebouncedInvalidators>({
    notifications: null,
    transport: null,
    activities: null,
    dining: null,
    requests: null,
    prearrival: null,
  });
  
  // Dirty flags for batching
  const dirtyRef = useRef<DirtyFlags>({
    notifications: false,
    transport: false,
    activities: false,
    dining: false,
    requests: false,
    prearrival: false,
  });
  
  // Query keys to invalidate per domain (accumulated during dirty window)
  const pendingKeysRef = useRef<Record<Domain, string[][]>>({
    notifications: [],
    transport: [],
    activities: [],
    dining: [],
    requests: [],
    prearrival: [],
  });
  
  // Event deduplication map
  const dedupeMapRef = useRef<Map<string, DedupeEntry>>(new Map());
  
  // Toast cooldown tracking
  const lastToastRef = useRef<number>(0);

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

  // Clean up old dedupe entries periodically
  const cleanupDedupe = useCallback(() => {
    const now = Date.now();
    const map = dedupeMapRef.current;
    for (const [key, entry] of map.entries()) {
      if (now - entry.timestamp > DEDUPE_WINDOW_MS * 2) {
        map.delete(key);
      }
    }
  }, []);

  // Check if event should be deduped
  const shouldDedupe = useCallback((payload: TablePayload): boolean => {
    const key = getDedupeKey(payload);
    const now = Date.now();
    const existing = dedupeMapRef.current.get(key);
    
    if (existing && now - existing.timestamp < DEDUPE_WINDOW_MS) {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Deduped event:', key);
      }
      return true;
    }
    
    // Update timestamp
    dedupeMapRef.current.set(key, { timestamp: now });
    
    // Cleanup old entries occasionally
    if (dedupeMapRef.current.size > 50) {
      cleanupDedupe();
    }
    
    return false;
  }, [cleanupDedupe]);

  // Batched invalidation helper - accumulates keys and flushes on debounce
  const batchedInvalidate = useCallback(
    (domain: Domain, queryKeys: string[][]) => {
      // Mark domain dirty and accumulate keys
      dirtyRef.current[domain] = true;
      pendingKeysRef.current[domain].push(...queryKeys);
      
      // If timer already running, let it handle the batch
      if (debouncersRef.current[domain]) {
        return;
      }

      debouncersRef.current[domain] = setTimeout(() => {
        if (dirtyRef.current[domain]) {
          const keysToInvalidate = pendingKeysRef.current[domain];
          
          if (DEBUG_REALTIME) {
            console.debug(`[UnifiedRealtime] Flushing ${domain}:`, keysToInvalidate.length, 'keys');
          }
          
          // Dedupe keys before invalidating
          const uniqueKeys = new Map<string, string[]>();
          keysToInvalidate.forEach((key) => {
            uniqueKeys.set(JSON.stringify(key), key);
          });
          
          uniqueKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });
          
          // Reset
          dirtyRef.current[domain] = false;
          pendingKeysRef.current[domain] = [];
        }
        debouncersRef.current[domain] = null;
      }, DEBOUNCE_MS);
    },
    [queryClient]
  );

  // Domain handlers
  const handleNotifications = useCallback(
    (payload: TablePayload) => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Notifications event:', payload.eventType);
      }
      batchedInvalidate('notifications', [
        ['guest-notifications', guestId],
        ['guest-unread-count', guestId],
      ]);
    },
    [guestId, batchedInvalidate]
  );

  const handleTransport = useCallback(
    (payload: TablePayload) => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Transport event:', payload.eventType);
      }

      // Invalidate transport query keys
      batchedInvalidate('transport', [
        ['guest-buggy-requests', guestId],
        ['guest-active-ride', guestId],
        ['transport-requests', resortId],
      ]);

      // Toast rate limiting for ride status changes
      if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
        const newStatus = (payload.new as Record<string, unknown>).status as string | undefined;
        const oldStatus = (payload.old as Record<string, unknown>).status as string | undefined;

        // Only toast on meaningful transitions with valid old/new status
        if (newStatus && oldStatus && newStatus !== oldStatus) {
          const now = Date.now();
          
          // Rate limit toasts
          if (now - lastToastRef.current < TOAST_COOLDOWN_MS) {
            if (DEBUG_REALTIME) {
              console.debug('[UnifiedRealtime] Toast rate limited');
            }
            return;
          }
          
          const statusMessages: Record<string, string> = {
            ASSIGNED: 'A driver has been assigned to your ride',
            EN_ROUTE: 'Your ride is on the way',
            ARRIVED: 'Your ride has arrived!',
            COMPLETED: 'Your ride has been completed',
            CANCELLED: 'Your ride request has been cancelled',
          };

          const message = statusMessages[newStatus];
          if (message) {
            lastToastRef.current = now;
            toast.info(message, { duration: 4000 });
          }
        }
      }
    },
    [guestId, resortId, batchedInvalidate]
  );

  const handleActivities = useCallback(
    (payload: TablePayload) => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Activities event:', payload.eventType);
      }
      batchedInvalidate('activities', [
        ['guest-activity-bookings', guestId],
        ['activity-bookings', resortId],
        ['activity-sessions', resortId],
        ['activities-with-sessions', resortId],
      ]);
    },
    [guestId, resortId, batchedInvalidate]
  );

  const handleDining = useCallback(
    (payload: TablePayload) => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Dining event:', payload.eventType);
      }
      batchedInvalidate('dining', [
        ['guest-dining-reservations', guestId],
        ['dining-reservations', resortId],
        ['dining-slots', resortId],
        ['restaurant-time-slots', resortId],
      ]);
    },
    [guestId, resortId, batchedInvalidate]
  );

  const handleRequests = useCallback(
    (payload: TablePayload) => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Requests event:', payload.eventType);
      }
      batchedInvalidate('requests', [
        ['guest-service-requests', guestId],
        ['service-requests', resortId],
      ]);
    },
    [guestId, resortId, batchedInvalidate]
  );

  const handlePrearrival = useCallback(
    (payload: TablePayload) => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Prearrival event:', payload.eventType);
      }
      batchedInvalidate('prearrival', [
        ['prearrival-data', guestId],
        ['prearrival-profile', guestId],
        ['prearrival-history', guestId],
      ]);
    },
    [guestId, batchedInvalidate]
  );

  // Central event router with deduplication
  const handleEvent = useCallback(
    (payload: TablePayload) => {
      // Dedupe check
      if (shouldDedupe(payload)) {
        return;
      }
      
      const table = payload.table || 'unknown';

      // Track diagnostics for debug badge
      eventCountsRef.current[table] = (eventCountsRef.current[table] || 0) + 1;
      lastEventRef.current = { table, timestamp: new Date() };

      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Event:', { table, eventType: payload.eventType });
      }

      switch (table) {
        case 'notifications':
          handleNotifications(payload);
          break;
        case 'buggy_requests':
        case 'buggy_trips': // Phase 8: Handle trip updates for guest's rides
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
    [shouldDedupe, handleNotifications, handleTransport, handleActivities, handleDining, handleRequests, handlePrearrival]
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
      // Resort-filtered tables (availability and trip updates)
      { table: 'activity_sessions', filter: `resort_id=eq.${resortId}` },
      { table: 'restaurant_time_slots', filter: `resort_id=eq.${resortId}` },
      // Phase 8: Trip updates for guest's assigned rides
      { table: 'buggy_trips', filter: `resort_id=eq.${resortId}` },
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

    // Prevent duplicate channels - clean up existing first
    if (channelRef.current) {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Cleaning up existing channel before creating new one');
      }
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

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

    // Cleanup - always runs on unmount or dependency change
    return () => {
      if (DEBUG_REALTIME) {
        console.debug('[UnifiedRealtime] Cleaning up channel:', channelName);
      }
      clearDebouncers();
      
      // Clear pending keys
      pendingKeysRef.current = {
        notifications: [],
        transport: [],
        activities: [],
        dining: [],
        requests: [],
        prearrival: [],
      };
      
      // Reset dirty flags
      dirtyRef.current = {
        notifications: false,
        transport: false,
        activities: false,
        dining: false,
        requests: false,
        prearrival: false,
      };
      
      // Clear dedupe map
      dedupeMapRef.current.clear();
      
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, guestId, resortId, tableConfigs, handleEvent, clearDebouncers]);

  // Compute channel name (stable even when not subscribed)
  const channelName = guestId && resortId ? `guest-unified-${resortId}-${guestId}` : null;

  return {
    channelRef,
    isActive: enabled && !!guestId && !!resortId,
    // Diagnostics for debug badge
    channelName,
    lastEvent: lastEventRef.current,
    eventCounts: eventCountsRef.current,
  };
}
