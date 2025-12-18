import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TravelPartyMember {
  id: string;
  display_name: string;
  member_type: 'adult' | 'child';
  birth_year: number | null;
  room_number: string | null;
  relationship_label: string | null;
  is_lead: boolean;
  guest_id: string | null;
}

export interface TravelParty {
  id: string;
  name: string | null;
  lead_guest_id: string;
  members: TravelPartyMember[];
}

export function useTravelParty() {
  const { guest } = useGuestAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch or create travel party
  const { data: travelParty, isLoading, error } = useQuery({
    queryKey: ['travel-party', guest?.guestId],
    queryFn: async () => {
      if (!guest?.guestId) return null;
      
      const { data, error } = await supabase.rpc('guest_get_or_create_travel_party', {
        p_guest_id: guest.guestId,
      });
      
      if (error) throw error;
      return data as unknown as TravelParty;
    },
    enabled: !!guest?.guestId,
    staleTime: 60000, // 1 minute
  });

  // Add party member
  const addMemberMutation = useMutation({
    mutationFn: async ({
      displayName,
      memberType,
      birthYear,
      relationshipLabel,
    }: {
      displayName: string;
      memberType: 'adult' | 'child';
      birthYear?: number;
      relationshipLabel?: string;
    }) => {
      if (!guest?.guestId) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('guest_add_party_member', {
        p_guest_id: guest.guestId,
        p_display_name: displayName,
        p_member_type: memberType,
        p_birth_year: birthYear || null,
        p_relationship_label: relationshipLabel || null,
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['travel-party'] });
      toast({
        title: 'Member added',
        description: 'The member has been added to your travel party.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Link room to party
  const linkRoomMutation = useMutation({
    mutationFn: async ({
      roomNumber,
      lastName,
      pin,
    }: {
      roomNumber: string;
      lastName: string;
      pin: string;
    }) => {
      if (!guest?.guestId) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('guest_link_room_to_party', {
        p_lead_guest_id: guest.guestId,
        p_room_number: roomNumber,
        p_last_name: lastName,
        p_pin: pin,
      });
      
      if (error) throw error;
      return data as { success: boolean; error?: string; member_id?: string };
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['travel-party'] });
        toast({
          title: 'Room linked',
          description: 'The room has been linked to your travel party.',
        });
      } else {
        toast({
          title: 'Could not link room',
          description: data.error || 'Please check the details and try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove party member
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!guest?.guestId) throw new Error('Not authenticated');
      
      const { data, error } = await supabase.rpc('guest_remove_party_member', {
        p_lead_guest_id: guest.guestId,
        p_member_id: memberId,
      });
      
      if (error) throw error;
      return data as { success: boolean; error?: string };
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['travel-party'] });
        toast({
          title: 'Member removed',
          description: 'The member has been removed from your travel party.',
        });
      } else {
        toast({
          title: 'Could not remove member',
          description: data.error || 'Please try again.',
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Get members grouped by room
  const membersByRoom = travelParty?.members?.reduce((acc, member) => {
    const room = member.room_number || 'No Room';
    if (!acc[room]) acc[room] = [];
    acc[room].push(member);
    return acc;
  }, {} as Record<string, TravelPartyMember[]>) || {};

  const adultsCount = travelParty?.members?.filter(m => m.member_type === 'adult').length || 0;
  const childrenCount = travelParty?.members?.filter(m => m.member_type === 'child').length || 0;
  const roomsCount = Object.keys(membersByRoom).filter(r => r !== 'No Room').length;

  return {
    travelParty,
    isLoading,
    error,
    membersByRoom,
    adultsCount,
    childrenCount,
    roomsCount,
    addMember: addMemberMutation.mutateAsync,
    isAddingMember: addMemberMutation.isPending,
    linkRoom: linkRoomMutation.mutateAsync,
    isLinkingRoom: linkRoomMutation.isPending,
    removeMember: removeMemberMutation.mutateAsync,
    isRemovingMember: removeMemberMutation.isPending,
  };
}
