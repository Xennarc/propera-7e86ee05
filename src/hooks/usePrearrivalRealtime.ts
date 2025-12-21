import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';

interface UsePrearrivalRealtimeOptions {
  guestId?: string;
  enabled?: boolean;
}

/**
 * Hook to subscribe to real-time updates for prearrival_profiles
 * Automatically invalidates relevant queries when data changes
 */
export function usePrearrivalRealtime({ guestId, enabled = true }: UsePrearrivalRealtimeOptions = {}) {
  const queryClient = useQueryClient();
  const { currentResort } = useResort();

  const handleProfileChange = useCallback((payload: any) => {
    const changedGuestId = payload.new?.guest_id || payload.old?.guest_id;
    
    // Invalidate specific guest's prearrival data
    if (changedGuestId) {
      queryClient.invalidateQueries({ 
        queryKey: ['staff-prearrival-data', changedGuestId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['prearrival-data', changedGuestId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['prearrival-history', changedGuestId] 
      });
    }
    
    // Also invalidate the statuses list for guest lists
    if (currentResort?.id) {
      queryClient.invalidateQueries({ 
        queryKey: ['prearrival-statuses', currentResort.id] 
      });
    }
  }, [queryClient, currentResort?.id]);

  const handleEventChange = useCallback((payload: any) => {
    const changedGuestId = payload.new?.guest_id;
    
    // Invalidate history for the specific guest
    if (changedGuestId) {
      queryClient.invalidateQueries({ 
        queryKey: ['prearrival-history', changedGuestId] 
      });
    }
  }, [queryClient]);

  useEffect(() => {
    if (!enabled || !currentResort?.id) return;

    // Create channel for prearrival_profiles changes
    const channel = supabase
      .channel(`prearrival-realtime-${currentResort.id}${guestId ? `-${guestId}` : ''}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prearrival_profiles',
          filter: guestId 
            ? `guest_id=eq.${guestId}` 
            : `resort_id=eq.${currentResort.id}`,
        },
        handleProfileChange
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'guest_profile_events',
          filter: guestId 
            ? `guest_id=eq.${guestId}` 
            : `resort_id=eq.${currentResort.id}`,
        },
        handleEventChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, currentResort?.id, guestId, handleProfileChange, handleEventChange]);
}

/**
 * Hook to subscribe to prearrival updates for the guest list page
 * Provides refetch on focus + realtime updates
 */
export function usePrearrivalListRealtime() {
  const queryClient = useQueryClient();
  const { currentResort } = useResort();

  // Refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      if (currentResort?.id) {
        queryClient.invalidateQueries({ 
          queryKey: ['prearrival-statuses', currentResort.id] 
        });
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [queryClient, currentResort?.id]);

  // Real-time subscription
  usePrearrivalRealtime({ enabled: !!currentResort?.id });
}
