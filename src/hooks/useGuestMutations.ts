import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import { useToast } from '@/hooks/use-toast';

interface GuestFormData {
  full_name: string;
  room_number: string;
  check_in_date: string;
  check_out_date: string;
  nationality?: string | null;
  email?: string | null;
  phone?: string | null;
  booking_reference?: string | null;
  channel?: string | null;
  notes?: string | null;
}

interface CreateGuestResult {
  guest: {
    id: string;
    resort_id: string;
    full_name: string;
    room_number: string;
    check_in_date: string;
    check_out_date: string;
    email: string | null;
    phone: string | null;
    nationality: string | null;
    booking_reference: string | null;
    channel: string | null;
    notes: string | null;
    portal_enabled: boolean;
    portal_pin_last4: string | null;
    portal_pin_set_at: string | null;
    created_at: string;
    updated_at: string;
  };
  pin?: string;
}

interface CreateGuestOptions {
  resortId: string;
  data: GuestFormData;
  generatePin?: boolean;
}

interface UpdateGuestOptions {
  guestId: string;
  resortId: string;
  data: Partial<GuestFormData>;
}

interface DeleteGuestOptions {
  guestId: string;
  resortId: string;
}

/**
 * Hook for guest mutations with automatic cache invalidation.
 * Ensures immediate data availability across staff and guest portals.
 */
export function useGuestMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  /**
   * Create a new guest with optional PIN generation.
   * Returns the full guest object and PIN if generated.
   */
  const createGuest = useMutation({
    mutationFn: async ({ resortId, data, generatePin = true }: CreateGuestOptions): Promise<CreateGuestResult> => {
      // Insert guest
      const { data: guest, error: insertError } = await supabase
        .from('guests')
        .insert({
          resort_id: resortId,
          full_name: data.full_name.trim(),
          room_number: data.room_number.trim(),
          check_in_date: data.check_in_date,
          check_out_date: data.check_out_date,
          nationality: data.nationality?.trim() || null,
          email: data.email?.trim() || null,
          phone: data.phone?.trim() || null,
          booking_reference: data.booking_reference?.trim() || null,
          channel: data.channel || null,
          notes: data.notes?.trim() || null,
        })
        .select('*')
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      let pin: string | undefined;

      // Optionally generate PIN for immediate guest access
      if (generatePin) {
        const { data: pinResult, error: pinError } = await supabase.rpc('generate_guest_pin', {
          p_guest_id: guest.id,
        });

        if (!pinError && pinResult) {
          const result = pinResult as { success: boolean; pin?: string };
          if (result.success && result.pin) {
            pin = result.pin;
            // Refetch guest to get updated portal fields
            const { data: updatedGuest } = await supabase
              .from('guests')
              .select('*')
              .eq('id', guest.id)
              .single();
            
            if (updatedGuest) {
              return { guest: updatedGuest as CreateGuestResult['guest'], pin };
            }
          }
        }
      }

      return { guest: guest as CreateGuestResult['guest'], pin };
    },
    onSuccess: (result, { resortId }) => {
      // Invalidate all guest-related queries immediately
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.list(resortId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.arrivals(resortId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.inHouse(resortId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.roomGuests(resortId, result.guest.room_number) });
      
      // Also invalidate prearrival queries
      queryClient.invalidateQueries({ queryKey: ['prearrival-statuses', resortId] });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create guest',
      });
    },
  });

  /**
   * Update an existing guest.
   */
  const updateGuest = useMutation({
    mutationFn: async ({ guestId, resortId, data }: UpdateGuestOptions) => {
      const updateData: Record<string, unknown> = {};
      
      if (data.full_name !== undefined) updateData.full_name = data.full_name.trim();
      if (data.room_number !== undefined) updateData.room_number = data.room_number.trim();
      if (data.check_in_date !== undefined) updateData.check_in_date = data.check_in_date;
      if (data.check_out_date !== undefined) updateData.check_out_date = data.check_out_date;
      if (data.nationality !== undefined) updateData.nationality = data.nationality?.trim() || null;
      if (data.email !== undefined) updateData.email = data.email?.trim() || null;
      if (data.phone !== undefined) updateData.phone = data.phone?.trim() || null;
      if (data.booking_reference !== undefined) updateData.booking_reference = data.booking_reference?.trim() || null;
      if (data.channel !== undefined) updateData.channel = data.channel || null;
      if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

      const { data: guest, error } = await supabase
        .from('guests')
        .update(updateData as never)
        .eq('id', guestId)
        .select('*')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return { guest, resortId };
    },
    onSuccess: ({ guest, resortId }) => {
      // Invalidate guest queries
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.list(resortId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.detail(resortId, guest.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.arrivals(resortId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.inHouse(resortId) });
      
      toast({
        title: 'Success',
        description: 'Guest updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to update guest',
      });
    },
  });

  /**
   * Delete a guest.
   */
  const deleteGuest = useMutation({
    mutationFn: async ({ guestId }: DeleteGuestOptions) => {
      const { error } = await supabase
        .from('guests')
        .delete()
        .eq('id', guestId);

      if (error) {
        throw new Error(error.message);
      }

      return { guestId };
    },
    onSuccess: (_, { resortId }) => {
      // Invalidate guest list
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.list(resortId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.arrivals(resortId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.inHouse(resortId) });
      
      toast({
        title: 'Success',
        description: 'Guest deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to delete guest',
      });
    },
  });

  /**
   * Generate or reset PIN for a guest.
   */
  const generatePin = useMutation({
    mutationFn: async ({ guestId, resortId }: { guestId: string; resortId: string }) => {
      const { data, error } = await supabase.rpc('generate_guest_pin', {
        p_guest_id: guestId,
      });

      if (error) {
        throw new Error(error.message);
      }

      const result = data as { success: boolean; pin?: string; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate PIN');
      }

      return { pin: result.pin!, guestId, resortId };
    },
    onSuccess: ({ guestId, resortId }) => {
      // Invalidate guest detail to show updated PIN info
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.detail(resortId, guestId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.guests.list(resortId) });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to generate PIN',
      });
    },
  });

  return {
    createGuest,
    updateGuest,
    deleteGuest,
    generatePin,
  };
}
