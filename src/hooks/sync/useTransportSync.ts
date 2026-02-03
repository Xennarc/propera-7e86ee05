import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription, createResortFilter, createFilter } from './useRealtimeSubscription';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { queryKeys } from '@/lib/query-keys';
import { useGuestRealtimeContext } from '@/contexts/GuestRealtimeContext';

// Debug flag for development
const DEBUG_REALTIME_DEPRECATION = false;

/**
 * Query keys for transport module
 */
export const transportQueryKeys = {
  queue: (resortId: string) => ['transport-queue', resortId],
  trips: (resortId: string) => ['transport-trips', resortId],
  tripStops: (tripId: string) => ['trip-stops', tripId],
  tripRequests: (tripId: string) => ['trip-requests', tripId],
  buggies: (resortId: string) => ['buggies', resortId],
  drivers: (resortId: string) => ['buggy-drivers', resortId],
  stops: (resortId: string) => ['buggy-stops', resortId],
  routes: (resortId: string) => ['buggy-routes', resortId],
  guestRequests: (guestId: string) => ['guest-buggy-requests', guestId],
};

interface UseTransportRequestsSyncOptions {
  resortId: string | undefined;
  enabled?: boolean;
}

/**
 * Staff-side realtime sync for transport requests and trips.
 * Subscribes to buggy_requests, buggy_trips, buggy_trip_stops tables.
 */
