/**
 * useActivityBookingReadiness – CRUD hooks for the activity_booking_readiness table.
 *
 * This replaces the legacy booking_readiness hook for the new status-based model.
 * Status values: 'unknown' | 'complete' | 'missing' | 'uploaded' | 'not_required' | 'review'
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type ReadinessStatusValue =
  | 'unknown'
  | 'complete'
  | 'missing'
  | 'uploaded'
  | 'not_required'
  | 'review';

export interface ActivityBookingReadiness {
  id: string;
  resort_id: string;
  booking_id: string;
  guest_id: string;
  session_id: string;
  waiver_status: ReadinessStatusValue;
  medical_status: ReadinessStatusValue;
  cert_status: ReadinessStatusValue;
  gear_status: ReadinessStatusValue;
  gear_json: Record<string, unknown> | null;
  cert_media_path: string | null;
  updated_at: string;
  created_at: string;
}

// ── Query keys ──────────────────────────────────────────────────

export const abrKeys = {
  byBooking: (bookingId: string) => ['activity-booking-readiness', bookingId] as const,
  bySession: (sessionId: string) => ['activity-booking-readiness-session', sessionId] as const,
};

// ── Single readiness by booking ─────────────────────────────────

export function useActivityBookingReadiness(bookingId: string | undefined) {
  return useQuery({
    queryKey: abrKeys.byBooking(bookingId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_booking_readiness')
        .select('*')
        .eq('booking_id', bookingId!)
        .maybeSingle();
      if (error) throw error;
      return data as ActivityBookingReadiness | null;
    },
    enabled: !!bookingId,
    staleTime: 10_000,
  });
}

// ── Batch readiness for a session (staff ops) ───────────────────

export function useSessionBookingReadiness(sessionId: string | undefined, bookingIds: string[]) {
  return useQuery({
    queryKey: abrKeys.bySession(sessionId!),
    queryFn: async () => {
      if (bookingIds.length === 0) return {} as Record<string, ActivityBookingReadiness>;
      const { data, error } = await supabase
        .from('activity_booking_readiness')
        .select('*')
        .eq('session_id', sessionId!)
        .in('booking_id', bookingIds);
      if (error) throw error;
      const map: Record<string, ActivityBookingReadiness> = {};
      (data ?? []).forEach((r: any) => {
        map[r.booking_id] = r as ActivityBookingReadiness;
      });
      return map;
    },
    enabled: !!sessionId && bookingIds.length > 0,
    staleTime: 5_000,
  });
}

// ── Update readiness (guest or staff) ───────────────────────────

export function useUpdateActivityBookingReadiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      updates,
    }: {
      bookingId: string;
      updates: Partial<Pick<ActivityBookingReadiness,
        'waiver_status' | 'medical_status' | 'cert_status' | 'gear_status' | 'gear_json' | 'cert_media_path'
      >> & Record<string, unknown>;
    }) => {
      const { data, error } = await supabase
        .from('activity_booking_readiness')
        .update(updates as any)
        .eq('booking_id', bookingId)
        .select()
        .single();
      if (error) throw error;
      return data as ActivityBookingReadiness;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(abrKeys.byBooking(data.booking_id), data);
      // Also invalidate session-level cache
      queryClient.invalidateQueries({ queryKey: ['activity-booking-readiness-session'] });
    },
  });
}
