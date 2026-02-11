import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getBookingErrorMessage, BookingErrorCode } from '@/lib/booking-errors';
import { createGuestNotification, createStaffNotificationsForRoles, formatRestaurantReservationMessage } from '@/lib/notifications';
import { awardLoyaltyPoints } from '@/hooks/useLoyaltyProgram';
import { useGuestDiningSync } from '@/hooks/useDiningBookingSync';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowLeft, Calendar, Clock, Users, Loader2, CheckCircle, AlertCircle, Utensils, Info } from 'lucide-react';
import { MobilePageHeader } from '@/components/guest/MobilePageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { NumberStepper } from '@/components/ui/number-stepper';

// Map server error messages to error codes
function mapErrorToCode(error: string): BookingErrorCode {
  const lowerError = error.toLowerCase();
  if (lowerError.includes('capacity') || lowerError.includes('full')) return 'SLOT_FULL';
  if (lowerError.includes('cutoff') || lowerError.includes('booking window')) return 'CUTOFF_PAST';
  if (lowerError.includes('stay dates') || lowerError.includes('check-in') || lowerError.includes('check-out')) return 'OUTSIDE_STAY_DATES';
  if (lowerError.includes('max') || lowerError.includes('party size')) return 'MAX_PAX_EXCEEDED';
  if (lowerError.includes('not available') || lowerError.includes('disabled')) return 'GUEST_BOOKING_DISABLED';
  return 'UNKNOWN_ERROR';
}

