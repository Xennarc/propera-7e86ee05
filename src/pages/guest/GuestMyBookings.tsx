import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
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
import { Calendar, Utensils, ChevronDown, Loader2, X, Users, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

  const BookingCard = ({ 
    booking, 
    type, 
    canCancel 
  }: { 
    booking: any; 
    type: 'activity' | 'restaurant'; 
    canCancel: boolean;
  }) => (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl shrink-0",
            booking.status === 'CANCELLED' ? "bg-muted" : "bg-primary/10"
          )}>
            {type === 'activity' ? (
              <Calendar className={cn("h-6 w-6", booking.status === 'CANCELLED' ? "text-muted-foreground" : "text-primary")} />
            ) : (
              <Utensils className={cn("h-6 w-6", booking.status === 'CANCELLED' ? "text-muted-foreground" : "text-primary")} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {type === 'activity' ? booking.activity_name : booking.restaurant_name}
              </h3>
              {getStatusBadge(booking.status)}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Clock className="h-3.5 w-3.5" />
              {format(parseISO(booking.date), 'EEE, MMM d')} at {booking.start_time?.slice(0, 5)}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              {booking.num_adults} adult{booking.num_adults !== 1 ? 's' : ''}
              {booking.num_children > 0 && `, ${booking.num_children} child${booking.num_children !== 1 ? 'ren' : ''}`}
              {type === 'restaurant' && booking.meal_period && (
                <Badge variant="outline" className="text-xs ml-1">{booking.meal_period}</Badge>
              )}
            </div>
          </div>
        </div>
        {canCancel && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setCancelDialog({
                type,
                id: booking.id,
                title: type === 'activity' ? booking.activity_name : booking.restaurant_name,
              })}
            >
              <X className="mr-1.5 h-4 w-4" />
              Cancel Booking
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">My Bookings</h1>
        <p className="text-sm text-muted-foreground">Manage your activities and dining reservations</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      ) : (
        <>
          {/* Upcoming Activities */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">
                Upcoming Activities ({upcomingActivities.length})
              </h2>
            </div>
            {upcomingActivities.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">No upcoming activities</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingActivities.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    type="activity"
                    canCancel={canCancelActivity(booking)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Reservations */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Utensils className="h-4 w-4 text-primary" />
              <h2 className="font-semibold text-foreground">
                Upcoming Reservations ({upcomingReservations.length})
              </h2>
            </div>
            {upcomingReservations.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">No upcoming reservations</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {upcomingReservations.map((reservation) => (
                  <BookingCard
                    key={reservation.id}
                    booking={reservation}
                    type="restaurant"
                    canCancel={canCancelReservation(reservation)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Past Bookings */}
          {(pastActivities.length > 0 || pastReservations.length > 0) && (
            <Collapsible open={showPast} onOpenChange={setShowPast}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-muted-foreground hover:text-foreground">
                  Past Bookings ({pastActivities.length + pastReservations.length})
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showPast && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                {[...pastActivities, ...pastReservations]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((booking, idx) => (
                    <div key={booking.id} className="opacity-60">
                      <BookingCard
                        booking={booking}
                        type={booking.activity_name ? 'activity' : 'restaurant'}
                        canCancel={false}
                      />
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
