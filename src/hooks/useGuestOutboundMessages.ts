import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OutboundMessage {
  id: string;
  guest_id: string;
  resort_id: string;
  channel: string;
  template_key: string;
  to_address: string;
  subject: string | null;
  body_preview: string | null;
  status: 'queued' | 'sent' | 'failed';
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  created_by_staff_id: string | null;
  staff_name?: string;
}

interface UseGuestOutboundMessagesOptions {
  guestId: string;
  resortId: string;
  templateKey?: string;
  enabled?: boolean;
}

export function useGuestOutboundMessages({
  guestId,
  resortId,
  templateKey,
  enabled = true,
}: UseGuestOutboundMessagesOptions) {
  return useQuery({
    queryKey: ['guest-outbound-messages', guestId, resortId, templateKey],
    queryFn: async (): Promise<OutboundMessage[]> => {
      let query = supabase
        .from('guest_outbound_messages')
        .select(`
          id,
          guest_id,
          resort_id,
          channel,
          template_key,
          to_address,
          subject,
          body_preview,
          status,
          error_message,
          sent_at,
          created_at,
          created_by_staff_id,
          profiles:created_by_staff_id(full_name)
        `)
        .eq('guest_id', guestId)
        .eq('resort_id', resortId)
        .order('created_at', { ascending: false });

      if (templateKey) {
        query = query.eq('template_key', templateKey);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((msg: any) => ({
        ...msg,
        staff_name: msg.profiles?.full_name || 'System',
      }));
    },
    enabled: enabled && !!guestId && !!resortId,
    staleTime: 30000,
  });
}

export function usePrearrivalInviteStatus(guestId: string, resortId: string) {
  const { data: messages, isLoading, refetch } = useGuestOutboundMessages({
    guestId,
    resortId,
    templateKey: 'prearrival_invite',
    enabled: !!guestId && !!resortId,
  });

  const lastInvite = messages?.[0] || null;
  
  return {
    lastInvite,
    inviteCount: messages?.length || 0,
    hasBeenSent: !!lastInvite,
    lastStatus: lastInvite?.status || null,
    isLoading,
    refetch,
  };
}
