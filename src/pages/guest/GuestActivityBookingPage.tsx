import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getBookingErrorMessage, BookingErrorCode } from '@/lib/booking-errors';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Calendar, Clock, Users, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

// Map server error messages to error codes
function mapErrorToCode(error: string): BookingErrorCode {
  const lowerError = error.toLowerCase();
  if (lowerError.includes('capacity') || lowerError.includes('full')) return 'SESSION_FULL';
  if (lowerError.includes('cutoff') || lowerError.includes('booking window')) return 'CUTOFF_PAST';
  if (lowerError.includes('stay dates') || lowerError.includes('check-in') || lowerError.includes('check-out')) return 'OUTSIDE_STAY_DATES';
  if (lowerError.includes('overlap')) return 'OVERLAPPING_BOOKING';
  if (lowerError.includes('max') || lowerError.includes('party size')) return 'MAX_PAX_EXCEEDED';
  if (lowerError.includes('not available') || lowerError.includes('disabled')) return 'GUEST_BOOKING_DISABLED';
  return 'UNKNOWN_ERROR';
}

export default function GuestActivityBookingPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const queryClient = useQueryClient();

  const [numAdults, setNumAdults] = useState(1);
  const [numChildren, setNumChildren] = useState(0);
  const [notes, setNotes] = useState('');
  const [bookingResult, setBookingResult] = useState<{
    success: boolean;
    requiresApproval?: boolean;
    error?: string;
  } | null>(null);

  // Fetch session details
  const { data: session, isLoading } = useQuery({
    queryKey: ['guest-session-detail', sessionId, guest?.guestId],
    queryFn: async () => {
      if (!guest || !sessionId) return null;
      const { data, error } = await supabase.rpc('guest_get_available_sessions', {
        p_guest_id: guest.guestId,
        p_date: null,
        p_category: null,
      });
      if (error) throw error;
      const sessions = (data as any[]) || [];
      return sessions.find((s) => s.id === sessionId) || null;
    },
    enabled: !!guest && !!sessionId,
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!guest || !sessionId) throw new Error('Invalid state');
      const { data, error } = await supabase.rpc('guest_create_activity_booking', {
        p_guest_id: guest.guestId,
        p_session_id: sessionId,
        p_num_adults: numAdults,
        p_num_children: numChildren,
        p_notes: notes.trim() || null,
      });
      if (error) throw error;
      return data as { success: boolean; booking_id?: string; status?: string; requires_approval?: boolean; error?: string };
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['guest-available-sessions'] });
        setBookingResult({
          success: true,
          requiresApproval: data.requires_approval,
        });
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

  if (!session) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/guest/activities')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Activities
        </Button>
        <Card>
          <CardContent className="py-8 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              This activity session is no longer available for booking.
            </p>
            <Button className="mt-4" onClick={() => navigate('/guest/activities')}>
              Browse Activities
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
              {bookingResult.requiresApproval ? 'Request Sent!' : "You're Booked!"}
            </h2>
            <p className="text-muted-foreground mb-2">
              {bookingResult.requiresApproval
                ? `We've sent your request for ${session.activity_name} on ${format(parseISO(session.date), 'EEE, MMM d')} at ${session.start_time.slice(0, 5)}.`
                : `Your booking for ${session.activity_name} on ${format(parseISO(session.date), 'EEE, MMM d')} at ${session.start_time.slice(0, 5)} is confirmed.`}
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              {bookingResult.requiresApproval
                ? "We'll confirm this as soon as possible."
                : "You can find this in 'My Bookings' at any time."}
            </p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => navigate('/guest/bookings')}>
                View My Bookings
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/guest/activities')}>
                Back to Activities
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalPax = numAdults + numChildren;
  const maxPax = session.max_pax_per_booking;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={() => navigate('/guest/activities')}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Activities
      </Button>

      {/* Activity Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>{session.activity_name}</CardTitle>
              <CardDescription>{session.category}</CardDescription>
            </div>
            {session.requires_approval && (
              <Badge variant="warning">Request Only</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{format(parseISO(session.date), 'EEE, MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>{session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{session.remaining_spots} spots available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Duration:</span>
              <span>{session.duration_minutes} min</span>
            </div>
          </div>

          {session.description && (
            <p className="text-sm text-muted-foreground">{session.description}</p>
          )}

          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p className="font-medium mb-1">Good to know:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• Maximum {maxPax} guests per booking</li>
              <li>• Online booking closes {session.guest_cutoff_hours}h before start time</li>
              {session.guest_can_cancel && (
                <li>• You can cancel online up to {session.guest_cancel_cutoff_hours}h before</li>
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
            <Label>Notes for the team (optional)</Label>
            <Textarea
              placeholder="Any special requirements? e.g., dietary needs, mobility assistance..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
            />
          </div>

          {bookingResult?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{bookingResult.error}</AlertDescription>
            </Alert>
          )}

          {totalPax > session.remaining_spots && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Only {session.remaining_spots} spots available. Please reduce the number of guests.
              </AlertDescription>
            </Alert>
          )}

          <Button
            className="w-full"
            onClick={() => bookMutation.mutate()}
            disabled={bookMutation.isPending || totalPax > session.remaining_spots || totalPax < 1}
          >
            {bookMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Confirming your booking...
              </>
            ) : (
              session.requires_approval ? 'Submit Request' : 'Confirm Booking'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
