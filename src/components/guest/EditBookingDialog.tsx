import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NumberStepper } from '@/components/ui/number-stepper';
import { Loader2, Users, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getSessionRemainingCapacity, getSlotRemainingCapacity } from '@/lib/booking-validation';

interface EditBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: {
    id: string;
    type: 'activity' | 'restaurant';
    title: string;
    num_adults: number;
    num_children: number;
    session_id?: string;
    slot_id?: string;
    max_pax_per_booking?: number;
  } | null;
}

export function EditBookingDialog({ open, onOpenChange, booking }: EditBookingDialogProps) {
  const { guest } = useGuestAuth();
  const queryClient = useQueryClient();
  const [numAdults, setNumAdults] = useState(1);
  const [numChildren, setNumChildren] = useState(0);

  // Reset form when booking changes
  useEffect(() => {
    if (booking) {
      setNumAdults(booking.num_adults);
      setNumChildren(booking.num_children);
    }
  }, [booking]);

  // Get room occupancy for max limits
  const { data: roomOccupancy = 2 } = useQuery({
    queryKey: ['room-occupancy', guest?.resortId, guest?.roomNumber],
    queryFn: async () => {
      if (!guest?.resortId || !guest?.roomNumber) return 2;
      const { count } = await supabase
        .from('guests')
        .select('id', { count: 'exact', head: true })
        .eq('resort_id', guest.resortId)
        .eq('room_number', guest.roomNumber);
      return count || 2;
    },
    enabled: !!guest && open,
  });

  // Get remaining capacity (plus current booking's pax since we're modifying it)
  const { data: availableCapacity, isLoading: loadingCapacity } = useQuery({
    queryKey: ['edit-booking-capacity', booking?.id, booking?.type, booking?.session_id, booking?.slot_id],
    queryFn: async () => {
      if (!booking) return 0;
      const currentPax = booking.num_adults + booking.num_children;
      
      if (booking.type === 'activity' && booking.session_id) {
        const remaining = await getSessionRemainingCapacity(booking.session_id);
        // Add back current booking's pax since we're modifying it
        return remaining + currentPax;
      } else if (booking.type === 'restaurant' && booking.slot_id) {
        const remaining = await getSlotRemainingCapacity(booking.slot_id);
        return remaining + currentPax;
      }
      return 0;
    },
    enabled: !!booking && open,
  });

  // Calculate max allowed pax
  const maxPax = Math.min(
    roomOccupancy,
    availableCapacity || 99,
    booking?.max_pax_per_booking || 99
  );

  const totalPax = numAdults + numChildren;
  const hasChanges = booking && (numAdults !== booking.num_adults || numChildren !== booking.num_children);
  const isOverCapacity = totalPax > maxPax;

  const updateActivityMutation = useMutation({
    mutationFn: async ({ bookingId, numAdults, numChildren }: { bookingId: string; numAdults: number; numChildren: number }) => {
      const { error } = await supabase
        .from('activity_bookings')
        .update({ num_adults: numAdults, num_children: numChildren })
        .eq('id', bookingId)
        .eq('guest_id', guest!.guestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Booking updated successfully');
      queryClient.invalidateQueries({ queryKey: ['guest-room-bookings'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update booking');
    },
  });

  const updateReservationMutation = useMutation({
    mutationFn: async ({ bookingId, numAdults, numChildren }: { bookingId: string; numAdults: number; numChildren: number }) => {
      const { error } = await supabase
        .from('restaurant_reservations')
        .update({ num_adults: numAdults, num_children: numChildren })
        .eq('id', bookingId)
        .eq('guest_id', guest!.guestId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Reservation updated successfully');
      queryClient.invalidateQueries({ queryKey: ['guest-room-bookings'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update reservation');
    },
  });

  const handleSave = () => {
    if (!booking || !hasChanges || isOverCapacity) return;
    
    if (booking.type === 'activity') {
      updateActivityMutation.mutate({ bookingId: booking.id, numAdults, numChildren });
    } else {
      updateReservationMutation.mutate({ bookingId: booking.id, numAdults, numChildren });
    }
  };

  const isPending = updateActivityMutation.isPending || updateReservationMutation.isPending;

  if (!booking) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Modify Booking</DialogTitle>
          <DialogDescription>
            Update the number of guests for "{booking.title}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {loadingCapacity ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <NumberStepper
                value={numAdults}
                onChange={(val) => {
                  // Ensure at least 1 adult
                  if (val >= 1 && val + numChildren <= maxPax) {
                    setNumAdults(val);
                  }
                }}
                min={1}
                max={Math.max(1, maxPax - numChildren)}
                label="Adults"
              />

              <NumberStepper
                value={numChildren}
                onChange={(val) => {
                  if (val >= 0 && numAdults + val <= maxPax) {
                    setNumChildren(val);
                  }
                }}
                min={0}
                max={Math.max(0, maxPax - numAdults)}
                label="Children"
              />

              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                <Users className="h-4 w-4 shrink-0" />
                <span>
                  Total: {totalPax} {totalPax === 1 ? 'guest' : 'guests'}
                  {maxPax < 99 && ` (max ${maxPax})`}
                </span>
              </div>

              {isOverCapacity && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Not enough space available. Please reduce the number of guests.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || isOverCapacity || isPending || loadingCapacity}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
