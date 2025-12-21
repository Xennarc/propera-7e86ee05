import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SupportSession {
  id: string;
  admin_user_id: string;
  session_type: 'staff' | 'guest';
  resort_id: string;
  target_user_id: string | null;
  read_only: boolean;
  reason: string;
  started_at: string;
  expires_at: string;
  ended_at: string | null;
  actions_taken: unknown[];
  resort_name?: string;
}

export function useActiveSupportSessions() {
  return useQuery({
    queryKey: ['support-sessions-active'],
    queryFn: async (): Promise<SupportSession[]> => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) return [];

      const { data, error } = await supabase
        .from('support_sessions')
        .select('*, resorts(name)')
        .eq('admin_user_id', userId)
        .is('ended_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('started_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(s => ({
        ...s,
        session_type: s.session_type as 'staff' | 'guest',
        actions_taken: s.actions_taken as unknown[],
        resort_name: (s.resorts as { name: string } | null)?.name || 'Unknown Resort',
      }));
    },
    refetchInterval: 10000, // Check every 10 seconds for expired sessions
  });
}

export function useStartSupportSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionType,
      resortId,
      targetUserId,
      readOnly,
      reason,
      durationMinutes = 15,
    }: {
      sessionType: 'staff' | 'guest';
      resortId: string;
      targetUserId?: string;
      readOnly: boolean;
      reason: string;
      durationMinutes?: number;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      const { data, error } = await supabase
        .from('support_sessions')
        .insert({
          admin_user_id: userId,
          session_type: sessionType,
          resort_id: resortId,
          target_user_id: targetUserId || null,
          read_only: readOnly,
          reason,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_platform_activity', {
        p_event_type: 'support_session_started',
        p_resort_id: resortId,
        p_target_type: 'support_session',
        p_target_id: data.id,
        p_metadata: { session_type: sessionType, read_only: readOnly, reason },
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-sessions-active'] });
    },
    onError: (error) => {
      toast.error('Failed to start support session');
      console.error(error);
    },
  });
}

export function useEndSupportSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const { error } = await supabase
        .from('support_sessions')
        .update({ ended_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;

      // Log activity
      await supabase.rpc('log_platform_activity', {
        p_event_type: 'support_session_ended',
        p_target_type: 'support_session',
        p_target_id: sessionId,
        p_metadata: {},
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-sessions-active'] });
      toast.success('Support session ended');
    },
    onError: (error) => {
      toast.error('Failed to end session');
      console.error(error);
    },
  });
}

export function useLogSupportAction() {
  return useMutation({
    mutationFn: async ({
      sessionId,
      action,
      details,
    }: {
      sessionId: string;
      action: string;
      details?: Record<string, unknown>;
    }) => {
      // Get current actions
      const { data: session, error: fetchError } = await supabase
        .from('support_sessions')
        .select('actions_taken')
        .eq('id', sessionId)
        .single();

      if (fetchError) throw fetchError;

      const newAction = {
        action,
        timestamp: new Date().toISOString(),
        details,
      };

      const existingActions = Array.isArray(session?.actions_taken) ? session.actions_taken : [];
      const actions = [...existingActions, newAction];

      const { error } = await supabase
        .from('support_sessions')
        .update({ actions_taken: actions as unknown })
        .eq('id', sessionId);

      if (error) throw error;
    },
  });
}

export function useSupportSessionHistory(limit: number = 50) {
  return useQuery({
    queryKey: ['support-sessions-history', limit],
    queryFn: async (): Promise<SupportSession[]> => {
      const { data, error } = await supabase
        .from('support_sessions')
        .select('*, resorts(name)')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(s => ({
        ...s,
        session_type: s.session_type as 'staff' | 'guest',
        actions_taken: s.actions_taken as unknown[],
        resort_name: (s.resorts as { name: string } | null)?.name || 'Unknown Resort',
      }));
    },
  });
}
