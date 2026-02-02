import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { queryKeys } from '@/lib/query-keys';
import { useDebouncedCallback } from './useDebouncedCallback';
import { useGuestRealtimeContext } from '@/contexts/GuestRealtimeContext';

// Debug flag for development
const DEBUG_REALTIME_DEPRECATION = false;

// Debounce delay for realtime invalidations (prevents refetch storms)
const REALTIME_DEBOUNCE_MS = 500;

interface UseGuestRequestsSyncOptions {
  guestId?: string;
  enabled?: boolean;
}

/**
 * Hook for real-time sync of guest requests between guest and staff portals.
 * Subscribes to `service_requests` table (the active table).
 * 
 * NOTE: For guest portal usage (when guestId is provided), 
 * skips legacy channel if unified realtime is active.
 */
export function useGuestRequestsSync({ 
  guestId, 
  enabled = true 
}: UseGuestRequestsSyncOptions = {}) {
  const queryClient = useQueryClient();
  const { currentResort } = useResort();
  
  // Check if unified realtime is active (only applicable when guestId is provided)
  const unifiedContext = useGuestRealtimeContext();
  const isGuestContext = !!guestId;
  const skipLegacyChannel = isGuestContext && (unifiedContext?.unifiedActive ?? false);

  // Debounced invalidation to prevent rapid refetches
  const invalidateQueries = useDebouncedCallback((queryKey: unknown[]) => {
    queryClient.invalidateQueries({ queryKey });
  }, REALTIME_DEBOUNCE_MS);

  const handleRequestChange = useCallback((payload: any) => {
    const changedGuestId = payload.new?.guest_id || payload.old?.guest_id;
    const resortId = payload.new?.resort_id || payload.old?.resort_id || currentResort?.id;
    
    if (!resortId) return;

    // Invalidate staff dashboard queries
    invalidateQueries(['requests-dashboard', resortId]);
    
    // Invalidate legacy query keys for backwards compatibility
    invalidateQueries(['staff-requests', resortId]);

    // Invalidate guest-specific request list
    if (changedGuestId) {
      invalidateQueries(['guest-service-requests', resortId, changedGuestId]);
      invalidateQueries(queryKeys.requests.guest(resortId, changedGuestId));
    }

    // Invalidate pending approval counts
    invalidateQueries(queryKeys.requests.pendingActivities(resortId));
    invalidateQueries(queryKeys.requests.pendingRestaurants(resortId));
  }, [invalidateQueries, currentResort?.id]);

  useEffect(() => {
    if (!enabled || !currentResort?.id) return;
    
    // Skip legacy channel if unified realtime is active for guest context
    if (skipLegacyChannel) {
      if (DEBUG_REALTIME_DEPRECATION) {
        console.debug('[useGuestRequestsSync] Skipping legacy channel - unified realtime active');
      }
      return;
    }

    // Build filter - use resort_id for staff, guest_id for guest-specific
    let filter = `resort_id=eq.${currentResort.id}`;
    if (guestId) {
      filter = `guest_id=eq.${guestId}`;
    }

    const channelName = `service-requests-sync-${currentResort.id}${guestId ? `-${guestId}` : ''}`;

    // Subscribe to service_requests table (the ACTIVE table with data)
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'service_requests', // Fixed: was 'guest_requests' (empty legacy table)
          filter,
        },
        handleRequestChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, currentResort?.id, guestId, handleRequestChange, skipLegacyChannel]);
}

/**
 * Hook for staff-side real-time sync of pending approvals
 * (activity bookings and restaurant reservations with PENDING status)
 */
export function useStaffPendingApprovalsSync({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { currentResort } = useResort();

  // Debounced invalidation
  const invalidateQueries = useDebouncedCallback((queryKey: string[]) => {
    queryClient.invalidateQueries({ queryKey });
  }, REALTIME_DEBOUNCE_MS);

  const handleBookingChange = useCallback((payload: any) => {
    const status = payload.new?.status;
    const resortId = payload.new?.resort_id || payload.old?.resort_id || currentResort?.id;
    
    if (!resortId) return;

    // Debounced invalidations
    invalidateQueries(['pending-activity-requests', resortId]);
    invalidateQueries(['pending-restaurant-requests', resortId]);

    // If status changed, also invalidate the main request lists
    if (status) {
      invalidateQueries(['guest-requests', resortId]);
    }
  }, [invalidateQueries, currentResort?.id]);

  const handleReservationChange = useCallback((payload: any) => {
    const status = payload.new?.status;
    const resortId = payload.new?.resort_id || payload.old?.resort_id || currentResort?.id;
    
    if (!resortId) return;

    // Debounced invalidations
    invalidateQueries(['pending-restaurant-requests', resortId]);

    // If status changed, also invalidate the main request lists
    if (status) {
      invalidateQueries(['guest-requests', resortId]);
    }
  }, [invalidateQueries, currentResort?.id]);

  useEffect(() => {
    if (!enabled || !currentResort?.id) return;

    const channel = supabase
      .channel(`staff-pending-approvals-${currentResort.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_bookings',
          filter: `resort_id=eq.${currentResort.id}`,
        },
        handleBookingChange
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_reservations',
          filter: `resort_id=eq.${currentResort.id}`,
        },
        handleReservationChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, currentResort?.id, handleBookingChange, handleReservationChange]);
}

/**
 * Combined hook for the Guest Requests page
 */
export function useStaffRequestsPageSync() {
  useGuestRequestsSync({ enabled: true });
  useStaffPendingApprovalsSync({ enabled: true });
}
