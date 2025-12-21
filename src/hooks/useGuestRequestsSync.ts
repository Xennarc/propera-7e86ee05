import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { queryKeys } from '@/lib/query-keys';

interface UseGuestRequestsSyncOptions {
  guestId?: string;
  enabled?: boolean;
}

/**
 * Hook for real-time sync of guest requests between guest and staff portals.
 * Ensures requests created by guests appear immediately in staff queue.
 */
export function useGuestRequestsSync({ 
  guestId, 
  enabled = true 
}: UseGuestRequestsSyncOptions = {}) {
  const queryClient = useQueryClient();
  const { currentResort } = useResort();

  const handleRequestChange = useCallback((payload: any) => {
    const changedGuestId = payload.new?.guest_id || payload.old?.guest_id;
    const resortId = payload.new?.resort_id || payload.old?.resort_id || currentResort?.id;
    
    if (!resortId) return;

    // Invalidate staff request queue
    queryClient.invalidateQueries({ 
      queryKey: ['guest-requests', resortId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['staff-requests', resortId] 
    });

    // Invalidate guest-specific request list
    if (changedGuestId) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.requests.guest(resortId, changedGuestId) 
      });
    }

    // Invalidate pending approval counts
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.requests.pendingActivities(resortId) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.requests.pendingRestaurants(resortId) 
    });
  }, [queryClient, currentResort?.id]);

  useEffect(() => {
    if (!enabled || !currentResort?.id) return;

    // Build filter
    let filter = `resort_id=eq.${currentResort.id}`;
    if (guestId) {
      filter = `guest_id=eq.${guestId}`;
    }

    const channelName = `guest-requests-sync-${currentResort.id}${guestId ? `-${guestId}` : ''}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guest_requests',
          filter,
        },
        handleRequestChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, currentResort?.id, guestId, handleRequestChange]);
}

/**
 * Hook for staff-side real-time sync of pending approvals
 * (activity bookings and restaurant reservations with PENDING status)
 */
export function useStaffPendingApprovalsSync({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { currentResort } = useResort();

  const handleBookingChange = useCallback((payload: any) => {
    const status = payload.new?.status;
    const resortId = payload.new?.resort_id || payload.old?.resort_id || currentResort?.id;
    
    if (!resortId) return;

    // Invalidate pending requests
    queryClient.invalidateQueries({ 
      queryKey: ['pending-activity-requests', resortId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['pending-restaurant-requests', resortId] 
    });

    // If status changed, also invalidate the main request lists
    if (status) {
      queryClient.invalidateQueries({ 
        queryKey: ['guest-requests', resortId] 
      });
    }
  }, [queryClient, currentResort?.id]);

  const handleReservationChange = useCallback((payload: any) => {
    const status = payload.new?.status;
    const resortId = payload.new?.resort_id || payload.old?.resort_id || currentResort?.id;
    
    if (!resortId) return;

    // Invalidate pending requests
    queryClient.invalidateQueries({ 
      queryKey: ['pending-restaurant-requests', resortId] 
    });

    // If status changed, also invalidate the main request lists
    if (status) {
      queryClient.invalidateQueries({ 
        queryKey: ['guest-requests', resortId] 
      });
    }
  }, [queryClient, currentResort?.id]);

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
