import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RolloutHistoryEntry {
  id: string;
  change_type: string;
  change_label: string;
  scope: 'one' | 'selected' | 'all';
  affected_resort_ids: string[];
  executed_by: string;
  executed_at: string;
  rollback_by: string | null;
  rollback_at: string | null;
  status: 'executed' | 'rolled_back' | 'failed';
  metadata_json: Record<string, unknown>;
  notes: string | null;
  executor_name?: string;
}

export function useRolloutHistory(limit: number = 20) {
  return useQuery({
    queryKey: ['rollout-history', limit],
    queryFn: async (): Promise<RolloutHistoryEntry[]> => {
      const { data, error } = await supabase
        .from('rollout_history')
        .select('*')
        .order('executed_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      // Fetch executor names
      const executorIds = [...new Set((data || []).map(r => r.executed_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', executorIds);

      return (data || []).map(r => ({
        ...r,
        scope: r.scope as 'one' | 'selected' | 'all',
        status: r.status as 'executed' | 'rolled_back' | 'failed',
        metadata_json: r.metadata_json as Record<string, unknown>,
        executor_name: profiles?.find(p => p.id === r.executed_by)?.full_name || 'Unknown',
      }));
    },
  });
}

export function useExecuteRollout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      changeType,
      changeLabel,
      scope,
      resortIds,
      notes,
    }: {
      changeType: string;
      changeLabel: string;
      scope: 'one' | 'selected' | 'all';
      resortIds: string[];
      notes?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Execute the actual rollout based on change type
      switch (changeType) {
        case 'sync_sessions':
          // Sync activity sessions from recurring rules for affected resorts
          for (const resortId of resortIds) {
            // This would trigger the recurring rule generation
            // For now, we just log it
          }
          break;
        case 'sync_slots':
          // Sync restaurant slots from recurring rules
          break;
        case 'refresh_caches':
          // Invalidate caches (if any)
          break;
        case 'enable_prearrival':
          // Enable pre-arrival for resorts
          for (const resortId of resortIds) {
            await supabase
              .from('prearrival_settings')
              .upsert({ resort_id: resortId, is_enabled: true }, { onConflict: 'resort_id' });
          }
          break;
        case 'disable_guest_bookings':
          // Disable guest bookings
          for (const resortId of resortIds) {
            await supabase
              .from('activities')
              .update({ guest_can_book: false })
              .eq('resort_id', resortId);
            await supabase
              .from('restaurants')
              .update({ guest_can_book: false })
              .eq('resort_id', resortId);
          }
          break;
        case 'enable_guest_bookings':
          // Enable guest bookings
          for (const resortId of resortIds) {
            await supabase
              .from('activities')
              .update({ guest_can_book: true })
              .eq('resort_id', resortId);
            await supabase
              .from('restaurants')
              .update({ guest_can_book: true })
              .eq('resort_id', resortId);
          }
          break;
      }

      // Record the rollout
      const { data, error } = await supabase
        .from('rollout_history')
        .insert({
          change_type: changeType,
          change_label: changeLabel,
          scope,
          affected_resort_ids: resortIds,
          executed_by: userId,
          notes,
          metadata_json: { timestamp: new Date().toISOString() },
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_platform_activity', {
        p_event_type: 'rollout_executed',
        p_target_type: 'rollout',
        p_target_id: data.id,
        p_target_name: changeLabel,
        p_metadata: { change_type: changeType, scope, resort_count: resortIds.length },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rollout-history'] });
      toast.success('Rollout executed successfully');
    },
    onError: (error) => {
      toast.error('Rollout failed');
      console.error(error);
    },
  });
}

export function useRollbackRollout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rolloutId: string) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      // Get the rollout
      const { data: rollout, error: fetchError } = await supabase
        .from('rollout_history')
        .select('*')
        .eq('id', rolloutId)
        .single();

      if (fetchError) throw fetchError;
      if (!rollout) throw new Error('Rollout not found');
      if (rollout.status === 'rolled_back') throw new Error('Already rolled back');

      // Perform rollback based on change type
      switch (rollout.change_type) {
        case 'enable_prearrival':
          for (const resortId of rollout.affected_resort_ids) {
            await supabase
              .from('prearrival_settings')
              .update({ is_enabled: false })
              .eq('resort_id', resortId);
          }
          break;
        case 'disable_guest_bookings':
          for (const resortId of rollout.affected_resort_ids) {
            await supabase
              .from('activities')
              .update({ guest_can_book: true })
              .eq('resort_id', resortId);
            await supabase
              .from('restaurants')
              .update({ guest_can_book: true })
              .eq('resort_id', resortId);
          }
          break;
        case 'enable_guest_bookings':
          for (const resortId of rollout.affected_resort_ids) {
            await supabase
              .from('activities')
              .update({ guest_can_book: false })
              .eq('resort_id', resortId);
            await supabase
              .from('restaurants')
              .update({ guest_can_book: false })
              .eq('resort_id', resortId);
          }
          break;
      }

      // Update rollout record
      const { error } = await supabase
        .from('rollout_history')
        .update({
          status: 'rolled_back',
          rollback_by: userId,
          rollback_at: new Date().toISOString(),
        })
        .eq('id', rolloutId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rollout-history'] });
      toast.success('Rollout rolled back');
    },
    onError: (error) => {
      toast.error('Rollback failed');
      console.error(error);
    },
  });
}
