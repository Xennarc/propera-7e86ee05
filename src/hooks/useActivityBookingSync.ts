import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';

interface UseActivityBookingSyncOptions {
  sessionId?: string;
  guestId?: string;
  enabled?: boolean;
}

/**
 * Hook for real-time sync of activity bookings between guest and staff portals.
 * Invalidates relevant queries when bookings change.
 */
export function useActivityBookingSync({ 
  sessionId, 
  guestId, 
  enabled = true 
}: UseActivityBookingSyncOptions = {}) {
  const queryClient = useQueryClient();
  const { currentResort } = useResort();

  const handleBookingChange = useCallback((payload: any) => {
    const changedSessionId = payload.new?.session_id || payload.old?.session_id;
    const changedGuestId = payload.new?.guest_id || payload.old?.guest_id;
    
    // Invalidate session-specific queries
    if (changedSessionId) {
      // Staff session detail queries
      queryClient.invalidateQueries({ 
        queryKey: ['activity-session', changedSessionId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['session-bookings', changedSessionId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['session-waitlist', changedSessionId] 
      });
    }

    // Invalidate guest-specific queries
    if (changedGuestId) {
      queryClient.invalidateQueries({ 
        queryKey: ['guest-bookings', changedGuestId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['guest-room-bookings'] 
      });
    }

    // Invalidate general session lists
    queryClient.invalidateQueries({ 
      queryKey: ['guest-available-sessions'] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['guest-all-sessions'] 
    });
    
    // Staff activity sessions list
    if (currentResort?.id) {
      queryClient.invalidateQueries({ 
        queryKey: ['activity-sessions', currentResort.id] 
      });
    }
  }, [queryClient, currentResort?.id]);

  useEffect(() => {
    if (!enabled || !currentResort?.id) return;

    // Build filter based on provided options
    let filter = `resort_id=eq.${currentResort.id}`;
    if (sessionId) {
      filter = `session_id=eq.${sessionId}`;
    } else if (guestId) {
      filter = `guest_id=eq.${guestId}`;
    }

    const channelName = `activity-bookings-sync-${currentResort.id}${sessionId ? `-${sessionId}` : ''}${guestId ? `-${guestId}` : ''}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_bookings',
          filter,
        },
        handleBookingChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, currentResort?.id, sessionId, guestId, handleBookingChange]);
}

/**
 * Hook for real-time sync of activity sessions (capacity changes, status changes)
 */
export function useActivitySessionSync({ enabled = true }: { enabled?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { currentResort } = useResort();

  const handleSessionChange = useCallback((payload: any) => {
    const changedSessionId = payload.new?.id || payload.old?.id;
    
    // Invalidate session-specific queries
    if (changedSessionId) {
      queryClient.invalidateQueries({ 
        queryKey: ['activity-session', changedSessionId] 
      });
    }

    // Invalidate general session lists
    queryClient.invalidateQueries({ 
      queryKey: ['guest-available-sessions'] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['guest-all-sessions'] 
    });
    
    // Staff activity sessions list
    if (currentResort?.id) {
      queryClient.invalidateQueries({ 
        queryKey: ['activity-sessions', currentResort.id] 
      });
    }
  }, [queryClient, currentResort?.id]);

  useEffect(() => {
    if (!enabled || !currentResort?.id) return;

    const channel = supabase
      .channel(`activity-sessions-sync-${currentResort.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_sessions',
          filter: `resort_id=eq.${currentResort.id}`,
        },
        handleSessionChange
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, currentResort?.id, handleSessionChange]);
}

/**
 * Compound hook for guest portal - listens to both booking and session changes
 */
export function useGuestActivitySync(guestId: string | undefined) {
  const enabled = !!guestId;
  
  useActivityBookingSync({ guestId, enabled });
  useActivitySessionSync({ enabled });
}

/**
 * Compound hook for staff session detail page
 */
export function useStaffSessionSync(sessionId: string | undefined) {
  const enabled = !!sessionId;
  
  useActivityBookingSync({ sessionId, enabled });
  useActivitySessionSync({ enabled });
}
