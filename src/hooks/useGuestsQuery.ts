import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Guest } from '@/types/database';
import { queryKeys } from '@/lib/query-keys';

interface UseGuestsQueryOptions {
  resortId: string | undefined;
  enabled?: boolean;
}

/**
 * Hook for fetching guests with React Query.
 * Includes window focus refetching for instant sync across tabs.
 */
export function useGuestsQuery({ resortId, enabled = true }: UseGuestsQueryOptions) {
  // CRITICAL: Treat empty string or undefined resortId as invalid
  const hasValidResortId = !!resortId && resortId.length > 0;
  
  return useQuery({
    queryKey: queryKeys.guests.list(hasValidResortId ? resortId : '__no_resort__'),
    queryFn: async () => {
      // Double-check resortId is valid before querying
      if (!hasValidResortId) {
        console.warn('[useGuestsQuery] queryFn called without valid resortId');
        return [];
      }
      
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('resort_id', resortId)
        .order('check_in_date', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return (data || []) as Guest[];
    },
    // CRITICAL: Filter out any null/undefined entries that might come from database
    select: (data) => {
      const validGuests = (data || []).filter((guest): guest is Guest => guest != null);
      if (validGuests.length !== data?.length) {
        console.warn('[useGuestsQuery] Filtered out null guests', {
          original: data?.length,
          valid: validGuests.length,
        });
      }
      return validGuests;
    },
    // CRITICAL: Only enable with valid resort ID (not empty string)
    enabled: enabled && hasValidResortId,
    staleTime: 30 * 1000, // 30 seconds - considers data fresh for 30s
    refetchOnWindowFocus: true, // Refetch when tab becomes active
    refetchOnMount: true,
  });
}

interface UseGuestDetailOptions {
  guestId: string | undefined;
  resortId: string | undefined;
  enabled?: boolean;
}

/**
 * Hook for fetching a single guest's details.
 */
export function useGuestDetail({ guestId, resortId, enabled = true }: UseGuestDetailOptions) {
  return useQuery({
    queryKey: guestId && resortId ? queryKeys.guests.detail(resortId, guestId) : ['guest-detail-disabled'],
    queryFn: async () => {
      if (!guestId) return null;
      
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('id', guestId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw new Error(error.message);
      }

      return data as Guest;
    },
    enabled: enabled && !!guestId && !!resortId,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for prefetching guest data.
 */
export function useGuestPrefetch() {
  const queryClient = useQueryClient();

  const prefetchGuest = async (guestId: string, resortId: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.guests.detail(resortId, guestId),
      queryFn: async () => {
        const { data } = await supabase
          .from('guests')
          .select('*')
          .eq('id', guestId)
          .single();
        return data as Guest;
      },
      staleTime: 30 * 1000,
    });
  };

  return { prefetchGuest };
}
