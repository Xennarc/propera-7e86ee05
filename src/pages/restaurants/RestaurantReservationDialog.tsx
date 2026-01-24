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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { GuestSearchDialog } from '@/components/bookings/GuestSearchDialog';
import { format, parseISO } from 'date-fns';
import { AlertCircle, Loader2 } from 'lucide-react';

interface SlotWithCapacity extends RestaurantTimeSlot {
  restaurant?: Restaurant;
  bookedCovers?: number;
  remaining?: number;
}

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
  const [selectedSlot, setSelectedSlot] = useState<SlotWithCapacity | null>(slot || null);
  
  // Restaurant/date/slot selection state (when no slot provided)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [slots, setSlots] = useState<SlotWithCapacity[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  
  const [formData, setFormData] = useState({
    num_adults: 1,
    num_children: 0,
    special_requests: '',
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const { user } = useAuth();
  const { currentResort } = useResort();
  const { toast } = useToast();
  const bookingSource = useBookingSource();

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedGuest(initialGuest || null);
      setSelectedSlot(slot || null);
      setFormData({ num_adults: 1, num_children: 0, special_requests: '' });
      setValidationError(null);
      if (!slot) {
        setSelectedRestaurantId('');
        setSelectedDate(format(new Date(), 'yyyy-MM-dd'));
        setSlots([]);
      }
    }
  }, [open, initialGuest, slot]);

  // Fetch restaurants when starting from guest (no slot provided)
  useEffect(() => {
    if (open && !slot && currentResort) {
      fetchRestaurants();
    }
  }, [open, slot, currentResort]);

  // Fetch available slots when restaurant/date selected
  useEffect(() => {
    if (!slot && selectedRestaurantId && selectedDate && currentResort) {
      fetchAvailableSlots();
    }
  }, [slot, selectedRestaurantId, selectedDate, currentResort]);

  const fetchRestaurants = async () => {
    if (!currentResort) return;
    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('resort_id', currentResort.id)
      .eq('is_active', true)
      .order('name');
    if (data) setRestaurants(data as Restaurant[]);
  };

  const fetchAvailableSlots = async () => {
    if (!currentResort || !selectedRestaurantId || !selectedDate) return;
    
    setLoadingSlots(true);
    
    // Fetch slots
    const { data: slotsData } = await supabase
      .from('restaurant_time_slots')
      .select(`*, restaurant:restaurants(*)`)
      .eq('resort_id', currentResort.id)
      .eq('restaurant_id', selectedRestaurantId)
      .eq('date', selectedDate)
      .eq('status', 'OPEN')
      .order('start_time');
    
    if (!slotsData || slotsData.length === 0) {
      setSlots([]);
      setLoadingSlots(false);
      return;
    }
    
    // Fetch booked covers for these slots
    const slotIds = slotsData.map(s => s.id);
    const { data: reservationsData } = await supabase
      .from('restaurant_reservations')
      .select('restaurant_slot_id, num_adults, num_children')
      .in('restaurant_slot_id', slotIds)
      .in('status', ['PENDING', 'CONFIRMED']);
    
    // Calculate remaining capacity
    const slotsWithCapacity = slotsData.map(slotItem => {
      const slotReservations = reservationsData?.filter(r => r.restaurant_slot_id === slotItem.id) || [];
      const bookedCovers = slotReservations.reduce((sum, r) => sum + r.num_adults + r.num_children, 0);
      return { 
        ...slotItem, 
        bookedCovers, 
        remaining: slotItem.capacity - bookedCovers 
      } as SlotWithCapacity;
    });
    
    setSlots(slotsWithCapacity);
    setLoadingSlots(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    const currentSlot = selectedSlot || slot;
    const currentGuest = selectedGuest || initialGuest;
    
    if (!currentSlot || !currentGuest || !currentResort) {
      setValidationError('Please select a guest and time slot');
      return;
    }

    setLoading(true);

    // Use centralized BookingService
    const result = await createRestaurantReservation({
      resortId: currentResort.id,
      slotId: currentSlot.id,
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
        `Restaurant: ${currentSlot.restaurant?.name || 'Restaurant'}`
      ).catch(console.error);
    }

    toast({ title: 'Success', description: 'Reservation created successfully' });
    onSuccess();
    onOpenChange(false);
    setLoading(false);
  };

  const currentSlot = selectedSlot || slot;
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

            {/* Restaurant/Date/Slot Selection (if no slot provided) */}
            {!slot && (
              <>
                <div className="space-y-2">
                  <Label>Restaurant *</Label>
                  <select
                    className="w-full h-10 px-3 border rounded-md bg-background"
                    value={selectedRestaurantId}
                    onChange={(e) => { 
                      setSelectedRestaurantId(e.target.value); 
                      setSelectedSlot(null); 
                    }}
                    required
                  >
                    <option value="">Select restaurant</option>
                    {restaurants.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => { 
                      setSelectedDate(e.target.value); 
                      setSelectedSlot(null); 
                    }}
                    required
                  />
                </div>

                {selectedRestaurantId && selectedDate && (
                  <div className="space-y-2">
                    <Label>Available Slots *</Label>
                    {loadingSlots ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm text-muted-foreground">Loading slots...</span>
                      </div>
                    ) : slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">No slots available on this date</p>
                    ) : (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {slots.map(s => (
                          <button
                            key={s.id}
                            type="button"
                            disabled={(s.remaining || 0) <= 0}
                            className={`w-full text-left p-3 border rounded-lg transition-colors ${
                              selectedSlot?.id === s.id 
                                ? 'border-primary bg-primary/5' 
                                : (s.remaining || 0) <= 0 
                                  ? 'opacity-50 cursor-not-allowed bg-muted' 
                                  : 'hover:bg-muted/50'
                            }`}
                            onClick={() => setSelectedSlot(s)}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium">{s.start_time.slice(0, 5)}</span>
                                <Badge variant="outline" className="ml-2 text-xs">{s.meal_period}</Badge>
                              </div>
                              <span className={`text-sm ${(s.remaining || 0) <= 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {(s.remaining || 0) <= 0 ? 'Full' : `${s.remaining} remaining`}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Slot Summary (if provided or selected) */}
            {currentSlot && (
              <div className="p-3 border rounded-lg bg-muted/50">
                <p className="font-medium">{currentSlot.restaurant?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {format(parseISO(currentSlot.date), 'EEE, MMM d')} • {currentSlot.start_time.slice(0, 5)}
                </p>
                <Badge variant="outline" className="mt-1">{currentSlot.meal_period}</Badge>
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
              <Button type="submit" disabled={loading || !currentGuest || !currentSlot}>
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
