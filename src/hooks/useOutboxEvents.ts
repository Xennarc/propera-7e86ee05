import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OutboxEvent {
  id: string;
  created_at: string;
  resort_id: string;
  event_type: string;
  payload: Record<string, any>;
  status: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  attempts: number;
  last_error: string | null;
  next_attempt_at: string;
  processed_at: string | null;
  updated_at: string;
  resort_name?: string;
}

interface OutboxStats {
  pending: number;
  processing: number;
  done: number;
  failed: number;
}

export function useOutboxEvents(options: {
  status?: 'PENDING' | 'PROCESSING' | 'DONE' | 'FAILED';
  resortId?: string;
  limit?: number;
} = {}) {
  const { status, resortId, limit = 50 } = options;

  return useQuery({
    queryKey: ['outbox-events', status, resortId, limit],
    queryFn: async (): Promise<OutboxEvent[]> => {
      let query = supabase
        .from('event_outbox')
        .select(`
          *,
          resorts:resort_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (status) {
        query = query.eq('status', status);
      }
      if (resortId) {
        query = query.eq('resort_id', resortId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((event: any) => ({
        ...event,
        resort_name: event.resorts?.name,
      }));
    },
  });
}

export function useOutboxStats(resortId?: string) {
  return useQuery({
    queryKey: ['outbox-stats', resortId],
    queryFn: async (): Promise<OutboxStats> => {
      const statuses = ['PENDING', 'PROCESSING', 'DONE', 'FAILED'] as const;
      const counts: OutboxStats = { pending: 0, processing: 0, done: 0, failed: 0 };

      for (const status of statuses) {
        let query = supabase
          .from('event_outbox')
          .select('*', { count: 'exact', head: true })
          .eq('status', status);

        if (resortId) {
          query = query.eq('resort_id', resortId);
        }

        const { count, error } = await query;
        if (!error && count !== null) {
          counts[status.toLowerCase() as keyof OutboxStats] = count;
        }
      }

      return counts;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useRetryFailedEvents() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventIds: string[]) => {
      const { data, error } = await supabase.rpc('retry_failed_events', {
        p_event_ids: eventIds,
      });
      if (error) throw error;
      return data as number;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbox-events'] });
      queryClient.invalidateQueries({ queryKey: ['outbox-stats'] });
    },
  });
}

export function useTriggerOutboxProcessor() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('process-outbox');
      if (error) throw error;
      return data;
    },
  });
}
