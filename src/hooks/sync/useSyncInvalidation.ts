import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

/**
 * Central hook for invalidating related query keys after mutations.
 * Provides domain-specific invalidation methods.
 */
export function useSyncInvalidation() {
  const queryClient = useQueryClient();

  /**
   * Invalidate all dining-related queries for a resort
   */
  const invalidateDining = useCallback((resortId: string, options?: {
    slotId?: string;
    guestId?: string;
    date?: string;
    roomNumber?: string;
  }) => {
    const { slotId, guestId, date, roomNumber } = options || {};

    // Always invalidate general dining queries
    queryClient.invalidateQueries({ 
      queryKey: ['dining-slots', resortId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['guest-available-slots'] 
    });
    queryClient.invalidateQueries({
      queryKey: ['restaurants', resortId]
    });

    // Specific slot
    if (slotId) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.dining.slotAvailability(resortId, slotId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.dining.staffSlotDetail(slotId) 
      });
    }

    // Specific guest
    if (guestId) {
      queryClient.invalidateQueries({ 
        queryKey: ['dining-bookings', resortId, guestId] 
      });
    }

    // Room bookings
    if (roomNumber) {
      queryClient.invalidateQueries({ 
        queryKey: ['guest-room-bookings', resortId, roomNumber] 
      });
    }

    // General room bookings (fuzzy match)
    queryClient.invalidateQueries({ 
      queryKey: ['guest-room-bookings'] 
    });
  }, [queryClient]);

  /**
   * Invalidate all activity-related queries for a resort
   */
  const invalidateActivities = useCallback((resortId: string, options?: {
    sessionId?: string;
    guestId?: string;
  }) => {
    const { sessionId, guestId } = options || {};

    // General activity queries
    queryClient.invalidateQueries({ 
      queryKey: ['activity-sessions', resortId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['guest-available-sessions'] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['guest-all-sessions'] 
    });

    // Specific session
    if (sessionId) {
      queryClient.invalidateQueries({ 
        queryKey: ['activity-session', sessionId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['session-bookings', sessionId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['session-waitlist', sessionId] 
      });
    }

    // Specific guest
    if (guestId) {
      queryClient.invalidateQueries({ 
        queryKey: ['guest-bookings', guestId] 
      });
    }

    // Room bookings (includes activities)
    queryClient.invalidateQueries({ 
      queryKey: ['guest-room-bookings'] 
    });
  }, [queryClient]);

  /**
   * Invalidate pre-arrival related queries
   */
  const invalidatePrearrival = useCallback((resortId: string, guestId?: string) => {
    // Resort-wide pre-arrival statuses
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.prearrival.statuses(resortId) 
    });

    if (guestId) {
      // Guest-specific queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.prearrival.profile(resortId, guestId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.prearrival.staffData(guestId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.prearrival.guestData(guestId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.prearrival.history(guestId) 
      });
    }
  }, [queryClient]);

  /**
   * Invalidate guest request related queries
   */
  const invalidateRequests = useCallback((resortId: string, guestId?: string) => {
    // Staff request queue
    queryClient.invalidateQueries({ 
      queryKey: ['guest-requests', resortId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: ['staff-requests', resortId] 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.requests.pendingActivities(resortId) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.requests.pendingRestaurants(resortId) 
    });

    if (guestId) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.requests.guest(resortId, guestId) 
      });
    }
  }, [queryClient]);

  /**
   * Invalidate guest list and detail queries
   */
  const invalidateGuests = useCallback((resortId: string, guestId?: string) => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.guests.list(resortId) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.guests.arrivals(resortId) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.guests.inHouse(resortId) 
    });

    if (guestId) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.guests.detail(resortId, guestId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['guest', guestId] // Legacy key support
      });
    }
  }, [queryClient]);

  /**
   * Invalidate transport-related queries
   */
  const invalidateTransport = useCallback((resortId: string, options?: {
    tripId?: string;
    guestId?: string;
  }) => {
    const { tripId, guestId } = options || {};

    // Always invalidate queue and trips
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.transport.queue(resortId) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.transport.trips(resortId) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.transport.buggies(resortId) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.transport.drivers(resortId) 
    });

    // Specific trip
    if (tripId) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.transport.tripStops(tripId) 
      });
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.transport.tripRequests(tripId) 
      });
    }

    // Guest's requests
    if (guestId) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.transport.guestRequests(guestId) 
      });
    }
  }, [queryClient]);

  return {
    invalidateDining,
    invalidateActivities,
    invalidatePrearrival,
    invalidateRequests,
    invalidateGuests,
    invalidateTransport,
    queryClient,
  };
}
