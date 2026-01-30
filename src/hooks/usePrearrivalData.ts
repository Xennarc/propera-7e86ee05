import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { toStringArray } from '@/lib/safe-array';
import { nowInTimezone } from '@/lib/timezone-utils';
import { startOfDay, differenceInDays, differenceInHours, parseISO } from 'date-fns';

export interface PrearrivalProfile {
  id: string;
  arrival_date: string | null;
  arrival_time: string | null;
  arrival_flight_number: string | null;
  transfer_preference: string | null;
  dietary_preferences: string[];
  allergies: string | null;
  room_preferences: Record<string, unknown>;
  water_comfort_level: string | null;
  special_occasions: string[];
  special_requests: string | null;
  custom_answers_json: Record<string, unknown>;
  prearrival_status: 'not_started' | 'partial' | 'completed';
}

export interface PrearrivalSettings {
  is_enabled: boolean;
  allow_activity_bookings: boolean;
  allow_dining_bookings: boolean;
  allow_spa_bookings: boolean;
  show_arrival_details: boolean;
  show_preferences: boolean;
  show_special_occasions: boolean;
  custom_questions_json: Array<{
    id: string;
    question: string;
    type: 'text' | 'select' | 'multiselect';
    options?: string[];
    required?: boolean;
  }>;
  welcome_message: string | null;
}

export const DEFAULT_PREARRIVAL_SETTINGS: PrearrivalSettings = {
  is_enabled: false,
  allow_activity_bookings: false,
  allow_dining_bookings: false,
  allow_spa_bookings: false,
  show_arrival_details: true,
  show_preferences: true,
  show_special_occasions: true,
  custom_questions_json: [],
  welcome_message: null,
};

export interface PrearrivalData {
  success: boolean;
  guest: {
    id: string;
    full_name: string;
    room_number: string;
    check_in_date: string;
    check_out_date: string;
  };
  profile: PrearrivalProfile | null;
  settings: PrearrivalSettings;
}

export function usePrearrivalData() {
  const { guest } = useGuestAuth();

  const query = useQuery({
    queryKey: ['prearrival-data', guest?.guestId],
    queryFn: async (): Promise<PrearrivalData | null> => {
      if (!guest) return null;
      
      const { data, error } = await supabase.rpc('guest_get_prearrival_data', {
        p_guest_id: guest.guestId,
      });

      if (error) {
        console.error('Error fetching prearrival data:', error);
        throw error;
      }

      // Normalize array fields to prevent .map() crashes
      const result = data as unknown as PrearrivalData;
      if (result?.profile) {
        result.profile.dietary_preferences = toStringArray(result.profile.dietary_preferences);
        result.profile.special_occasions = toStringArray(result.profile.special_occasions);
      }

      return result;
    },
    enabled: !!guest,
    staleTime: 60000, // 1 minute
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useUpdatePrearrivalProfile() {
  const { guest } = useGuestAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<{
      arrival_date: string;
      arrival_time: string;
      arrival_flight_number: string;
      transfer_preference: string;
      dietary_preferences: string[];
      allergies: string;
      room_preferences: Record<string, unknown>;
      water_comfort_level: string;
      special_occasions: string[];
      special_requests: string;
      custom_answers_json: Record<string, unknown>;
    }>) => {
      if (!guest) throw new Error('Not authenticated');

      // 1. Call existing RPC for legacy prearrival_profiles (unchanged)
      const { data, error } = await supabase.rpc('guest_update_prearrival_profile', {
        p_guest_id: guest.guestId,
        p_arrival_date: updates.arrival_date || null,
        p_arrival_time: updates.arrival_time || null,
        p_arrival_flight_number: updates.arrival_flight_number || null,
        p_transfer_preference: updates.transfer_preference || null,
        p_dietary_preferences: updates.dietary_preferences ? JSON.stringify(updates.dietary_preferences) : null,
        p_allergies: updates.allergies || null,
        p_room_preferences: updates.room_preferences ? JSON.stringify(updates.room_preferences) : null,
        p_water_comfort_level: updates.water_comfort_level || null,
        p_special_occasions: updates.special_occasions ? JSON.stringify(updates.special_occasions) : null,
        p_special_requests: updates.special_requests || null,
        p_custom_answers_json: updates.custom_answers_json ? JSON.stringify(updates.custom_answers_json) : null,
      });

      if (error) throw error;

      // 2. DUAL-WRITE: If guest has a stayId, also update pre_arrival_submissions
      if (guest.stayId) {
        const payload = {
          arrival_time: updates.arrival_time || null,
          arrival_flight_number: updates.arrival_flight_number || null,
          transfer_preference: updates.transfer_preference || null,
          dietary_preferences: updates.dietary_preferences || [],
          allergies: updates.allergies || null,
          room_preferences: (updates.room_preferences || {}) as Record<string, string | number | boolean | null>,
          water_comfort_level: updates.water_comfort_level || null,
          special_occasions: updates.special_occasions || [],
          special_requests: updates.special_requests || null,
          custom_answers_json: (updates.custom_answers_json || {}) as Record<string, string | number | boolean | null>,
        };

        // Upsert to pre_arrival_submissions via new RPC
        const { error: submissionError } = await supabase.rpc('guest_upsert_prearrival_submission', {
          p_stay_id: guest.stayId,
          p_payload: JSON.stringify(payload),
          p_mark_completed: true,
        });

        if (submissionError) {
          console.error('Dual-write to pre_arrival_submissions failed:', submissionError);
          // Don't throw - the primary write succeeded
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prearrival-data'] });
      queryClient.invalidateQueries({ queryKey: ['active-stay'] });
      queryClient.invalidateQueries({ queryKey: ['staff-guest-stay'] });
    },
  });
}

export function useIsPrearrivalGuest(): { isPrearrival: boolean; daysUntilArrival: number; hoursUntilArrival: number } {
  const { guest } = useGuestAuth();
  
  // Memoize to prevent recalculation on every render and stabilize the value
  return useMemo(() => {
    if (!guest) {
      return { isPrearrival: false, daysUntilArrival: 0, hoursUntilArrival: 0 };
    }

    try {
      // Get current time in the resort's timezone (not browser timezone)
      const resortTimezone = guest.resortTimezone || 'UTC';
      const nowLocal = nowInTimezone(resortTimezone);
      const todayStart = startOfDay(nowLocal);
      
      // Parse check-in date as start of day (stored as YYYY-MM-DD)
      const checkInDate = startOfDay(parseISO(guest.checkInDate));

      // Calculate hours until check-in day starts
      const hoursUntilArrival = differenceInHours(checkInDate, nowLocal);
      
      // Calculate days for UI display purposes
      const daysUntilArrival = differenceInDays(checkInDate, todayStart);

      // Switch to in-house view 12 hours before check-in day
      // e.g., if check-in is Jan 15, guest sees in-house view from Jan 14 at 12:00 PM
      const isPrearrival = hoursUntilArrival > 12;

      return {
        isPrearrival,
        daysUntilArrival: Math.max(0, daysUntilArrival),
        hoursUntilArrival: Math.max(0, hoursUntilArrival),
      };
    } catch (error) {
      console.error('Error calculating pre-arrival status:', error);
      // Fail safe: treat as in-house guest if date parsing fails
      return { isPrearrival: false, daysUntilArrival: 0, hoursUntilArrival: 0 };
    }
  }, [guest?.checkInDate, guest?.resortTimezone, guest?.guestId]);
}
