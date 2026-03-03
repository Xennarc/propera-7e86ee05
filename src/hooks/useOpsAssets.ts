/**
 * useOpsAssets – CRUD hooks for the ops_assets table (boats, equipment catalog).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { OpsAsset, OpsAssetType } from '@/types/ops';

export const opsAssetKeys = {
  byResort: (resortId: string, type?: OpsAssetType) =>
    ['ops-assets', resortId, type ?? 'all'] as const,
};

export function useOpsAssets(resortId: string | undefined, type?: OpsAssetType) {
  return useQuery({
    queryKey: opsAssetKeys.byResort(resortId!, type),
    queryFn: async () => {
      let q = supabase
        .from('ops_assets')
        .select('*')
        .eq('resort_id', resortId!)
        .eq('is_active', true)
        .order('name');
      if (type) q = q.eq('type', type);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as OpsAsset[];
    },
    enabled: !!resortId,
    staleTime: 30_000,
  });
}

export function useCreateOpsAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      resort_id: string;
      type: OpsAssetType;
      name: string;
      capacity_int?: number | null;
      meta_json?: Record<string, unknown> | null;
    }) => {
      const { data, error } = await supabase
        .from('ops_assets')
        .insert({
          resort_id: input.resort_id,
          type: input.type,
          name: input.name,
          capacity_int: input.capacity_int ?? null,
          meta_json: input.meta_json ?? null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data as OpsAsset;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['ops-assets', data.resort_id] });
    },
  });
}
