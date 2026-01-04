import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { RestaurantTimeSlot, Restaurant, Guest } from '@/types/database';
import { useBookingSource } from '@/hooks/useBookingSource';
import { createRestaurantReservation } from '@/lib/booking-service';
import { getBookingErrorMessage } from '@/lib/booking-errors';
import { awardLoyaltyPoints } from '@/hooks/useLoyaltyProgram';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { GuestSearchDialog } from '@/components/bookings/GuestSearchDialog';
import { format, parseISO } from 'date-fns';
import { AlertCircle, Loader2 } from 'lucide-react';

interface RestaurantReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slot?: RestaurantTimeSlot & { restaurant?: Restaurant };
  guest?: Guest;
  onSuccess: () => void;
}

export function RestaurantReservationDialog({
  open,
  onOpenChange,
  slot,
  guest: initialGuest,
  onSuccess,
}: RestaurantReservationDialogProps) {
  const [loading, setLoading] = useState(false);
  const [guestSearchOpen, setGuestSearchOpen] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(initialGuest || null);
  const [formData, setFormData] = useState({
    num_adults: 2,
    num_children: 0,
    special_requests: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const { user } = useAuth();
  const { currentResort } = useResort();
  const { toast } = useToast();
  const bookingSource = useBookingSource();

  useEffect(() => {
    if (open) {
      setSelectedGuest(initialGuest || null);
      // Reset to sensible defaults - 1 adult, not 2
      setFormData({ num_adults: 1, num_children: 0, special_requests: '' });
      setValidationError(null);
    }
  }, [open, initialGuest]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    const currentGuest = selectedGuest || initialGuest;
    
    if (!slot || !currentGuest || !currentResort) {
      setValidationError('Please select a guest');
      return;
    }

    setLoading(true);

    // Use centralized BookingService
    const result = await createRestaurantReservation({
      resortId: currentResort.id,
      slotId: slot.id,
      guestId: currentGuest.id,
      roomNumber: currentGuest.room_number,
      numAdults: formData.num_adults,
      numChildren: formData.num_children,
      specialRequests: formData.special_requests || undefined,
      source: bookingSource,
      createdByUserId: user?.id,
    });

    if (!result.success) {
      const errorMessage = result.errorCode 
        ? getBookingErrorMessage(result.errorCode, 'staff')
        : result.error || 'Failed to create reservation';
      setValidationError(errorMessage);
      setLoading(false);
      return;
    }

    // Handle duplicate detection
    if (result.alreadyExists) {
      toast({ 
        title: 'Existing Reservation Found', 
        description: 'This guest already has an active reservation for this time slot.',
        variant: 'default',
      });
      onSuccess();
      onOpenChange(false);
      setLoading(false);
      return;
    }

    // Award loyalty points (fire and forget)
    if (result.reservationId && currentGuest) {
      const totalPax = formData.num_adults + formData.num_children;
      const pointsToAward = totalPax * 25; // 25 points per person
      awardLoyaltyPoints(
        currentGuest.id,
        currentResort.id,
        'dining_booking',
        pointsToAward,
        result.reservationId,
        'restaurant_reservation',
        `Restaurant: ${slot.restaurant?.name || 'Restaurant'}`
      ).catch(console.error);
    }

    toast({ title: 'Success', description: 'Reservation created successfully' });
    onSuccess();
    onOpenChange(false);
    setLoading(false);
  };

  const currentGuest = selectedGuest || initialGuest;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Restaurant Reservation</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            {/* Validation Error */}
            {validationError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            )}

            {/* Guest Selection */}
            {!initialGuest && (
              <div className="space-y-2">
                <Label>Guest *</Label>
                {currentGuest ? (
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{currentGuest.full_name}</p>
                      <p className="text-sm text-muted-foreground">Room {currentGuest.room_number}</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => setGuestSearchOpen(true)}>
                      Change
                    </Button>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full" onClick={() => setGuestSearchOpen(true)}>
                    Select Guest
                  </Button>
                )}
              </div>
            )}

            {/* Slot Summary */}
            {slot && (
              <div className="p-3 border rounded-lg bg-muted/50">
                <p className="font-medium">{slot.restaurant?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(slot.date), 'EEE, MMM d')} • {slot.start_time.slice(0, 5)}
                </p>
                <Badge variant="outline" className="mt-1">{slot.meal_period}</Badge>
              </div>
            )}

            {/* Pax Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Adults *</Label>
                <NumericInput
                  min={1}
                  value={formData.num_adults}
                  onChange={(value) => setFormData({ ...formData, num_adults: value })}
                  defaultValue={1}
                />
              </div>
              <div className="space-y-2">
                <Label>Children</Label>
                <NumericInput
                  min={0}
                  value={formData.num_children}
                  onChange={(value) => setFormData({ ...formData, num_children: value })}
                  defaultValue={0}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Special Requests</Label>
              <Textarea
                value={formData.special_requests}
                onChange={(e) => setFormData({ ...formData, special_requests: e.target.value })}
                placeholder="Dietary requirements, seating preferences, or special occasions"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !currentGuest}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : 'Create Reservation'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <GuestSearchDialog
        open={guestSearchOpen}
        onOpenChange={setGuestSearchOpen}
        onSelect={setSelectedGuest}
      />
    </>
  );
}
