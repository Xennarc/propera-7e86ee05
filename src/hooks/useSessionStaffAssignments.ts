/**
 * useSessionStaffAssignments – CRUD for session_staff_assignments table.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SessionStaffAssignment, StaffAssignmentRole } from '@/types/ops';

export const staffAssignmentKeys = {
  bySession: (sessionId: string) => ['session-staff-assignments', sessionId] as const,
};

export function useSessionStaffAssignments(sessionId: string | undefined) {
  return useQuery({
    queryKey: staffAssignmentKeys.bySession(sessionId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_staff_assignments')
        .select('*')
        .eq('session_id', sessionId!)
        .order('role')
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as SessionStaffAssignment[];
    },
    enabled: !!sessionId,
    staleTime: 10_000,
  });
}

export function useAddStaffAssignment(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      resort_id: string;
      staff_user_id: string;
      role: StaffAssignmentRole;
      assigned_by?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('session_staff_assignments')
        .insert({
          session_id: sessionId,
          resort_id: input.resort_id,
          staff_user_id: input.staff_user_id,
          role: input.role,
          assigned_by: input.assigned_by ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as SessionStaffAssignment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: staffAssignmentKeys.bySession(sessionId) });
    },
  });
}

export function useRemoveStaffAssignment(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('session_staff_assignments')
        .delete()
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: staffAssignmentKeys.bySession(sessionId) });
    },
  });
}

// ── Resort staff list for picker ────────────────────────────────────

export interface ResortStaffMember {
  user_id: string;
  full_name: string;
  resort_role: string;
}

export function useResortStaffList(resortId: string | undefined) {
  return useQuery({
    queryKey: ['resort-staff-list', resortId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('resort_memberships')
        .select('user_id, resort_role, profile:profiles!resort_memberships_user_id_fkey(full_name)')
        .eq('resort_id', resortId!);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        user_id: m.user_id,
        full_name: m.profile?.full_name ?? 'Unknown',
        resort_role: m.resort_role,
      })) as ResortStaffMember[];
    },
    enabled: !!resortId,
    staleTime: 60_000,
  });
}
