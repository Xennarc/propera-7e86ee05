/**
 * Hook for managing session asset assignments (guides, boats, equipment)
 * and detecting conflicts with overlapping sessions.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SessionAssetType = 'guide' | 'boat' | 'equipment';

export interface SessionAsset {
  id: string;
  resort_id: string;
  session_id: string;
  asset_type: SessionAssetType;
  asset_ref_id: string | null;
  asset_label: string;
  quantity: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssetConflict {
  asset_label: string;
  asset_type: SessionAssetType;
  conflicting_session_id: string;
  conflicting_activity_name: string;
  conflicting_date: string;
  conflicting_start_time: string;
  conflicting_end_time: string;
}

// ── Fetch assets for a session ──────────────────────────────────────

export function useSessionAssets(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-assets', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('session_asset_assignments')
        .select('*')
        .eq('session_id', sessionId)
        .order('asset_type')
        .order('asset_label');

      if (error) throw error;
      return (data ?? []) as SessionAsset[];
    },
    enabled: !!sessionId,
  });
}

// ── Add asset ───────────────────────────────────────────────────────

export function useAddSessionAsset(sessionId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: {
      resort_id: string;
      asset_type: SessionAssetType;
      asset_ref_id?: string | null;
      asset_label: string;
      quantity?: number;
      notes?: string | null;
    }) => {
      const { data, error } = await supabase
        .from('session_asset_assignments')
        .insert({
          session_id: sessionId,
          resort_id: input.resort_id,
          asset_type: input.asset_type as any,
          asset_ref_id: input.asset_ref_id ?? null,
          asset_label: input.asset_label,
          quantity: input.quantity ?? 1,
          notes: input.notes ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-assets', sessionId] });
      qc.invalidateQueries({ queryKey: ['session-asset-conflicts', sessionId] });
      toast({ title: 'Asset assigned' });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    },
  });
}

// ── Remove asset ────────────────────────────────────────────────────

export function useRemoveSessionAsset(sessionId: string) {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (assetId: string) => {
      const { error } = await supabase
        .from('session_asset_assignments')
        .delete()
        .eq('id', assetId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-assets', sessionId] });
      qc.invalidateQueries({ queryKey: ['session-asset-conflicts', sessionId] });
      toast({ title: 'Asset removed' });
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    },
  });
}

// ── Conflict detection ──────────────────────────────────────────────
// Finds assets assigned to OTHER sessions that overlap in time with this session.

export function useSessionAssetConflicts(
  sessionId: string | undefined,
  sessionDate: string | undefined,
  sessionStartTime: string | undefined,
  sessionEndTime: string | undefined,
  resortId: string | undefined
) {
  return useQuery({
    queryKey: ['session-asset-conflicts', sessionId],
    queryFn: async (): Promise<AssetConflict[]> => {
      if (!sessionId || !sessionDate || !sessionStartTime || !sessionEndTime || !resortId) return [];

      // 1. Get current session's assigned asset labels
      const { data: myAssets } = await supabase
        .from('session_asset_assignments')
        .select('asset_type, asset_label')
        .eq('session_id', sessionId);

      if (!myAssets || myAssets.length === 0) return [];

      // 2. Find overlapping sessions on the same date
      const { data: overlappingSessions } = await supabase
        .from('activity_sessions')
        .select('id, date, start_time, end_time, activity:activities(name)')
        .eq('resort_id', resortId)
        .eq('date', sessionDate)
        .eq('status', 'SCHEDULED')
        .neq('id', sessionId);

      if (!overlappingSessions || overlappingSessions.length === 0) return [];

      // Filter to actually overlapping time ranges
      const timeOverlapping = overlappingSessions.filter((s: any) => {
        return s.start_time < sessionEndTime && s.end_time > sessionStartTime;
      });

      if (timeOverlapping.length === 0) return [];

      const overlapIds = timeOverlapping.map((s: any) => s.id);

      // 3. Find asset assignments in overlapping sessions that match our assets
      const { data: otherAssets } = await supabase
        .from('session_asset_assignments')
        .select('asset_type, asset_label, session_id')
        .in('session_id', overlapIds);

      if (!otherAssets || otherAssets.length === 0) return [];

      // 4. Cross-match
      const conflicts: AssetConflict[] = [];
      const myAssetSet = new Set(myAssets.map((a: any) => `${a.asset_type}::${a.asset_label}`));

      for (const other of otherAssets) {
        const key = `${other.asset_type}::${other.asset_label}`;
        if (myAssetSet.has(key)) {
          const sess = timeOverlapping.find((s: any) => s.id === other.session_id);
          if (sess) {
            conflicts.push({
              asset_label: other.asset_label,
              asset_type: other.asset_type as SessionAssetType,
              conflicting_session_id: sess.id,
              conflicting_activity_name: (sess as any).activity?.name ?? 'Unknown',
              conflicting_date: sess.date,
              conflicting_start_time: sess.start_time,
              conflicting_end_time: sess.end_time,
            });
          }
        }
      }

      return conflicts;
    },
    enabled: !!sessionId && !!sessionDate,
    refetchInterval: 30_000,
  });
}
