import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { RestaurantTimeSlot, Restaurant, Guest } from '@/types/database';
import { useBookingSource } from '@/hooks/useBookingSource';
import { validateRestaurantReservation } from '@/lib/booking-validation';
import { getBookingErrorMessage } from '@/lib/booking-errors';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { GuestSearchDialog } from '@/components/bookings/GuestSearchDialog';
import { format, parseISO } from 'date-fns';
import { AlertCircle } from 'lucide-react';

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
      setFormData({ num_adults: 2, num_children: 0, special_requests: '' });
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

    // Use centralized validation
    const validationResult = await validateRestaurantReservation({
      resortId: currentResort.id,
      guestId: currentGuest.id,
      slotId: slot.id,
      numAdults: formData.num_adults,
      numChildren: formData.num_children,
      source: bookingSource,
    });

    if (!validationResult.ok) {
      const errorMessage = getBookingErrorMessage(validationResult.errorCode!, 'staff');
      setValidationError(validationResult.details || errorMessage);
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('restaurant_reservations')
      .insert({
        resort_id: currentResort.id,
        restaurant_slot_id: slot.id,
        guest_id: currentGuest.id,
        room_number: currentGuest.room_number,
        status: 'CONFIRMED',
        source: bookingSource,
        num_adults: formData.num_adults,
        num_children: formData.num_children,
        special_requests: formData.special_requests || null,
        created_by_user_id: user?.id || null,
      });

    if (error) {
      setValidationError(error.message);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Success', description: 'Reservation created successfully' });
      onSuccess();
      onOpenChange(false);
    }
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
          <form onSubmit={handleSubmit} className="space-y-4">
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
                <Input
                  type="number"
                  min={1}
                  value={formData.num_adults}
                  onChange={(e) => setFormData({ ...formData, num_adults: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Children</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.num_children}
                  onChange={(e) => setFormData({ ...formData, num_children: parseInt(e.target.value) || 0 })}
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
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !currentGuest}>
                {loading ? 'Creating...' : 'Create Reservation'}
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
