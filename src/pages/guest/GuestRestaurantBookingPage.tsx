import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Calendar, Clock, Users, Loader2, CheckCircle, AlertCircle, Utensils } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function GuestRestaurantBookingPage() {
  const { slotId } = useParams();
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const queryClient = useQueryClient();

  const [numAdults, setNumAdults] = useState(2);
  const [numChildren, setNumChildren] = useState(0);
  const [specialRequests, setSpecialRequests] = useState('');
  const [bookingResult, setBookingResult] = useState<{
    success: boolean;
    requiresApproval?: boolean;
    error?: string;
  } | null>(null);

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
      const { data, error } = await supabase.rpc('guest_create_restaurant_reservation', {
        p_guest_id: guest.guestId,
        p_slot_id: slotId,
        p_num_adults: numAdults,
        p_num_children: numChildren,
        p_special_requests: specialRequests.trim() || null,
      });
      if (error) throw error;
      return data as { success: boolean; reservation_id?: string; status?: string; requires_approval?: boolean; error?: string };
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['guest-available-slots'] });
        setBookingResult({
          success: true,
          requiresApproval: data.requires_approval,
        });
      } else {
        setBookingResult({
          success: false,
          error: data.error || 'Failed to create reservation',
        });
      }
    },
    onError: (error: Error) => {
      setBookingResult({
        success: false,
        error: error.message,
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
              {bookingResult.requiresApproval ? 'Request Submitted!' : 'Reservation Confirmed!'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {bookingResult.requiresApproval
                ? 'Your request has been submitted. We will confirm your reservation soon.'
                : `Your table at ${slot.restaurant_name} is confirmed.`}
            </p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate('/guest/bookings')}>
                View My Bookings
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/guest/restaurants')}>
                Book More Reservations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPax = numAdults + numChildren;
  const maxPax = slot.max_pax_per_booking;

  return (
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
            <p className="font-medium mb-1">Reservation Rules:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• Maximum {maxPax} guests per reservation</li>
              <li>• Reserve at least {slot.guest_cutoff_minutes} minutes before</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Booking Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Guest Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Adults</Label>
              <Input
                type="number"
                min={1}
                max={maxPax - numChildren}
                value={numAdults}
                onChange={(e) => setNumAdults(Math.max(1, Math.min(maxPax - numChildren, parseInt(e.target.value) || 1)))}
              />
            </div>
            <div className="space-y-2">
              <Label>Children</Label>
              <Input
                type="number"
                min={0}
                max={maxPax - numAdults}
                value={numChildren}
                onChange={(e) => setNumChildren(Math.max(0, Math.min(maxPax - numAdults, parseInt(e.target.value) || 0)))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Special Requests (optional)</Label>
            <Textarea
              placeholder="Any special requests? e.g., birthday celebration, dietary requirements, highchair needed..."
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              maxLength={500}
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

          <Button
            className="w-full"
            onClick={() => bookMutation.mutate()}
            disabled={bookMutation.isPending || totalPax > slot.remaining_covers || totalPax < 1}
          >
            {bookMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {slot.requires_approval ? 'Submit Request' : 'Confirm Reservation'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
