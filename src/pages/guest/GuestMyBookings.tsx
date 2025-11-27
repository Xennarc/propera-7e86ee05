import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isBefore } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar, Utensils, ChevronDown, Loader2, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function GuestMyBookings() {
  const { guest } = useGuestAuth();
  const queryClient = useQueryClient();
  const [showPast, setShowPast] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{
    type: 'activity' | 'restaurant';
    id: string;
    title: string;
  } | null>(null);

  const { data: bookings, isLoading } = useQuery({
    queryKey: ['guest-bookings', guest?.guestId],
    queryFn: async () => {
      if (!guest) return null;
      const { data, error } = await supabase.rpc('guest_get_bookings', {
        p_guest_id: guest.guestId,
      });
      if (error) throw error;
      return data as {
        activity_bookings: any[];
        restaurant_reservations: any[];
      };
    },
    enabled: !!guest,
  });

  const cancelActivityMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.rpc('guest_cancel_activity_booking', {
        p_guest_id: guest!.guestId,
        p_booking_id: bookingId,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel booking');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
      toast.success('Booking cancelled successfully');
      setCancelDialog(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const cancelReservationMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const { data, error } = await supabase.rpc('guest_cancel_restaurant_reservation', {
        p_guest_id: guest!.guestId,
        p_reservation_id: reservationId,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to cancel reservation');
      }
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
      toast.success('Reservation cancelled successfully');
      setCancelDialog(null);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (!guest) return null;

  const today = new Date().toISOString().split('T')[0];

  // Separate upcoming and past
  const upcomingActivities = bookings?.activity_bookings?.filter(
    (b) => b.date >= today && b.status !== 'CANCELLED'
  ) || [];
  const pastActivities = bookings?.activity_bookings?.filter(
    (b) => b.date < today || b.status === 'CANCELLED'
  ) || [];

  const upcomingReservations = bookings?.restaurant_reservations?.filter(
    (r) => r.date >= today && r.status !== 'CANCELLED'
  ) || [];
  const pastReservations = bookings?.restaurant_reservations?.filter(
    (r) => r.date < today || r.status === 'CANCELLED'
  ) || [];

  const canCancelActivity = (booking: any) => {
    if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') return false;
    if (!booking.guest_can_cancel) return false;
    const sessionDateTime = new Date(`${booking.date}T${booking.start_time}`);
    const cutoff = new Date(sessionDateTime.getTime() - booking.guest_cancel_cutoff_hours * 60 * 60 * 1000);
    return new Date() < cutoff;
  };

  const canCancelReservation = (reservation: any) => {
    if (reservation.status !== 'CONFIRMED' && reservation.status !== 'PENDING') return false;
    if (!reservation.guest_can_cancel) return false;
    const slotDateTime = new Date(`${reservation.date}T${reservation.start_time}`);
    const cutoff = new Date(slotDateTime.getTime() - reservation.guest_cancel_cutoff_minutes * 60 * 1000);
    return new Date() < cutoff;
  };

  const handleCancel = () => {
    if (!cancelDialog) return;
    if (cancelDialog.type === 'activity') {
      cancelActivityMutation.mutate(cancelDialog.id);
    } else {
      cancelReservationMutation.mutate(cancelDialog.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <Badge variant="confirmed">Confirmed</Badge>;
      case 'PENDING':
        return <Badge variant="pending">Pending</Badge>;
      case 'CANCELLED':
        return <Badge variant="cancelled">Cancelled</Badge>;
      case 'COMPLETED':
        return <Badge variant="completed">Completed</Badge>;
      case 'NO_SHOW':
        return <Badge variant="noShow">No Show</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
        <p className="text-muted-foreground">Manage your activities and dining reservations</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          {/* Upcoming Activities */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Upcoming Activities ({upcomingActivities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No upcoming activities
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingActivities.map((booking) => (
                    <div
                      key={booking.id}
                      className="rounded-lg border p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {booking.activity_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(booking.date), 'EEE, MMM d')} at {booking.start_time.slice(0, 5)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {booking.num_adults} adult{booking.num_adults !== 1 ? 's' : ''}
                            {booking.num_children > 0 && `, ${booking.num_children} child${booking.num_children !== 1 ? 'ren' : ''}`}
                          </p>
                        </div>
                        {getStatusBadge(booking.status)}
                      </div>
                      {canCancelActivity(booking) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setCancelDialog({
                            type: 'activity',
                            id: booking.id,
                            title: booking.activity_name,
                          })}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Reservations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Utensils className="h-5 w-5 text-primary" />
                Upcoming Reservations ({upcomingReservations.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingReservations.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No upcoming reservations
                </p>
              ) : (
                <div className="space-y-3">
                  {upcomingReservations.map((reservation) => (
                    <div
                      key={reservation.id}
                      className="rounded-lg border p-4 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {reservation.restaurant_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {format(parseISO(reservation.date), 'EEE, MMM d')} at {reservation.start_time.slice(0, 5)}
                            <span className="ml-2">• {reservation.meal_period}</span>
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {reservation.num_adults} adult{reservation.num_adults !== 1 ? 's' : ''}
                            {reservation.num_children > 0 && `, ${reservation.num_children} child${reservation.num_children !== 1 ? 'ren' : ''}`}
                          </p>
                        </div>
                        {getStatusBadge(reservation.status)}
                      </div>
                      {canCancelReservation(reservation) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setCancelDialog({
                            type: 'restaurant',
                            id: reservation.id,
                            title: reservation.restaurant_name,
                          })}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Past Bookings */}
          {(pastActivities.length > 0 || pastReservations.length > 0) && (
            <Collapsible open={showPast} onOpenChange={setShowPast}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  Past Bookings ({pastActivities.length + pastReservations.length})
                  <ChevronDown className={`h-4 w-4 transition-transform ${showPast ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                {pastActivities.map((booking) => (
                  <div key={booking.id} className="rounded-lg border p-4 opacity-60">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {booking.activity_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(booking.date), 'EEE, MMM d')} at {booking.start_time.slice(0, 5)}
                        </p>
                      </div>
                      {getStatusBadge(booking.status)}
                    </div>
                  </div>
                ))}
                {pastReservations.map((reservation) => (
                  <div key={reservation.id} className="rounded-lg border p-4 opacity-60">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground flex items-center gap-2">
                          <Utensils className="h-4 w-4" />
                          {reservation.restaurant_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseISO(reservation.date), 'EEE, MMM d')} at {reservation.start_time.slice(0, 5)}
                        </p>
                      </div>
                      {getStatusBadge(reservation.status)}
                    </div>
                  </div>
                ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your booking for "{cancelDialog?.title}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelActivityMutation.isPending || cancelReservationMutation.isPending}
            >
              {(cancelActivityMutation.isPending || cancelReservationMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Cancel Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
