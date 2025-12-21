import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface GuestPrearrivalStatus {
  guestId: string;
  prearrivalStatus: 'not_started' | 'partial' | 'completed' | null;
  lastInviteSent: string | null;
  inviteStatus: 'not_sent' | 'sent' | 'failed' | null;
  // Enhanced fields for list display
  lastUpdatedAt: string | null;
  hasAllergies: boolean;
  hasDietaryPreferences: boolean;
  hasSpecialRequests: boolean;
  hasSpecialOccasions: boolean;
  isLateArrival: boolean;
  requiresTransfer: boolean;
  arrivalTime: string | null;
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
          .select(`
            guest_id, 
            prearrival_status, 
            last_updated_at,
            allergies,
            dietary_preferences,
            special_requests,
            special_occasions,
            arrival_time,
            transfer_preference
          `)
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

      interface ProfileData {
        guest_id: string;
        prearrival_status: string;
        last_updated_at: string | null;
        allergies: string | null;
        dietary_preferences: any[] | null;
        special_requests: string | null;
        special_occasions: any[] | null;
        arrival_time: string | null;
        transfer_preference: string | null;
      }

      const profilesByGuest = new Map<string, ProfileData>();
      (profilesResult.data || []).forEach((p: any) => {
        profilesByGuest.set(p.guest_id, p);
      });

      // Get latest message per guest
      const messagesByGuest = new Map<string, { status: string; sent_at: string | null }>();
      (messagesResult.data || []).forEach(m => {
        if (!messagesByGuest.has(m.guest_id)) {
          messagesByGuest.set(m.guest_id, m);
        }
      });

      // Helper to check for late arrival (after 20:00)
      const isLateArrival = (arrivalTime: string | null): boolean => {
        if (!arrivalTime) return false;
        const hour = parseInt(arrivalTime.slice(0, 2), 10);
        return hour >= 20;
      };

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
          // Enhanced fields
          lastUpdatedAt: profile?.last_updated_at || null,
          hasAllergies: !!profile?.allergies,
          hasDietaryPreferences: !!(profile?.dietary_preferences && profile.dietary_preferences.length > 0),
          hasSpecialRequests: !!profile?.special_requests,
          hasSpecialOccasions: !!(profile?.special_occasions && profile.special_occasions.length > 0),
          isLateArrival: isLateArrival(profile?.arrival_time || null),
          requiresTransfer: !!profile?.transfer_preference && profile.transfer_preference !== 'none',
          arrivalTime: profile?.arrival_time || null,
        };
      });

      return result;
    },
    enabled: enabled && guestIds.length > 0 && !!resortId,
    staleTime: 30000, // 30 seconds
  });
}
