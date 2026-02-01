/**
 * Guest-Safe Feature Flags Hook
 * 
 * Uses the get_effective_feature_flags RPC to fetch flags for guests.
 * This bypasses RLS issues by using a SECURITY DEFINER function.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import { isEnabledEffective as checkEffective } from '@/hooks/useFeatureFlags';

export interface EffectiveFlag {
  key: string;
  is_enabled: boolean;
  label: string;
  category: string;
}

/**
 * Fetches effective feature flags for a resort via secure RPC.
 * Works for guests (no auth), staff, and super admins.
 * 
 * @param resortId - The resort ID to fetch flags for
 * @param guestId - Optional guest ID for guest portal access validation
 */
export function useGuestFeatureFlags(resortId?: string, guestId?: string) {
  return useQuery({
    queryKey: ['guest-feature-flags', resortId, guestId],
    queryFn: async (): Promise<EffectiveFlag[]> => {
      if (!resortId) return [];

      const { data, error } = await supabase.rpc('get_effective_feature_flags', {
        _resort_id: resortId,
        _guest_id: guestId || null,
      });

      if (error) {
        console.error('[GuestFeatureFlags] RPC error:', error);
        throw error;
      }

      return (data || []) as EffectiveFlag[];
    },
    enabled: !!resortId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
    retry: 2,
  });
}

/**
 * Build a lookup map from effective flags
 */
export function buildGuestFlagsMap(flags: EffectiveFlag[]): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const flag of flags) {
    map[flag.key] = flag.is_enabled;
  }
  return map;
}

/**
 * Hook that provides resolved guest feature flags with effective state calculation.
 * Uses the RPC-based fetch for RLS-safe access.
 * 
 * @param resortId - The resort ID
 * @param guestId - The guest ID (for access validation)
 */
export function useResolvedGuestFeatureFlags(resortId?: string, guestId?: string) {
  const { data: flags, isLoading, error, refetch } = useGuestFeatureFlags(resortId, guestId);

  const flagsMap = useMemo(() => {
    return buildGuestFlagsMap(flags || []);
  }, [flags]);

  const isEnabled = useMemo(() => {
    return (key: string): boolean => checkEffective(key, flagsMap);
  }, [flagsMap]);

  return {
    flags: flags || [],
    flagsMap,
    isEnabled,
    isLoading,
    error,
    refetch,
  };
}
