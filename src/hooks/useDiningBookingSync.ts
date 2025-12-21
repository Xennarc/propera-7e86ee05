import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useSyncInvalidation } from '@/hooks/sync/useSyncInvalidation';

interface UseDiningBookingSyncOptions {
  slotId?: string;
  guestId?: string;
  enabled?: boolean;
}

/**
 * Hook for real-time sync of restaurant reservations between guest and staff portals.
 * Mirrors the activity booking sync pattern.
 */
export function useDiningBookingSync({ 
  slotId, 
  guestId, 
  enabled = true 
}: UseDiningBookingSyncOptions = {}) {
  const queryClient = useQueryClient();
  const { currentResort } = useResort();
  const { invalidateDining } = useSyncInvalidation();

  const handleReservationChange = useCallback((payload: any) => {
    const changedSlotId = payload.new?.restaurant_slot_id || payload.old?.restaurant_slot_id;
    const changedGuestId = payload.new?.guest_id || payload.old?.guest_id;
    const resortId = payload.new?.resort_id || payload.old?.resort_id || currentResort?.id;
    
    if (!resortId) return;

    // Invalidate slot-specific queries
    if (changedSlotId) {
      queryClient.invalidateQueries({ 
        queryKey: ['dining-slot-detail', changedSlotId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dining-slot-availability', resortId, changedSlotId] 
      });
    }

    // Invalidate guest-specific queries
    if (changedGuestId) {
      queryClient.invalidateQueries({ 
        queryKey: ['dining-bookings', resortId, changedGuestId] 
      });
    }

    // Invalidate general dining queries
    queryClient.invalidateQueries({ 
      queryKey: ['guest-available-slots'] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['guest-room-bookings'] 
    });
    
    // Staff dining slot lists
    if (resortId) {
      queryClient.invalidateQueries({ 
        queryKey: ['dining-slots', resortId] 
      });
    }

    // Also invalidate pending restaurant requests (for staff queue)
    queryClient.invalidateQueries({ 
      queryKey: ['pending-restaurant-requests', resortId] 
    });
  }, [queryClient, currentResort?.id]);

  useEffect(() => {
    if (!enabled || !currentResort?.id) return;

    // Build filter based on provided options
    let filter = `resort_id=eq.${currentResort.id}`;
    if (slotId) {
      filter = `restaurant_slot_id=eq.${slotId}`;
    } else if (guestId) {
      filter = `guest_id=eq.${guestId}`;
    }

    const channelName = `dining-reservations-sync-${currentResort.id}${slotId ? `-${slotId}` : ''}${guestId ? `-${guestId}` : ''}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_reservations',
          filter,
        },
        handleReservationChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, currentResort?.id, slotId, guestId, handleReservationChange]);
}

/**
 * Hook for real-time sync of restaurant time slots (capacity changes, status changes)
 */
export function useDiningSlotSync({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { currentResort } = useResort();

  const handleSlotChange = useCallback((payload: any) => {
    const changedSlotId = payload.new?.id || payload.old?.id;
    const resortId = payload.new?.resort_id || payload.old?.resort_id || currentResort?.id;
    
    // Invalidate slot-specific queries
    if (changedSlotId) {
      queryClient.invalidateQueries({ 
        queryKey: ['dining-slot-detail', changedSlotId] 
      });
      if (resortId) {
        queryClient.invalidateQueries({ 
          queryKey: ['dining-slot-availability', resortId, changedSlotId] 
        });
      }
    }

    // Invalidate general slot lists
    queryClient.invalidateQueries({ 
      queryKey: ['guest-available-slots'] 
    });
    
    // Staff dining slot lists
    if (resortId) {
      queryClient.invalidateQueries({ 
        queryKey: ['dining-slots', resortId] 
      });
    }
  }, [queryClient, currentResort?.id]);

  useEffect(() => {
    if (!enabled || !currentResort?.id) return;

    const channel = supabase
      .channel(`dining-slots-sync-${currentResort.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_time_slots',
          filter: `resort_id=eq.${currentResort.id}`,
        },
        handleSlotChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, currentResort?.id, handleSlotChange]);
}

/**
 * Compound hook for guest portal - listens to both reservation and slot changes
 */
export function useGuestDiningSync(guestId: string | undefined) {
  const enabled = !!guestId;
  
  useDiningBookingSync({ guestId, enabled });
  useDiningSlotSync({ enabled });
}

/**
 * Compound hook for staff slot detail page
 */
export function useStaffDiningSlotSync(slotId: string | undefined) {
  const enabled = !!slotId;
  
  useDiningBookingSync({ slotId, enabled });
  useDiningSlotSync({ enabled });
}
