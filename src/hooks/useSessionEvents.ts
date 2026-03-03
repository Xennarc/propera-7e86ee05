/**
 * useSessionEvents – Fetch session_events for a given session.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SessionEvent {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  notes: string | null;
  created_at: string;
}

export function useSessionEvents(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session-events', sessionId],
    queryFn: async () => {
      if (!sessionId) return [];
      const { data, error } = await supabase
        .from('session_events')
        .select('id, event_type, from_status, to_status, notes, created_at')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return (data ?? []) as SessionEvent[];
    },
    enabled: !!sessionId,
  });
}
