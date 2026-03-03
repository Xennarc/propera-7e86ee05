/**
 * useSessionConflicts – Fetches conflict data for a session via RPC.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BoatConflict {
  asset_id: string;
  name: string;
  other_session_id: string;
  other_activity_name: string;
  other_start: string;
  other_end: string;
}

export interface EquipmentConflict {
  asset_id: string;
  name: string;
  other_session_id: string;
  other_activity_name: string;
  other_start: string;
  other_end: string;
  other_qty: number;
}

export interface StaffConflict {
  staff_user_id: string;
  name: string;
  role: string;
  other_session_id: string;
  other_activity_name: string;
  other_start: string;
  other_end: string;
}

export interface SessionConflicts {
  conflicting_boats: BoatConflict[];
  conflicting_equipment: EquipmentConflict[];
  conflicting_staff: StaffConflict[];
}

const EMPTY: SessionConflicts = {
  conflicting_boats: [],
  conflicting_equipment: [],
  conflicting_staff: [],
};

export function useSessionConflicts(resortId: string | undefined, sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-conflicts', sessionId],
    queryFn: async (): Promise<SessionConflicts> => {
      const { data, error } = await supabase.rpc('get_session_conflicts', {
        p_resort_id: resortId!,
        p_session_id: sessionId!,
      });
      if (error) throw error;
      if (!data) return EMPTY;
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        conflicting_boats: parsed.conflicting_boats ?? [],
        conflicting_equipment: parsed.conflicting_equipment ?? [],
        conflicting_staff: parsed.conflicting_staff ?? [],
      };
    },
    enabled: !!resortId && !!sessionId,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function totalConflictCount(c: SessionConflicts): number {
  return c.conflicting_boats.length + c.conflicting_equipment.length + c.conflicting_staff.length;
}
