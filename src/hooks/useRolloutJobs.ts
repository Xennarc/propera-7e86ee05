import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export type RolloutScope = 'one' | 'selected' | 'all';
export type RolloutStatus = 'pending' | 'dry_run' | 'in_progress' | 'completed' | 'failed' | 'rolled_back';
export type RolloutStepStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';

export interface RolloutJob {
  id: string;
  change_type: string;
  change_label: string;
  scope: RolloutScope;
  target_resort_ids: string[];
  payload_json: Json;
  status: RolloutStatus;
  dry_run_result_json: Json;
  created_by: string;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
  notes: string | null;
}

export interface RolloutJobStep {
  id: string;
  job_id: string;
  resort_id: string;
  old_value_json: Json;
  new_value_json: Json;
  status: RolloutStepStatus;
  started_at: string | null;
  finished_at: string | null;
  error_message: string | null;
}

export interface CreateRolloutParams {
  changeType: string;
  changeLabel: string;
  scope: RolloutScope;
  targetResortIds: string[];
  payload?: Record<string, unknown>;
  notes?: string;
}

// Fetch rollout history
export function useRolloutHistory(limit = 20) {
  return useQuery({
    queryKey: ['rollout-jobs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rollout_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as RolloutJob[];
    },
  });
}

// Fetch specific job with steps
export function useRolloutJob(jobId: string | undefined) {
  return useQuery({
    queryKey: ['rollout-job', jobId],
    queryFn: async () => {
      if (!jobId) throw new Error('Job ID required');
      
      const [{ data: job, error: jobError }, { data: steps, error: stepsError }] = await Promise.all([
        supabase
          .from('rollout_jobs')
          .select('*')
          .eq('id', jobId)
          .single(),
        supabase
          .from('rollout_job_steps')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: true })
      ]);
      
      if (jobError) throw jobError;
      if (stepsError) throw stepsError;
      
      return {
        job: job as RolloutJob,
        steps: (steps || []) as RolloutJobStep[]
      };
    },
    enabled: !!jobId,
  });
}

// Create a new rollout job
export function useCreateRolloutJob() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      changeType, 
      changeLabel, 
      scope, 
      targetResortIds, 
      payload = {},
      notes 
    }: CreateRolloutParams) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      if (!userId) throw new Error('Not authenticated');
      
      // Create job
      const { data: job, error: jobError } = await supabase
        .from('rollout_jobs')
        .insert({
          change_type: changeType,
          change_label: changeLabel,
          scope,
          target_resort_ids: targetResortIds,
          payload_json: payload as Json,
          created_by: userId,
          notes
        })
        .select()
        .single();
      
      if (jobError) throw jobError;
      
      // Create steps for each resort
      const steps = targetResortIds.map(resortId => ({
        job_id: job.id,
        resort_id: resortId,
        old_value_json: {} as Json,
        new_value_json: {} as Json,
        status: 'pending' as const
      }));
      
      const { error: stepsError } = await supabase
        .from('rollout_job_steps')
        .insert(steps);
      
      if (stepsError) throw stepsError;
      
      return job as RolloutJob;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rollout-jobs'] });
    }
  });
}

// Execute rollout (dry run or actual)
export function useExecuteRollout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ jobId, dryRun = false }: { jobId: string; dryRun?: boolean }) => {
      const { data, error } = await supabase.functions.invoke('execute-rollout', {
        body: { jobId, dryRun }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['rollout-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['rollout-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['resort-settings'] });
      queryClient.invalidateQueries({ queryKey: ['resorts'] });
    }
  });
}

// Rollback a completed rollout
export function useRollbackRollout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ jobId }: { jobId: string }) => {
      const { data, error } = await supabase.functions.invoke('execute-rollout', {
        body: { jobId, rollback: true }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: (_, { jobId }) => {
      queryClient.invalidateQueries({ queryKey: ['rollout-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['rollout-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['resort-settings'] });
      toast.success('Rollout rolled back successfully');
    },
    onError: (error) => {
      toast.error(`Rollback failed: ${error.message}`);
    }
  });
}