export function useTransportRequestsSync({
  resortId,
  enabled = true,
}: UseTransportRequestsSyncOptions) {
  const queryClient = useQueryClient();

  // Debounce invalidation to prevent rapid-fire updates
  const debouncedInvalidate = useDebouncedCallback((keys: string[][]) => {
    keys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, 300);

  const handleChange = useCallback((payload: any) => {
    if (!resortId) return;

    const table = payload.table;
    const keysToInvalidate: string[][] = [];

    switch (table) {
      case 'buggy_requests':
        keysToInvalidate.push(transportQueryKeys.queue(resortId));
        // Also invalidate any trip that might contain this request
        if (payload.new?.id || payload.old?.id) {
          keysToInvalidate.push(transportQueryKeys.trips(resortId));
        }
        break;

      case 'buggy_trips':
        keysToInvalidate.push(transportQueryKeys.trips(resortId));
        // Invalidate specific trip stops if we have trip ID
        if (payload.new?.id) {
          keysToInvalidate.push(transportQueryKeys.tripStops(payload.new.id));
          keysToInvalidate.push(transportQueryKeys.tripRequests(payload.new.id));
        }
        break;

      case 'buggy_trip_stops':
        keysToInvalidate.push(transportQueryKeys.trips(resortId));
        if (payload.new?.trip_id) {
          keysToInvalidate.push(transportQueryKeys.tripStops(payload.new.trip_id));
        }
        break;

      case 'buggy_trip_requests':
        keysToInvalidate.push(transportQueryKeys.trips(resortId));
        if (payload.new?.trip_id) {
          keysToInvalidate.push(transportQueryKeys.tripRequests(payload.new.trip_id));
        }
        break;

      case 'buggies':
        keysToInvalidate.push(transportQueryKeys.buggies(resortId));
        break;

      case 'buggy_drivers':
        keysToInvalidate.push(transportQueryKeys.drivers(resortId));
        break;

      default:
        break;
    }

    if (keysToInvalidate.length > 0) {
      debouncedInvalidate(keysToInvalidate);
    }
  }, [resortId, debouncedInvalidate]);

  // Subscribe to all transport-related tables
  useRealtimeSubscription({
    channelKey: `transport-staff-${resortId || 'none'}`,
    tables: [
      { table: 'buggy_requests', filter: resortId ? createResortFilter(resortId) : undefined },
      { table: 'buggy_trips', filter: resortId ? createResortFilter(resortId) : undefined },
      { table: 'buggy_trip_stops', filter: resortId ? createResortFilter(resortId) : undefined },
      { table: 'buggy_trip_requests', filter: resortId ? createResortFilter(resortId) : undefined },
      { table: 'buggies', filter: resortId ? createResortFilter(resortId) : undefined },
      { table: 'buggy_drivers', filter: resortId ? createResortFilter(resortId) : undefined },
      // Phase 8: Include transport events for audit/lifecycle updates
      { table: 'transport_events', filter: resortId ? createResortFilter(resortId) : undefined },
    ],
    onChange: handleChange,
    enabled: enabled && !!resortId,
  });
}

interface UseGuestBuggyRequestsSyncOptions {
  guestId: string | undefined;
  resortId?: string | undefined;
  enabled?: boolean;
}

/**
 * Guest-side realtime sync for their buggy requests.
 * Subscribes to buggy_requests filtered by guest_id.
 * 
 * NOTE: Skips legacy channel creation if unified realtime is active.
 */
export function useGuestBuggyRequestsSync({
  guestId,
  resortId,
  enabled = true,
}: UseGuestBuggyRequestsSyncOptions) {
  const queryClient = useQueryClient();
  
  // Check if unified realtime is active
  const unifiedContext = useGuestRealtimeContext();
  const skipLegacyChannel = unifiedContext?.unifiedActive ?? false;

  // Debounce invalidation
  const debouncedInvalidate = useDebouncedCallback(() => {
    if (guestId) {
      queryClient.invalidateQueries({ 
        queryKey: transportQueryKeys.guestRequests(guestId) 
      });
    }
  }, 300);

  const handleChange = useCallback((payload: any) => {
    // Only process changes for this guest
    const newGuestId = payload.new?.guest_id;
    const oldGuestId = payload.old?.guest_id;
    
    if (newGuestId === guestId || oldGuestId === guestId) {
      debouncedInvalidate();
    }
  }, [guestId, debouncedInvalidate]);

  // Skip legacy channel if unified realtime is active
  const shouldEnable = enabled && !!guestId && !skipLegacyChannel;
  
  if (DEBUG_REALTIME_DEPRECATION && skipLegacyChannel && enabled && !!guestId) {
    console.debug('[useGuestBuggyRequestsSync] Skipping legacy channel - unified realtime active');
  }

  // Subscribe to buggy_requests for this guest
  useRealtimeSubscription({
    channelKey: `transport-guest-${guestId || 'none'}`,
    tables: [
      { 
        table: 'buggy_requests', 
        filter: guestId ? createFilter('guest_id', guestId) : undefined,
      },
    ],
    onChange: handleChange,
    enabled: shouldEnable,
  });
}

/**
 * Hook for syncing trip details in real-time (for detail views)
 */
export function useTripDetailSync({
  tripId,
  resortId,
  enabled = true,
}: {
  tripId: string | undefined;
  resortId: string | undefined;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();

  const debouncedInvalidate = useDebouncedCallback(() => {
    if (tripId) {
      queryClient.invalidateQueries({ 
        queryKey: transportQueryKeys.tripStops(tripId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: transportQueryKeys.tripRequests(tripId) 
      });
    }
    if (resortId) {
      queryClient.invalidateQueries({ 
        queryKey: transportQueryKeys.trips(resortId) 
      });
    }
  }, 200);

  const handleChange = useCallback(() => {
    debouncedInvalidate();
  }, [debouncedInvalidate]);

  useRealtimeSubscription({
    channelKey: `trip-detail-${tripId || 'none'}`,
    tables: [
      { 
        table: 'buggy_trip_stops', 
        filter: tripId ? createFilter('trip_id', tripId) : undefined,
      },
      { 
        table: 'buggy_trip_requests', 
        filter: tripId ? createFilter('trip_id', tripId) : undefined,
      },
    ],
    onChange: handleChange,
    enabled: enabled && !!tripId,
  });
}
