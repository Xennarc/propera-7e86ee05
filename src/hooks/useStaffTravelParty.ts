/**
 * Staff-specific hook for travel party data.
 * Uses staff auth (not guest auth) and queries database directly.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';

export interface StaffTravelPartyMember {
  id: string;
  displayName: string;
  memberType: 'adult' | 'child';
  birthYear: number | null;
  roomNumber: string | null;
  relationshipLabel: string | null;
  isLead: boolean;
  linkedGuestId: string | null;
}

export interface StaffTravelParty {
  id: string;
  name: string | null;
  leadGuestId: string;
  members: StaffTravelPartyMember[];
  createdAt: string;
}

interface UseStaffTravelPartyOptions {
  guestId: string;
  guestName: string;
  resortId: string;
  enabled?: boolean;
}

export function useStaffTravelParty({
  guestId,
  guestName,
  resortId,
  enabled = true,
}: UseStaffTravelPartyOptions) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Query travel party where this guest is the lead
  const {
    data: party,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.travelParty.staffParty(resortId, guestId),
    queryFn: async (): Promise<StaffTravelParty | null> => {
      const { data, error } = await supabase
        .from('travel_parties')
        .select(`
          id,
          name,
          lead_guest_id,
          created_at,
          members:travel_party_members(
            id,
            display_name,
            member_type,
            birth_year,
            room_number,
            relationship_label,
            is_lead,
            guest_id
          )
        `)
        .eq('lead_guest_id', guestId)
        .eq('resort_id', resortId)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        name: data.name,
        leadGuestId: data.lead_guest_id,
        createdAt: data.created_at,
        members: (data.members || []).map((m) => ({
          id: m.id,
          displayName: m.display_name,
          memberType: m.member_type as 'adult' | 'child',
          birthYear: m.birth_year,
          roomNumber: m.room_number,
          relationshipLabel: m.relationship_label,
          isLead: m.is_lead,
          linkedGuestId: m.guest_id,
        })),
      };
    },
    enabled: enabled && !!guestId && !!resortId,
  });

  // Create a new travel party with the guest as lead
  const createParty = useMutation({
    mutationFn: async () => {
      // Create the party
      const { data: newParty, error: partyError } = await supabase
        .from('travel_parties')
        .insert({
          lead_guest_id: guestId,
          resort_id: resortId,
          name: null, // Optional, can be set later
        })
        .select('id')
        .single();

      if (partyError) throw partyError;

      // Add the lead guest as a member
      const { error: memberError } = await supabase
        .from('travel_party_members')
        .insert({
          travel_party_id: newParty.id,
          resort_id: resortId,
          display_name: guestName,
          member_type: 'adult',
          is_lead: true,
          guest_id: guestId,
        });

      if (memberError) throw memberError;

      return newParty.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.travelParty.staffParty(resortId, guestId),
      });
      toast({
        title: 'Travel party created',
        description: 'You can now add members to this party.',
      });
    },
    onError: (error) => {
      console.error('Failed to create travel party:', error);
      toast({
        variant: 'destructive',
        title: 'Failed to create party',
        description: 'Please try again or contact support.',
      });
    },
  });

  return {
    party,
    hasParty: !!party,
    isLoading,
    error,
    refetch,
    createParty: createParty.mutateAsync,
    isCreating: createParty.isPending,
  };
}
