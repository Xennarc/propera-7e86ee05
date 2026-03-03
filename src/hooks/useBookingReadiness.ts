import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BookingReadiness {
  id: string;
  resort_id: string;
  booking_id: string;
  guest_id: string;
  waiver_signed: boolean;
  waiver_signed_at: string | null;
  sizes_confirmed: boolean;
  sizes_data: Record<string, unknown>;
  sizes_confirmed_at: string | null;
  cert_verified: boolean;
  cert_file_path: string | null;
  cert_type: string | null;
  cert_verified_at: string | null;
  gear_confirmed: boolean;
  gear_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export function readinessQueryKey(bookingId: string) {
  return ['booking-readiness', bookingId] as const;
}

export function useBookingReadiness(bookingId: string | undefined) {
  return useQuery({
    queryKey: readinessQueryKey(bookingId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('booking_readiness')
        .select('*')
        .eq('booking_id', bookingId!)
        .maybeSingle();
      if (error) throw error;
      return data as BookingReadiness | null;
    },
    enabled: !!bookingId,
    staleTime: 10_000,
  });
}

/**
 * Ensure a readiness row exists for a booking, creating if needed.
 * Returns the readiness record.
 */
export function useEnsureReadiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      guestId,
      resortId,
    }: {
      bookingId: string;
      guestId: string;
      resortId: string;
    }) => {
      // Try to fetch existing
      const { data: existing } = await supabase
        .from('booking_readiness')
        .select('*')
        .eq('booking_id', bookingId)
        .maybeSingle();

      if (existing) return existing as BookingReadiness;

      // Create new
      const { data, error } = await supabase
        .from('booking_readiness')
        .insert({
          booking_id: bookingId,
          guest_id: guestId,
          resort_id: resortId,
        })
        .select()
        .single();

      if (error) throw error;
      return data as BookingReadiness;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(readinessQueryKey(data.booking_id), data);
    },
  });
}

export function useUpdateReadiness() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      bookingId,
      updates,
    }: {
      bookingId: string;
      updates: Partial<BookingReadiness>;
    }) => {
      // Strip app-level types to match DB types
      const { id, resort_id, booking_id, guest_id, created_at, ...rest } = updates as any;
      const dbUpdates = { ...rest, updated_at: new Date().toISOString() };
      // Ensure sizes_data is JSON-compatible
      if (dbUpdates.sizes_data) {
        dbUpdates.sizes_data = JSON.parse(JSON.stringify(dbUpdates.sizes_data));
      }
      const { data, error } = await supabase
        .from('booking_readiness')
        .update(dbUpdates)
        .eq('booking_id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return data as BookingReadiness;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(readinessQueryKey(data.booking_id), data);
    },
  });
}

/**
 * Fetch readiness for multiple bookings (used by staff ops run sheet).
 */
export function useSessionReadiness(bookingIds: string[]) {
  return useQuery({
    queryKey: ['session-readiness', ...bookingIds.sort()],
    queryFn: async () => {
      if (bookingIds.length === 0) return {};
      const { data, error } = await supabase
        .from('booking_readiness')
        .select('*')
        .in('booking_id', bookingIds);
      if (error) throw error;
      const map: Record<string, BookingReadiness> = {};
      (data ?? []).forEach((r: any) => {
        map[r.booking_id] = r as BookingReadiness;
      });
      return map;
    },
    enabled: bookingIds.length > 0,
    staleTime: 5_000,
  });
}