export default function GuestRestaurantBookingPage() {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const queryClient = useQueryClient();

  const [numAdults, setNumAdults] = useState(2);
  const [numChildren, setNumChildren] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    success: boolean;
    requiresApproval?: boolean;
    error?: string;
  } | null>(null);

  // Enable real-time sync for dining bookings (must pass resortId for guest sessions)
  useGuestDiningSync(guest?.guestId, guest?.resortId);

  // Fetch room occupancy (number of guests in the same room)
  const { data: roomOccupancy = 2 } = useQuery({
    queryKey: ['room-occupancy', guest?.resortId, guest?.roomNumber],
    queryFn: async () => {
      if (!guest) return 2;
      const { count, error } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', guest.resortId)
        .eq('room_number', guest.roomNumber);
      if (error) return 2;
      return count || 2;
    },
    enabled: !!guest,
  });

  // Check for existing bookings on this slot by anyone in the same room
  const { data: roomBooking } = useQuery({
    queryKey: ['room-slot-booking', slotId, guest?.resortId, guest?.roomNumber],
    queryFn: async () => {
      if (!guest || !slotId) return null;
      // Get all guests in the same room
      const { data: roomGuests, error: roomError } = await supabase
        .from('guests')
        .select('id, full_name')
        .eq('resort_id', guest.resortId)
        .eq('room_number', guest.roomNumber);
      if (roomError || !roomGuests?.length) return null;
      
      const roomGuestIds = roomGuests.map(g => g.id);
      
      // Check for existing reservations for this slot by any room guest
      const { data: reservations, error } = await supabase
        .from('restaurant_reservations')
        .select('id, guest_id, num_adults, num_children, status')
        .eq('restaurant_slot_id', slotId)
        .in('guest_id', roomGuestIds)
        .in('status', ['CONFIRMED', 'PENDING']);
      
      if (error || !reservations?.length) return null;
      
      const existing = reservations[0];
      const bookedBy = roomGuests.find(g => g.id === existing.guest_id);
      return {
        ...existing,
        booked_by_name: bookedBy?.full_name || 'Someone in your room',
        is_own_booking: existing.guest_id === guest.guestId,
      };
    },
    enabled: !!guest && !!slotId,
  });

  // Fetch slot details
  const { data: slot, isLoading } = useQuery({
    queryKey: ['guest-slot-detail', slotId, guest?.guestId],
    queryFn: async () => {
      if (!guest || !slotId) return null;
      const { data, error } = await supabase.rpc('guest_get_available_slots', {
        p_guest_id: guest.guestId,
        p_date: null,
        p_restaurant_id: null,
      });
      if (error) throw error;
      const slots = (data as any[]) || [];
      return slots.find((s) => s.id === slotId) || null;
    },
    enabled: !!guest && !!slotId,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!guest || !slotId) throw new Error('Invalid state');
      
      // Fetch resort to check if it's a demo resort
      const { data: resortData } = await supabase
        .from('resorts')
        .select('is_demo, code')
        .eq('id', guest.resortId)
        .single();
      
      const isDemoResort = resortData?.is_demo || resortData?.code === 'DEMO';
      
      const { data, error } = await supabase.rpc('guest_create_restaurant_reservation', {
        p_guest_id: guest.guestId,
        p_slot_id: slotId,
        p_num_adults: numAdults,
        p_num_children: numChildren,
        p_special_requests: specialRequests.trim() || null,
      });
      if (error) throw error;
      
      const result = data as { success: boolean; reservation_id?: string; status?: string; requires_approval?: boolean; error?: string };
      
      // If demo resort, update the reservation with origin='demo_user'
      if (isDemoResort && result?.success && result?.reservation_id) {
        await supabase
          .from('restaurant_reservations')
          .update({ origin: 'demo_user' })
          .eq('id', result.reservation_id);
      }
      
      return result;
    },
    onSuccess: async (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['guest-available-slots'] });
        queryClient.invalidateQueries({ queryKey: ['guest-room-bookings'] });
        setBookingResult({
          success: true,
          requiresApproval: data.requires_approval,
        });

        // Send notifications (fire and forget)
        if (slot && guest) {
          const dateStr = format(parseISO(slot.date), 'EEE, MMM d');
          const timeStr = slot.start_time.slice(0, 5);
          const messages = formatRestaurantReservationMessage(
            slot.restaurant_name,
            dateStr,
            timeStr,
            numAdults + numChildren,
            guest.fullName,
            guest.roomNumber
          );

          // Guest notification
          const notifType = data.requires_approval ? 'RESTAURANT_RESERVATION_PENDING' : 'RESTAURANT_RESERVATION_CONFIRMED';
          const notifMessage = data.requires_approval ? messages.guest.pending : messages.guest.confirmed;
          createGuestNotification({
            resort_id: guest.resortId,
            guest_id: guest.guestId,
            type: notifType,
            title: data.requires_approval ? 'Reservation Request Sent' : 'Table Reserved',
            message: notifMessage,
            link_url: '/guest/bookings',
          }).catch(console.error);

          // Staff notification for pending requests
          if (data.requires_approval) {
            createStaffNotificationsForRoles({
              resort_id: guest.resortId,
              roles: ['RESORT_ADMIN', 'FRONT_OFFICE', 'FNB'],
              type: 'RESTAURANT_RESERVATION_PENDING',
              title: 'New Restaurant Request',
              message: messages.staff.pending,
              link_url: '/staff/guest-requests',
            }).catch(console.error);
          }

          // Award loyalty points for confirmed reservations (fire and forget)
          if (!data.requires_approval && data.reservation_id) {
            const totalPax = numAdults + numChildren;
            const pointsToAward = totalPax * 25; // 25 points per person
            awardLoyaltyPoints(
              guest.guestId,
              guest.resortId,
              'dining_booking',
              pointsToAward,
              data.reservation_id,
              'restaurant_reservation',
              `Restaurant: ${slot.restaurant_name}`
            ).catch(console.error);
          }
        }
      } else {
        // Map server error to user-friendly message
        const errorCode = mapErrorToCode(data.error || '');
        const friendlyMessage = getBookingErrorMessage(errorCode, 'guest');
        setBookingResult({
          success: false,
          error: friendlyMessage,
        });
      }
    },
    onError: (error: Error) => {
      const errorCode = mapErrorToCode(error.message);
      const friendlyMessage = getBookingErrorMessage(errorCode, 'guest');
      setBookingResult({
        success: false,
        error: friendlyMessage,
      });
    },
  });

  if (!guest) return null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!slot) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/guest/restaurants')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Restaurants
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              This time slot is no longer available for booking.
            </p>
            <Button className="mt-4" onClick={() => navigate('/guest/restaurants')}>
              Browse Restaurants
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Booking success screen
  if (bookingResult?.success) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="py-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              {bookingResult.requiresApproval ? 'Request Sent!' : 'Table Booked!'}
            </h2>
            <p className="text-muted-foreground mb-2">
              {bookingResult.requiresApproval
                ? `We've sent your request for ${slot.restaurant_name} on ${format(parseISO(slot.date), 'EEE, MMM d')} at ${slot.start_time.slice(0, 5)}.`
                : `Your table at ${slot.restaurant_name} on ${format(parseISO(slot.date), 'EEE, MMM d')} at ${slot.start_time.slice(0, 5)} is confirmed.`}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {bookingResult.requiresApproval
                ? "We'll confirm your table as soon as possible."
                : "You can view or cancel this in 'My Bookings'."}
            </p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate('/guest/bookings')}>
                View My Bookings
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/guest/restaurants')}>
                Back to Restaurants
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPax = numAdults + numChildren;
  // Max is the minimum of: max_pax_per_booking, remaining_covers, roomOccupancy
  const effectiveMax = Math.min(slot.max_pax_per_booking, slot.remaining_covers, roomOccupancy);
  const hasRoomBooking = !!roomBooking;

  const handleBooking = () => {
    if (roomBooking?.is_own_booking) {
      setShowDuplicateWarning(true);
    } else {
      bookMutation.mutate();
    }
  };

  return (
    <>
      {/* Duplicate booking warning dialog */}
      <AlertDialog open={showDuplicateWarning} onOpenChange={setShowDuplicateWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>You already have a booking</AlertDialogTitle>
            <AlertDialogDescription>
              You already have a reservation for this time slot ({roomBooking?.num_adults + roomBooking?.num_children} guests). 
              Are you sure you want to book another table?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep existing booking</AlertDialogCancel>
            <AlertDialogAction onClick={() => bookMutation.mutate()}>
              Book another table
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/guest/restaurants')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Restaurants
      </Button>

      {/* Slot Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Utensils className="h-5 w-5" />
                {slot.restaurant_name}
              </CardTitle>
              <CardDescription>{slot.meal_period}</CardDescription>
            </div>
            {slot.requires_approval && (
              <Badge variant="warning">Request Only</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(parseISO(slot.date), 'EEE, MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
            </div>
            <div className="flex items-center gap-2 col-span-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{slot.remaining_covers} covers available</span>
            </div>
          </div>

          {slot.description && (
            <p className="text-sm text-muted-foreground">{slot.description}</p>
          )}

          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium mb-1">Good to know:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• Maximum {slot.max_pax_per_booking} guests per reservation</li>
              <li>• Online booking closes {slot.guest_cutoff_minutes} minutes before</li>
              {slot.guest_can_cancel && (
                <li>• You can cancel online up to {slot.guest_cancel_cutoff_minutes} minutes before</li>
              )}
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Booking Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Number of Guests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Room booking alert */}
          {hasRoomBooking && !roomBooking?.is_own_booking && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {roomBooking?.booked_by_name} has already booked this time slot for your room 
                ({roomBooking?.num_adults + roomBooking?.num_children} guests). 
                You can view this in "My Bookings".
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <NumberStepper
              label="Adults"
              value={numAdults}
              onChange={setNumAdults}
              min={1}
              max={Math.max(1, effectiveMax - numChildren)}
              disabled={hasRoomBooking && !roomBooking?.is_own_booking}
            />
            <NumberStepper
              label="Children"
              value={numChildren}
              onChange={setNumChildren}
              min={0}
              max={Math.max(0, effectiveMax - numAdults)}
              disabled={hasRoomBooking && !roomBooking?.is_own_booking}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Special requests (optional)</label>
            <Textarea
              placeholder="e.g., birthday celebration, dietary requirements, highchair needed..."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              maxLength={500}
              disabled={hasRoomBooking && !roomBooking?.is_own_booking}
            />
          </div>

          {bookingResult?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{bookingResult.error}</AlertDescription>
            </Alert>
          )}

          {totalPax > slot.remaining_covers && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Only {slot.remaining_covers} covers available. Please reduce the number of guests.
              </AlertDescription>
            </Alert>
          )}

          {hasRoomBooking && !roomBooking?.is_own_booking ? (
            <Button
              className="w-full"
              variant="outline"
              onClick={() => navigate('/guest/bookings')}
            >
              View My Bookings
            </Button>
          ) : (
            <Button
              className="w-full"
              onClick={handleBooking}
              disabled={bookMutation.isPending || totalPax > slot.remaining_covers || totalPax < 1}
            >
              {bookMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirming your reservation...
                </>
              ) : (
                slot.requires_approval ? 'Submit Request' : 'Confirm Reservation'
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
    </>
  );
}
