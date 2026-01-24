import { useQuery } from '@tanstack/react-query';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface ActiveStay {
  id: string;
  status: 'pre_arrival' | 'in_house' | 'checked_out';
  arrivalDate: string;
  departureDate: string;
  roomNumber: string | null;
}

/**
 * Hook to resolve the active stay for the current guest.
 * 
 * Resolution priority:
 * 1. If session has stayId, fetch that specific stay
 * 2. Otherwise, query guest_stays for the guest ordered by priority:
 *    - status = 'in_house' (highest)
 *    - status = 'pre_arrival' (second)
 *    - Next upcoming stay by arrival_date
 */
export function useActiveStay() {
  const { guest } = useGuestAuth();

  const { data: activeStay, isLoading } = useQuery({
    queryKey: ['active-stay', guest?.guestId, guest?.stayId],
    queryFn: async () => {
      if (!guest) return null;

      // If session has a stayId, fetch that specific stay
      if (guest.stayId) {
        const { data, error } = await supabase
          .from('guest_stays')
          .select('id, status, arrival_date, departure_date, room_number')
          .eq('id', guest.stayId)
          .single();

        if (error || !data) {
          console.error('Failed to fetch stay by ID:', error);
          return null;
        }

        return {
          id: data.id,
          status: data.status as ActiveStay['status'],
          arrivalDate: data.arrival_date,
          departureDate: data.departure_date,
          roomNumber: data.room_number,
        };
      }

      // Otherwise, find the best matching stay for this guest
      // Priority: in_house > pre_arrival > next upcoming
      const today = new Date().toISOString().split('T')[0];

      // First try to find an in_house stay
      const { data: inHouseStay } = await supabase
        .from('guest_stays')
        .select('id, status, arrival_date, departure_date, room_number')
        .eq('guest_id', guest.guestId)
        .eq('resort_id', guest.resortId)
        .eq('status', 'in_house')
        .limit(1)
        .single();

      if (inHouseStay) {
        return {
          id: inHouseStay.id,
          status: inHouseStay.status as ActiveStay['status'],
          arrivalDate: inHouseStay.arrival_date,
          departureDate: inHouseStay.departure_date,
          roomNumber: inHouseStay.room_number,
        };
      }

      // Then try to find a pre_arrival stay
      const { data: preArrivalStay } = await supabase
        .from('guest_stays')
        .select('id, status, arrival_date, departure_date, room_number')
        .eq('guest_id', guest.guestId)
        .eq('resort_id', guest.resortId)
        .eq('status', 'pre_arrival')
        .gte('arrival_date', today)
        .order('arrival_date', { ascending: true })
        .limit(1)
        .single();

      if (preArrivalStay) {
        return {
          id: preArrivalStay.id,
          status: preArrivalStay.status as ActiveStay['status'],
          arrivalDate: preArrivalStay.arrival_date,
          departureDate: preArrivalStay.departure_date,
          roomNumber: preArrivalStay.room_number,
        };
      }

      // Finally, find the next upcoming stay regardless of status
      const { data: upcomingStay } = await supabase
        .from('guest_stays')
        .select('id, status, arrival_date, departure_date, room_number')
        .eq('guest_id', guest.guestId)
        .eq('resort_id', guest.resortId)
        .gte('arrival_date', today)
        .order('arrival_date', { ascending: true })
        .limit(1)
        .single();

      if (upcomingStay) {
        return {
          id: upcomingStay.id,
          status: upcomingStay.status as ActiveStay['status'],
          arrivalDate: upcomingStay.arrival_date,
          departureDate: upcomingStay.departure_date,
          roomNumber: upcomingStay.room_number,
        };
      }

      return null;
    },
    enabled: !!guest,
    staleTime: 60000, // Cache for 60 seconds
  });

  return {
    activeStay: activeStay ?? null,
    isLoading,
  };
}
