import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getBookingErrorMessage, BookingErrorCode } from '@/lib/booking-errors';
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
import { Calendar, Utensils, ChevronDown, Loader2, X, Users, Clock, Pencil } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CategoryIcon, CategoryBadge } from '@/components/ui/category-badge';
import { getCategoryConfig } from '@/lib/activity-category-config';
import { IconRestaurants } from '@/components/icons/ProperaIcons';
import { EditBookingDialog } from '@/components/guest/EditBookingDialog';

// Map server error messages to error codes
function mapCancelErrorToCode(error: string): BookingErrorCode {
  const lowerError = error.toLowerCase();
  if (lowerError.includes('cutoff') || lowerError.includes('too late') || lowerError.includes('deadline') || lowerError.includes('passed')) return 'CANCEL_CUTOFF_PAST';
  if (lowerError.includes('disabled') || lowerError.includes('not allowed') || lowerError.includes('contact front desk')) return 'CANCEL_DISABLED';
  if (lowerError.includes('status') || lowerError.includes('cannot be cancelled')) return 'BOOKING_NOT_CANCELLABLE';
  return 'UNKNOWN_ERROR';
}

export default function GuestMyBookings() {
  const { guest } = useGuestAuth();
  const queryClient = useQueryClient();
  const [showPast, setShowPast] = useState(false);
  const [cancelDialog, setCancelDialog] = useState<{
    type: 'activity' | 'restaurant';
    id: string;
    title: string;
  } | null>(null);
  const [editDialog, setEditDialog] = useState<{
    id: string;
    type: 'activity' | 'restaurant';
    title: string;
    num_adults: number;
    num_children: number;
    session_id?: string;
    slot_id?: string;
    max_pax_per_booking?: number;
  } | null>(null);

  // First get room guests to show shared room bookings
  const { data: roomGuests } = useQuery({
    queryKey: ['room-guests', guest?.resortId, guest?.roomNumber],
    queryFn: async () => {
      if (!guest?.resortId || !guest?.roomNumber) return [];
      const { data, error } = await supabase
        .from('guests')
        .select('id, full_name')
        .eq('resort_id', guest.resortId)
        .eq('room_number', guest.roomNumber);
      if (error) return [];
      return data || [];
    },
    enabled: !!guest?.resortId && !!guest?.roomNumber,
  });

  // Fetch bookings for all guests in the room
  const { data: bookings, isLoading } = useQuery({
    queryKey: ['guest-room-bookings', guest?.resortId, guest?.roomNumber, roomGuests],
    queryFn: async () => {
      if (!guest || !roomGuests || roomGuests.length === 0) return null;
      
      const guestIds = roomGuests.map(g => g.id);
      
      // Fetch activity bookings for all room guests
      const { data: activityData, error: activityError } = await supabase
        .from('activity_bookings')
        .select(`
          id, guest_id, num_adults, num_children, status, notes, created_at,
          session:activity_sessions(
            id, date, start_time, end_time, capacity,
            activity:activities(
              id, name, category, duration_minutes, guest_can_cancel, guest_cancel_cutoff_hours,
              image_url, max_pax_per_booking
            )
          )
        `)
        .in('guest_id', guestIds)
        .order('created_at', { ascending: false });

      // Fetch restaurant reservations for all room guests
      const { data: restaurantData, error: restaurantError } = await supabase
        .from('restaurant_reservations')
        .select(`
          id, guest_id, num_adults, num_children, status, special_requests, created_at,
          slot:restaurant_time_slots(
            id, date, start_time, end_time, meal_period,
            restaurant:restaurants(
              id, name, guest_can_cancel, guest_cancel_cutoff_minutes, max_pax_per_booking
            )
          )
        `)
        .in('guest_id', guestIds)
        .order('created_at', { ascending: false });

      // Transform activity bookings to match expected format
      const activity_bookings = (activityData || []).map(b => {
        const session = b.session as any;
        const activity = session?.activity;
        const bookedByGuest = roomGuests.find(g => g.id === b.guest_id);
        return {
          id: b.id,
          guest_id: b.guest_id,
          booked_by: bookedByGuest?.full_name || 'Room guest',
          is_own_booking: b.guest_id === guest.guestId,
          num_adults: b.num_adults,
          num_children: b.num_children,
          status: b.status,
          notes: b.notes,
          date: session?.date,
          start_time: session?.start_time,
          end_time: session?.end_time,
          session_id: session?.id,
          activity_name: activity?.name,
          category: activity?.category,
          duration_minutes: activity?.duration_minutes,
          guest_can_cancel: activity?.guest_can_cancel,
          guest_cancel_cutoff_hours: activity?.guest_cancel_cutoff_hours,
          max_pax_per_booking: activity?.max_pax_per_booking,
          image_url: activity?.image_url,
          booking_type: 'activity' as const,
        };
      });

      // Transform restaurant reservations to match expected format
      const restaurant_reservations = (restaurantData || []).map(r => {
        const slot = r.slot as any;
        const restaurant = slot?.restaurant;
        const bookedByGuest = roomGuests.find(g => g.id === r.guest_id);
        return {
          id: r.id,
          guest_id: r.guest_id,
          booked_by: bookedByGuest?.full_name || 'Room guest',
          is_own_booking: r.guest_id === guest.guestId,
          num_adults: r.num_adults,
          num_children: r.num_children,
          status: r.status,
          special_requests: r.special_requests,
          date: slot?.date,
          start_time: slot?.start_time,
          end_time: slot?.end_time,
          slot_id: slot?.id,
          meal_period: slot?.meal_period,
          restaurant_name: restaurant?.name,
          guest_can_cancel: restaurant?.guest_can_cancel,
          guest_cancel_cutoff_minutes: restaurant?.guest_cancel_cutoff_minutes,
          max_pax_per_booking: restaurant?.max_pax_per_booking,
          booking_type: 'restaurant' as const,
        };
      });

      return { activity_bookings, restaurant_reservations };
    },
    enabled: !!guest && !!roomGuests && roomGuests.length > 0,
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
      return { ...result, bookingId };
    },
    onMutate: async (bookingId: string) => {
      // Cancel any outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ['guest-bookings', guest?.guestId] });
      
      // Snapshot the previous value
      const previousBookings = queryClient.getQueryData(['guest-bookings', guest?.guestId]);
      
      // Optimistically update to set booking status to CANCELLED
      queryClient.setQueryData(['guest-bookings', guest?.guestId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          activity_bookings: old.activity_bookings.map((b: any) =>
            b.id === bookingId ? { ...b, status: 'CANCELLED' } : b
          ),
        };
      });
      
      return { previousBookings };
    },
    onSuccess: () => {
      toast.success('Your booking has been cancelled.');
      setCancelDialog(null);
      // Refetch to ensure server state is synced
      queryClient.invalidateQueries({ queryKey: ['guest-bookings', guest?.guestId] });
    },
    onError: (error: Error, _bookingId, context) => {
      // Rollback to previous state on error
      if (context?.previousBookings) {
        queryClient.setQueryData(['guest-bookings', guest?.guestId], context.previousBookings);
      }
      const errorCode = mapCancelErrorToCode(error.message);
      const friendlyMessage = getBookingErrorMessage(errorCode, 'guest');
      toast.error(friendlyMessage);
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
      return { ...result, reservationId };
    },
    onMutate: async (reservationId: string) => {
      // Cancel any outgoing refetches so they don't overwrite optimistic update
      await queryClient.cancelQueries({ queryKey: ['guest-bookings', guest?.guestId] });
      
      // Snapshot the previous value
      const previousBookings = queryClient.getQueryData(['guest-bookings', guest?.guestId]);
      
      // Optimistically update to set reservation status to CANCELLED
      queryClient.setQueryData(['guest-bookings', guest?.guestId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          restaurant_reservations: old.restaurant_reservations.map((r: any) =>
            r.id === reservationId ? { ...r, status: 'CANCELLED' } : r
          ),
        };
      });
      
      return { previousBookings };
    },
    onSuccess: () => {
      toast.success('Your reservation has been cancelled.');
      setCancelDialog(null);
      // Refetch to ensure server state is synced
      queryClient.invalidateQueries({ queryKey: ['guest-bookings', guest?.guestId] });
    },
    onError: (error: Error, _reservationId, context) => {
      // Rollback to previous state on error
      if (context?.previousBookings) {
        queryClient.setQueryData(['guest-bookings', guest?.guestId], context.previousBookings);
      }
      const errorCode = mapCancelErrorToCode(error.message);
      const friendlyMessage = getBookingErrorMessage(errorCode, 'guest');
      toast.error(friendlyMessage);
    },
  });

  if (!guest) return null;

  const today = new Date().toISOString().split('T')[0];

  // Separate bookings by status - upcoming shows only active bookings (non-cancelled)
  // Past section shows completed, no-show, and cancelled bookings
  const allActivities = bookings?.activity_bookings || [];
  const allReservations = bookings?.restaurant_reservations || [];
  
  // For upcoming: only show CONFIRMED or PENDING bookings for future/today dates
  // Deduplicate by booking ID to ensure no duplicates
  const upcomingActivities = allActivities
    .filter((b) => b.date >= today && (b.status === 'CONFIRMED' || b.status === 'PENDING'))
    .filter((b, index, self) => index === self.findIndex(other => other.id === b.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
  
  const upcomingReservations = allReservations
    .filter((r) => r.date >= today && (r.status === 'CONFIRMED' || r.status === 'PENDING'))
    .filter((r, index, self) => index === self.findIndex(other => other.id === r.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
  
  // For past: show past dates OR cancelled/completed/no-show status
  // Deduplicate by booking ID
  const pastActivities = allActivities
    .filter((b) => b.date < today || b.status === 'CANCELLED' || b.status === 'COMPLETED' || b.status === 'NO_SHOW')
    .filter((b) => !(b.date >= today && (b.status === 'CONFIRMED' || b.status === 'PENDING'))) // Exclude upcoming
    .filter((b, index, self) => index === self.findIndex(other => other.id === b.id))
    .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time));
  
  const pastReservations = allReservations
    .filter((r) => r.date < today || r.status === 'CANCELLED' || r.status === 'COMPLETED' || r.status === 'NO_SHOW')
    .filter((r) => !(r.date >= today && (r.status === 'CONFIRMED' || r.status === 'PENDING'))) // Exclude upcoming
    .filter((r, index, self) => index === self.findIndex(other => other.id === r.id))
    .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time));

  const canCancelActivity = (booking: any) => {
    // Can only cancel own bookings
    if (!booking.is_own_booking) return false;
    if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') return false;
    if (!booking.guest_can_cancel) return false;
    const sessionDateTime = new Date(`${booking.date}T${booking.start_time}`);
    const cutoff = new Date(sessionDateTime.getTime() - booking.guest_cancel_cutoff_hours * 60 * 60 * 1000);
    return new Date() < cutoff;
  };

  const canCancelReservation = (reservation: any) => {
    // Can only cancel own bookings
    if (!reservation.is_own_booking) return false;
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
        return <Badge variant="pending">Pending approval</Badge>;
      case 'CANCELLED':
        return <Badge variant="cancelled">Cancelled</Badge>;
      case 'COMPLETED':
        return <Badge variant="completed">Completed</Badge>;
      case 'NO_SHOW':
        return <Badge variant="noShow">No show</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const BookingCard = ({ 
    booking, 
    type, 
    canCancel,
    canEdit
  }: { 
    booking: any; 
    type: 'activity' | 'restaurant'; 
    canCancel: boolean;
    canEdit: boolean;
  }) => {
    const isActivity = type === 'activity';
    const config = isActivity ? getCategoryConfig(booking.category) : null;
    const isCancelled = booking.status === 'CANCELLED';
    
    // Meal period colors for restaurants
    const mealPeriodConfig: Record<string, { colorClass: string; bgClass: string }> = {
      BREAKFAST: { colorClass: 'text-sunset', bgClass: 'bg-sunset/10' },
      LUNCH: { colorClass: 'text-lagoon', bgClass: 'bg-lagoon/10' },
      DINNER: { colorClass: 'text-orchid', bgClass: 'bg-orchid/10' },
      EVENT: { colorClass: 'text-coral', bgClass: 'bg-coral/10' },
    };
    const restaurantConfig = !isActivity ? (mealPeriodConfig[booking.meal_period] || mealPeriodConfig.DINNER) : null;
    
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl shrink-0",
              isCancelled 
                ? "bg-muted" 
                : isActivity && config 
                  ? config.bgClass 
                  : restaurantConfig?.bgClass || "bg-sunset/10"
            )}>
              {isActivity ? (
                <CategoryIcon 
                  category={booking.category} 
                  size={24} 
                  className={isCancelled ? "text-muted-foreground" : undefined}
                />
              ) : (
                <IconRestaurants className={cn(
                  "h-6 w-6", 
                  isCancelled ? "text-muted-foreground" : restaurantConfig?.colorClass || "text-sunset"
                )} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {isActivity ? booking.activity_name : booking.restaurant_name}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(booking.status)}
                  {canEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditDialog({
                          id: booking.id,
                          type,
                          title: isActivity ? booking.activity_name : booking.restaurant_name,
                          num_adults: booking.num_adults,
                          num_children: booking.num_children,
                          session_id: booking.session_id,
                          slot_id: booking.slot_id,
                          max_pax_per_booking: booking.max_pax_per_booking,
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:ml-1">Edit</span>
                    </Button>
                  )}
                  {canCancel && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelDialog({
                          type,
                          id: booking.id,
                          title: isActivity ? booking.activity_name : booking.restaurant_name,
                        });
                      }}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only sm:ml-1">Cancel</span>
                    </Button>
                  )}
                </div>
              </div>
              <div className={cn(
                "flex items-center gap-2 text-sm mb-1",
                isCancelled 
                  ? "text-muted-foreground" 
                  : isActivity && config 
                    ? config.colorClass 
                    : restaurantConfig?.colorClass || "text-sunset"
              )}>
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium">
                  {format(parseISO(booking.date), 'EEE, MMM d')} at {booking.start_time?.slice(0, 5)}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {booking.num_adults} adult{booking.num_adults !== 1 ? 's' : ''}
                  {booking.num_children > 0 && `, ${booking.num_children} child${booking.num_children !== 1 ? 'ren' : ''}`}
                </span>
                {isActivity && booking.category && (
                  <CategoryBadge category={booking.category} size="sm" showIcon={false} />
                )}
                {!isActivity && booking.meal_period && (
                  <Badge className={cn("text-xs", 
                    mealPeriodConfig[booking.meal_period]?.colorClass ? 
                      `${mealPeriodConfig[booking.meal_period].bgClass} ${mealPeriodConfig[booking.meal_period].colorClass}` : 
                      'chip-neutral'
                  )}>
                    {booking.meal_period}
                  </Badge>
                )}
                {/* Show who booked for shared room bookings */}
                {!booking.is_own_booking && booking.booked_by && (
                  <Badge variant="outline" className="text-xs">
                    Booked by {booking.booked_by.split(' ')[0]}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

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
          <p className="text-sm text-center text-muted-foreground">Loading your bookings...</p>
        </div>
      ) : upcomingActivities.length === 0 && upcomingReservations.length === 0 && pastActivities.length === 0 && pastReservations.length === 0 ? (
        // Complete empty state
        <Card className="border-dashed border-2 bg-muted/20">
          <CardContent className="py-10 text-center">
            <Calendar className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="font-semibold text-foreground mb-1">No bookings yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You haven't made any bookings during your stay yet.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Button asChild>
                <a href="/guest/activities">Book an Activity</a>
              </Button>
              <Button variant="outline" asChild>
                <a href="/guest/restaurants">Book a Restaurant</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Upcoming Activities */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-lagoon/10">
                <Calendar className="h-4 w-4 text-lagoon" />
              </div>
              <h2 className="font-semibold text-foreground">
                Upcoming Activities <span className="text-lagoon">({upcomingActivities.length})</span>
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
                    canEdit={booking.is_own_booking && (booking.status === 'CONFIRMED' || booking.status === 'PENDING')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Reservations */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-sunset/10">
                <Utensils className="h-4 w-4 text-sunset" />
              </div>
              <h2 className="font-semibold text-foreground">
                Upcoming Reservations <span className="text-sunset">({upcomingReservations.length})</span>
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
                    canEdit={reservation.is_own_booking && (reservation.status === 'CONFIRMED' || reservation.status === 'PENDING')}
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
                  .map((booking) => (
                    <div key={booking.id} className="opacity-60">
                      <BookingCard
                        booking={booking}
                        type={booking.booking_type}
                        canCancel={false}
                        canEdit={false}
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
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              We'll cancel your booking for "{cancelDialog?.title}". This can't be undone.
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

      {/* Edit Booking Dialog */}
      <EditBookingDialog
        open={!!editDialog}
        onOpenChange={(open) => !open && setEditDialog(null)}
        booking={editDialog}
      />
    </div>
  );
}
