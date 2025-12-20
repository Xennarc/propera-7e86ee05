import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GuestPrearrivalStatus {
  guestId: string;
  prearrivalStatus: 'not_started' | 'partial' | 'completed' | null;
  lastInviteSent: string | null;
  inviteStatus: 'not_sent' | 'sent' | 'failed' | null;
}

interface UsePrearrivalStatusesOptions {
  guestIds: string[];
  resortId: string;
  enabled?: boolean;
}

export function usePrearrivalStatuses({ guestIds, resortId, enabled = true }: UsePrearrivalStatusesOptions) {
  return useQuery({
    queryKey: ['prearrival-statuses', resortId, guestIds],
    queryFn: async (): Promise<Record<string, GuestPrearrivalStatus>> => {
      if (guestIds.length === 0) return {};

      // Fetch prearrival profiles and outbound messages in parallel
      const [profilesResult, messagesResult] = await Promise.all([
        supabase
          .from('prearrival_profiles')
          .select('guest_id, prearrival_status')
          .eq('resort_id', resortId)
          .in('guest_id', guestIds),
        supabase
          .from('guest_outbound_messages')
          .select('guest_id, status, sent_at')
          .eq('resort_id', resortId)
          .eq('template_key', 'prearrival_invite_v1')
          .in('guest_id', guestIds)
          .order('created_at', { ascending: false }),
      ]);

      const profilesByGuest = new Map<string, { prearrival_status: string }>();
      (profilesResult.data || []).forEach(p => {
        profilesByGuest.set(p.guest_id, p);
      });

      // Get latest message per guest
      const messagesByGuest = new Map<string, { status: string; sent_at: string | null }>();
      (messagesResult.data || []).forEach(m => {
        if (!messagesByGuest.has(m.guest_id)) {
          messagesByGuest.set(m.guest_id, m);
        }
      });

      const result: Record<string, GuestPrearrivalStatus> = {};
      guestIds.forEach(guestId => {
        const profile = profilesByGuest.get(guestId);
        const message = messagesByGuest.get(guestId);

        result[guestId] = {
          guestId,
          prearrivalStatus: (profile?.prearrival_status as GuestPrearrivalStatus['prearrivalStatus']) || null,
          lastInviteSent: message?.sent_at || null,
          inviteStatus: message 
            ? (message.status === 'sent' ? 'sent' : message.status === 'failed' ? 'failed' : null)
            : 'not_sent',
        };
      });

      return result;
    },
    enabled: enabled && guestIds.length > 0 && !!resortId,
    staleTime: 30000, // 30 seconds
  });
}
