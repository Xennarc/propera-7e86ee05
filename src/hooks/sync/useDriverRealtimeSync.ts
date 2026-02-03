import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRealtimeSubscription, createFilter, createResortFilter } from './useRealtimeSubscription';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { toast } from 'sonner';
import { useGuestRealtimeContext } from '@/contexts/GuestRealtimeContext';

// Debug flag for development
const DEBUG_REALTIME_DEPRECATION = false;

/**
 * Driver-side realtime sync for trip updates.
 * Subscribes to buggy_trips, buggy_trip_stops for assigned driver.
 */
export function useDriverRealtimeSync({
  driverId,
  resortId,
  tripId,
  enabled = true,
}: {
  driverId: string | undefined;
  resortId: string | undefined;
  tripId: string | undefined;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();

  // Debounce invalidation to prevent rapid-fire updates
  const debouncedInvalidate = useDebouncedCallback((keys: string[][]) => {
    keys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  }, 200);

  const handleChange = useCallback((payload: any) => {
    const table = payload.table;
    const keysToInvalidate: string[][] = [];

    switch (table) {
      case 'buggy_trips':
        // Invalidate driver trips list
        if (resortId && driverId) {
          keysToInvalidate.push(['driver-trips', resortId, driverId]);
        }
        break;

      case 'buggy_trip_stops':
        // Invalidate trip stops for current trip
        if (tripId) {
          keysToInvalidate.push(['trip-stops', tripId]);
        }
        // Also update driver trips (for progress)
        if (resortId && driverId) {
          keysToInvalidate.push(['driver-trips', resortId, driverId]);
        }
        break;

      case 'buggy_trip_requests':
        if (tripId) {
          keysToInvalidate.push(['trip-requests', tripId]);
        }
        break;

      // Phase 8: Transport events trigger trip data refresh
      case 'transport_events':
        if (resortId && driverId) {
          keysToInvalidate.push(['driver-trips', resortId, driverId]);
        }
        if (tripId) {
          keysToInvalidate.push(['trip-stops', tripId]);
          keysToInvalidate.push(['trip-requests', tripId]);
        }
        break;

      default:
        break;
    }

    if (keysToInvalidate.length > 0) {
      debouncedInvalidate(keysToInvalidate);
    }
  }, [resortId, driverId, tripId, debouncedInvalidate]);

  // Subscribe to trip-related tables
  useRealtimeSubscription({
    channelKey: `driver-realtime-${driverId || 'none'}-${tripId || 'none'}`,
    tables: [
      { 
        table: 'buggy_trips', 
        filter: resortId ? createResortFilter(resortId) : undefined,
      },
      { 
        table: 'buggy_trip_stops', 
        filter: tripId ? createFilter('trip_id', tripId) : undefined,
      },
      { 
        table: 'buggy_trip_requests', 
        filter: tripId ? createFilter('trip_id', tripId) : undefined,
      },
      // Phase 8: Include transport events for lifecycle updates
      { 
        table: 'transport_events', 
        filter: tripId ? createFilter('trip_id', tripId) : undefined,
      },
    ],
    onChange: handleChange,
    enabled: enabled && !!driverId,
  });
}

/**
 * Guest-side realtime sync for ride status updates.
 * Subscribes to buggy_requests filtered by guest_id.
 * Provides toast notifications on status changes.
 * 
 * NOTE: Skips legacy channel creation if unified realtime is active.
 * Toast logic is now handled by the unified hook when active.
 */
export function useGuestRideRealtimeSync({
  guestId,
  resortId,
  enabled = true,
}: {
  guestId: string | undefined;
  resortId?: string | undefined;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  
  // Check if unified realtime is active
  const unifiedContext = useGuestRealtimeContext();
  const skipLegacyChannel = unifiedContext?.unifiedActive ?? false;

  // Debounce invalidation
  const debouncedInvalidate = useDebouncedCallback(() => {
    if (guestId) {
      queryClient.invalidateQueries({ 
        queryKey: ['guest-buggy-requests', guestId] 
      });
    }
  }, 200);

  const handleChange = useCallback((payload: any) => {
    const eventType = payload.eventType;
    const newRecord = payload.new;
    const oldRecord = payload.old;
    
    // Only process changes for this guest
    const newGuestId = newRecord?.guest_id;
    const oldGuestId = oldRecord?.guest_id;
    
    if (newGuestId !== guestId && oldGuestId !== guestId) return;

    // Invalidate queries
    debouncedInvalidate();

    // Show toast notifications for status changes
    if (eventType === 'UPDATE' && newRecord?.status !== oldRecord?.status) {
      const newStatus = newRecord.status;
      
      switch (newStatus) {
        case 'assigned_to_trip':
          toast.success('Driver assigned to your ride!', {
            description: 'Your buggy is being prepared.',
          });
          break;
        case 'driver_en_route':
          toast.success('Driver is on the way!', {
            description: newRecord.eta_minutes 
              ? `ETA: ${newRecord.eta_minutes} minutes`
              : 'They will be there shortly.',
          });
          break;
        case 'arrived':
          toast.success('Your buggy has arrived!', {
            description: 'Please head to the pickup point.',
            duration: 10000, // Keep visible longer
          });
          break;
        case 'picked_up':
          toast.info('Enjoy your ride!');
          break;
        case 'completed':
          toast.success('Ride completed!', {
            description: 'Thank you for using our transport service.',
          });
          break;
        case 'cancelled':
          toast.info('Your ride was cancelled.');
          break;
        default:
          break;
      }
    }
  }, [guestId, debouncedInvalidate]);

  // Skip legacy channel if unified realtime is active
  const shouldEnable = enabled && !!guestId && !skipLegacyChannel;
  
  if (DEBUG_REALTIME_DEPRECATION && skipLegacyChannel && enabled && !!guestId) {
    console.debug('[useGuestRideRealtimeSync] Skipping legacy channel - unified realtime active');
  }

  // Subscribe to buggy_requests for this guest
  useRealtimeSubscription({
    channelKey: `guest-ride-realtime-${guestId || 'none'}`,
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
