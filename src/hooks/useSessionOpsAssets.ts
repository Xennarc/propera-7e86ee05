/**
 * useSessionOpsAssets – Manage session_asset_assignments linked to ops_assets.
 * Replaces the legacy label-based pattern with asset_id-based assignments.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SessionOpsAssetAssignment {
  id: string;
  resort_id: string;
  session_id: string;
  asset_id: string | null;
  asset_label: string;
  asset_type: string;
  quantity: number;
  assigned_by: string | null;
  created_at: string;
}

export const sessionOpsAssetKeys = {
  bySession: (sessionId: string) => ['session-ops-assets', sessionId] as const,
};

export function useSessionOpsAssets(sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionOpsAssetKeys.bySession(sessionId!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_asset_assignments')
        .select('*')
        .eq('session_id', sessionId!)
        .order('asset_type')
        .order('asset_label');
      if (error) throw error;
      return (data ?? []) as SessionOpsAssetAssignment[];
    },
    enabled: !!sessionId,
    staleTime: 10_000,
  });
}

export function useAssignOpsAsset(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      resort_id: string;
      asset_id: string;
      asset_type: string;
      asset_label: string;
      quantity?: number;
      assigned_by?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('session_asset_assignments')
        .upsert(
          {
            session_id: sessionId,
            resort_id: input.resort_id,
            asset_ref_id: input.asset_id,
            asset_id: input.asset_id,
            asset_type: input.asset_type as any,
            asset_label: input.asset_label,
            quantity: input.quantity ?? 1,
            assigned_by: input.assigned_by ?? null,
          } as any,
          { onConflict: 'session_id,asset_id', ignoreDuplicates: false }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sessionOpsAssetKeys.bySession(sessionId) });
    },
  });
}

export function useUnassignOpsAsset(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from('session_asset_assignments')
        .delete()
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sessionOpsAssetKeys.bySession(sessionId) });
    },
  });
}

export function useUpdateOpsAssetQty(sessionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ assignmentId, quantity }: { assignmentId: string; quantity: number }) => {
      const { error } = await supabase
        .from('session_asset_assignments')
        .update({ quantity } as any)
        .eq('id', assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: sessionOpsAssetKeys.bySession(sessionId) });
    },
  });
}
