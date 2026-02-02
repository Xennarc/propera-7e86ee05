import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useSyncInvalidation } from '@/hooks/sync/useSyncInvalidation';
import { useGuestRealtimeContext } from '@/contexts/GuestRealtimeContext';

// Debug flag for development
const DEBUG_REALTIME_DEPRECATION = false;

interface UseDiningBookingSyncOptions {
  slotId?: string;
  guestId?: string;
  resortId?: string; // Allow passing resortId directly for guest portal
  enabled?: boolean;
}

/**
 * Hook for real-time sync of restaurant reservations between guest and staff portals.
 * Mirrors the activity booking sync pattern.
 * 
 * NOTE: For guest portal usage, skips legacy channel if unified realtime is active.
 */
export function useDiningBookingSync({ 
  slotId, 
  guestId,
  resortId: providedResortId,
  enabled = true 
}: UseDiningBookingSyncOptions = {}) {
  const queryClient = useQueryClient();
  const { currentResort } = useResort();
  const { invalidateDining } = useSyncInvalidation();
  
  // Check if unified realtime is active (only applicable when guestId is provided)
  const unifiedContext = useGuestRealtimeContext();
  const isGuestContext = !!guestId;
  const skipLegacyChannel = isGuestContext && (unifiedContext?.unifiedActive ?? false);
  
  // Use provided resortId (for guests) or currentResort.id (for staff)
  const resortId = providedResortId || currentResort?.id;

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
    if (!enabled || !resortId) return;
    
    // Skip legacy channel if unified realtime is active for guest context
    if (skipLegacyChannel) {
      if (DEBUG_REALTIME_DEPRECATION) {
        console.debug('[useDiningBookingSync] Skipping legacy channel - unified realtime active');
      }
      return;
    }

    // Build filter based on provided options
    let filter = `resort_id=eq.${resortId}`;
    if (slotId) {
      filter = `restaurant_slot_id=eq.${slotId}`;
    } else if (guestId) {
      filter = `guest_id=eq.${guestId}`;
    }

    const channelName = `dining-reservations-sync-${resortId}${slotId ? `-${slotId}` : ''}${guestId ? `-${guestId}` : ''}`;

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
  }, [enabled, resortId, slotId, guestId, handleReservationChange, skipLegacyChannel]);
}

/**
 * Hook for real-time sync of restaurant time slots (capacity changes, status changes)
 * 
 * NOTE: For guest portal usage, skips legacy channel if unified realtime is active.
 */
export function useDiningSlotSync({ 
  resortId: providedResortId,
  guestId,
  enabled = true 
}: { resortId?: string; guestId?: string; enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { currentResort } = useResort();
  
  // Check if unified realtime is active (only applicable when guestId is provided)
  const unifiedContext = useGuestRealtimeContext();
  const isGuestContext = !!guestId;
  const skipLegacyChannel = isGuestContext && (unifiedContext?.unifiedActive ?? false);
  
  // Use provided resortId (for guests) or currentResort.id (for staff)
  const resortId = providedResortId || currentResort?.id;

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
    if (!enabled || !resortId) return;
    
    // Skip legacy channel if unified realtime is active for guest context
    if (skipLegacyChannel) {
      if (DEBUG_REALTIME_DEPRECATION) {
        console.debug('[useDiningSlotSync] Skipping legacy channel - unified realtime active');
      }
      return;
    }

    const channel = supabase
      .channel(`dining-slots-sync-${resortId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'restaurant_time_slots',
          filter: `resort_id=eq.${resortId}`,
        },
        handleSlotChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, resortId, handleSlotChange, skipLegacyChannel]);
}

/**
 * Compound hook for guest portal - listens to both reservation and slot changes
 */
export function useGuestDiningSync(guestId: string | undefined, resortId?: string) {
  const enabled = !!guestId && !!resortId;
  
  useDiningBookingSync({ guestId, resortId, enabled });
  useDiningSlotSync({ resortId, guestId, enabled });
}

/**
 * Compound hook for staff slot detail page
 */
export function useStaffDiningSlotSync(slotId: string | undefined) {
  const enabled = !!slotId;
  
  useDiningBookingSync({ slotId, enabled });
  useDiningSlotSync({ enabled });
}
