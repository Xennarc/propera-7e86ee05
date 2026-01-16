import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PurgeJob {
  id: string;
  resort_id: string;
  resort_code: string;
  resort_name: string;
  is_demo: boolean;
  requested_by: string;
  requested_at: string;
  started_at: string | null;
  finished_at: string | null;
  status: 'queued' | 'running' | 'failed' | 'completed' | 'cancelled';
  progress: number;
  current_step: string | null;
  reason: string | null;
  error: string | null;
  summary: {
    tables_deleted?: Record<string, number>;
    storage_files_deleted?: Record<string, number>;
    total_rows_deleted?: number;
    total_files_deleted?: number;
    duration_ms?: number;
  };
}

export function usePurgeJob(resortId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch the latest purge job for this resort
  const { data: job, isLoading, refetch } = useQuery({
    queryKey: ['purge-job', resortId],
    queryFn: async () => {
      if (!resortId) return null;

      const { data, error } = await supabase
        .from('resort_purge_jobs')
        .select('*')
        .eq('resort_id', resortId)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching purge job:', error);
        return null;
      }

      return data as PurgeJob | null;
    },
    enabled: !!resortId,
    // Poll every 2 seconds while job is running or queued
    refetchInterval: (query) => {
      const data = query.state.data as PurgeJob | null;
      if (data && ['queued', 'running'].includes(data.status)) {
        return 2000;
      }
      return false;
    },
  });

  // Request a new purge job via RPC
  const requestPurgeMutation = useMutation({
    mutationFn: async ({
      resortId,
      resortCode,
      confirmWord,
      reason,
    }: {
      resortId: string;
      resortCode: string;
      confirmWord: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc('request_resort_purge', {
        p_resort_id: resortId,
        p_resort_code: resortCode,
        p_confirm_word: confirmWord,
        p_reason: reason || null,
      });

      if (error) {
        throw new Error(error.message);
      }

      return data as string; // Returns job_id
    },
    onSuccess: (jobId) => {
      queryClient.invalidateQueries({ queryKey: ['purge-job', resortId] });
      return jobId;
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to request purge',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Execute the purge job via edge function
  const executePurgeMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const { data, error } = await supabase.functions.invoke('purge-resort', {
        body: { job_id: jobId },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Unknown error during purge');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purge-job', resortId] });
      queryClient.invalidateQueries({ queryKey: ['resorts'] });
    },
    onError: (error: Error) => {
      queryClient.invalidateQueries({ queryKey: ['purge-job', resortId] });
      toast({
        title: 'Purge failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Combined function to request and execute purge
  const startPurge = async ({
    resortId,
    resortCode,
    confirmWord,
    reason,
  }: {
    resortId: string;
    resortCode: string;
    confirmWord: string;
    reason?: string;
  }) => {
    try {
      // First request the purge job
      const jobId = await requestPurgeMutation.mutateAsync({
        resortId,
        resortCode,
        confirmWord,
        reason,
      });

      // Then execute it
      await executePurgeMutation.mutateAsync(jobId);

      return jobId;
    } catch (error) {
      throw error;
    }
  };

  // Retry a failed purge
  const retryPurge = async (jobId: string) => {
    return executePurgeMutation.mutateAsync(jobId);
  };

  return {
    job,
    isLoading,
    refetch,
    startPurge,
    retryPurge,
    isRequesting: requestPurgeMutation.isPending,
    isExecuting: executePurgeMutation.isPending,
    isPurging: requestPurgeMutation.isPending || executePurgeMutation.isPending,
  };
}
