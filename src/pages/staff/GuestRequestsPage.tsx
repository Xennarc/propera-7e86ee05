import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { validateActivityBooking, validateRestaurantReservation } from '@/lib/booking-validation';
import { getBookingErrorMessage } from '@/lib/booking-errors';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Utensils, Check, X, Loader2, Users, Clock, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

export default function GuestRequestsPage() {
  const { currentResort } = useResort();
  const { hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  const [rejectDialog, setRejectDialog] = useState<{
    type: 'activity' | 'restaurant';
    id: string;
    title: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Check permissions
  const canManageActivities = hasAnyRole(['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES']);
  const canManageRestaurants = hasAnyRole(['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB']);

  // Fetch pending activity bookings (need approval)
  const { data: activityRequests, isLoading: loadingActivities } = useQuery({
    queryKey: ['pending-activity-requests', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return [];
      const { data, error } = await supabase
        .from('activity_bookings')
        .select(`
          id,
          status,
          num_adults,
          num_children,
          notes,
          room_number,
          created_at,
          guests!inner(id, full_name),
          activity_sessions!inner(
            id,
            date,
            start_time,
            end_time,
            capacity,
            activities!inner(id, name)
          )
        `)
        .eq('resort_id', currentResort.id)
        .eq('status', 'PENDING')
        .eq('source', 'GUEST_PORTAL')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentResort && canManageActivities,
  });

  // Fetch activity bookings with special requests (notes) - all statuses except CANCELLED
  const { data: activitySpecialRequests, isLoading: loadingActivitySpecialRequests } = useQuery({
    queryKey: ['activity-special-requests', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return [];
      const { data, error } = await supabase
        .from('activity_bookings')
        .select(`
          id,
          status,
          num_adults,
          num_children,
          notes,
          room_number,
          created_at,
          guests!inner(id, full_name),
          activity_sessions!inner(
            id,
            date,
            start_time,
            end_time,
            capacity,
            activities!inner(id, name)
          )
        `)
        .eq('resort_id', currentResort.id)
        .eq('source', 'GUEST_PORTAL')
        .neq('status', 'CANCELLED')
        .not('notes', 'is', null)
        .neq('notes', '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Filter to only non-empty notes after trim
      return (data || []).filter((r: any) => r.notes && r.notes.trim().length > 0);
    },
    enabled: !!currentResort && canManageActivities,
  });

  // Fetch pending restaurant reservations (need approval)
  const { data: restaurantRequests, isLoading: loadingRestaurants } = useQuery({
    queryKey: ['pending-restaurant-requests', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return [];
      const { data, error } = await supabase
        .from('restaurant_reservations')
        .select(`
          id,
          status,
          num_adults,
          num_children,
          special_requests,
          room_number,
          created_at,
          guests!inner(id, full_name),
          restaurant_time_slots!inner(
            id,
            date,
            start_time,
            end_time,
            meal_period,
            capacity,
            restaurants!inner(id, name)
          )
        `)
        .eq('resort_id', currentResort.id)
        .eq('status', 'PENDING')
        .eq('source', 'GUEST_PORTAL')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentResort && canManageRestaurants,
  });

  // Fetch restaurant reservations with special requests - all statuses except CANCELLED
  const { data: restaurantSpecialRequests, isLoading: loadingRestaurantSpecialRequests } = useQuery({
    queryKey: ['restaurant-special-requests', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return [];
      const { data, error } = await supabase
        .from('restaurant_reservations')
        .select(`
          id,
          status,
          num_adults,
          num_children,
          special_requests,
          room_number,
          created_at,
          guests!inner(id, full_name),
          restaurant_time_slots!inner(
            id,
            date,
            start_time,
            end_time,
            meal_period,
            capacity,
            restaurants!inner(id, name)
          )
        `)
        .eq('resort_id', currentResort.id)
        .eq('source', 'GUEST_PORTAL')
        .neq('status', 'CANCELLED')
        .not('special_requests', 'is', null)
        .neq('special_requests', '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      // Filter to only non-empty special_requests after trim
      return (data || []).filter((r: any) => r.special_requests && r.special_requests.trim().length > 0);
    },
    enabled: !!currentResort && canManageRestaurants,
  });

  // Approve activity booking
  const approveActivityMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const booking = activityRequests?.find((r: any) => r.id === bookingId);
      if (!booking) throw new Error('Booking not found');

      // Fetch guest_id from the booking
      const { data: bookingData } = await supabase
        .from('activity_bookings')
        .select('guest_id')
        .eq('id', bookingId)
        .single();

      if (!bookingData) throw new Error('Booking not found');

      // Re-validate using centralized validation (excluding cutoff for staff approval)
      const validationResult = await validateActivityBooking({
        resortId: currentResort!.id,
        guestId: bookingData.guest_id,
        sessionId: booking.activity_sessions.id,
        numAdults: booking.num_adults,
        numChildren: booking.num_children,
        source: 'STAFF_FRONT_DESK', // Use staff source to skip cutoff checks
      });

      if (!validationResult.ok) {
        const errorMessage = getBookingErrorMessage(validationResult.errorCode!, 'staff');
        throw new Error(validationResult.details || errorMessage);
      }

      const { error } = await supabase
        .from('activity_bookings')
        .update({ status: 'CONFIRMED' })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-activity-requests'] });
      toast.success('Booking approved');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Reject activity booking
  const rejectActivityMutation = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      const { error } = await supabase
        .from('activity_bookings')
        .update({ status: 'CANCELLED', notes: reason })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-activity-requests'] });
      toast.success('Booking rejected');
      setRejectDialog(null);
      setRejectReason('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Approve restaurant reservation
  const approveReservationMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const reservation = restaurantRequests?.find((r: any) => r.id === reservationId);
      if (!reservation) throw new Error('Reservation not found');

      // Fetch guest_id from the reservation
      const { data: reservationData } = await supabase
        .from('restaurant_reservations')
        .select('guest_id')
        .eq('id', reservationId)
        .single();

      if (!reservationData) throw new Error('Reservation not found');

      // Re-validate using centralized validation (excluding cutoff for staff approval)
      const validationResult = await validateRestaurantReservation({
        resortId: currentResort!.id,
        guestId: reservationData.guest_id,
        slotId: reservation.restaurant_time_slots.id,
        numAdults: reservation.num_adults,
        numChildren: reservation.num_children,
        source: 'STAFF_FRONT_DESK', // Use staff source to skip cutoff checks
      });

      if (!validationResult.ok) {
        const errorMessage = getBookingErrorMessage(validationResult.errorCode!, 'staff');
        throw new Error(validationResult.details || errorMessage);
      }

      const { error } = await supabase
        .from('restaurant_reservations')
        .update({ status: 'CONFIRMED' })
        .eq('id', reservationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-restaurant-requests'] });
      toast.success('Reservation approved');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Reject restaurant reservation
  const rejectReservationMutation = useMutation({
    mutationFn: async ({ reservationId, reason }: { reservationId: string; reason: string }) => {
      const { error } = await supabase
        .from('restaurant_reservations')
        .update({ status: 'CANCELLED', special_requests: reason })
        .eq('id', reservationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-restaurant-requests'] });
      toast.success('Reservation rejected');
      setRejectDialog(null);
      setRejectReason('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleReject = () => {
    if (!rejectDialog || !rejectReason.trim()) return;
    if (rejectDialog.type === 'activity') {
      rejectActivityMutation.mutate({ bookingId: rejectDialog.id, reason: rejectReason });
    } else {
      rejectReservationMutation.mutate({ reservationId: rejectDialog.id, reason: rejectReason });
    }
  };

  if (!currentResort) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Please select a resort.</p>
      </div>
    );
  }

  const activityPendingCount = activityRequests?.length || 0;
  const restaurantPendingCount = restaurantRequests?.length || 0;
  const activitySpecialCount = activitySpecialRequests?.length || 0;
  const restaurantSpecialCount = restaurantSpecialRequests?.length || 0;
  const totalPendingCount = activityPendingCount + restaurantPendingCount;
  const totalSpecialCount = activitySpecialCount + restaurantSpecialCount;

  // Helper to render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="pending">Pending Approval</Badge>;
      case 'CONFIRMED':
        return <Badge variant="success">Confirmed</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Guest Requests</h1>
        <p className="text-muted-foreground">
          {totalPendingCount} pending approval{totalPendingCount !== 1 ? 's' : ''} • {totalSpecialCount} special request{totalSpecialCount !== 1 ? 's' : ''}
        </p>
      </div>

      <Tabs defaultValue="special-requests">
        <TabsList>
          <TabsTrigger value="special-requests">
            <MessageSquare className="mr-2 h-4 w-4" />
            Special Requests ({totalSpecialCount})
          </TabsTrigger>
          <TabsTrigger value="activities" disabled={!canManageActivities}>
            <Calendar className="mr-2 h-4 w-4" />
            Pending Activities ({activityPendingCount})
          </TabsTrigger>
          <TabsTrigger value="restaurants" disabled={!canManageRestaurants}>
            <Utensils className="mr-2 h-4 w-4" />
            Pending Restaurants ({restaurantPendingCount})
          </TabsTrigger>
        </TabsList>

        {/* Special Requests Tab - Shows all bookings with special requests */}
        <TabsContent value="special-requests" className="mt-4 space-y-6">
          {(loadingActivitySpecialRequests || loadingRestaurantSpecialRequests) ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : totalSpecialCount === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No guest special requests yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  New special requests from guest reservations will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Restaurant Special Requests */}
              {restaurantSpecialCount > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Utensils className="h-5 w-5" />
                    Restaurant Requests ({restaurantSpecialCount})
                  </h2>
                  {restaurantSpecialRequests?.map((request: any) => (
                    <Card key={request.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {renderStatusBadge(request.status)}
                              <Badge variant="outline">Guest Portal</Badge>
                              <Badge variant="secondary">
                                {request.restaurant_time_slots.meal_period}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-foreground">
                              {request.restaurant_time_slots.restaurants.name}
                            </h3>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {request.guests.full_name} • Room {request.room_number}
                              </p>
                              <p className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {format(parseISO(request.restaurant_time_slots.date), 'EEE, MMM d, yyyy')}
                              </p>
                              <p className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {request.restaurant_time_slots.start_time.slice(0, 5)} - {request.restaurant_time_slots.end_time.slice(0, 5)}
                              </p>
                              <p>
                                {request.num_adults} adult{request.num_adults !== 1 ? 's' : ''}
                                {request.num_children > 0 && `, ${request.num_children} child${request.num_children !== 1 ? 'ren' : ''}`}
                              </p>
                            </div>
                            {/* Highlighted Special Request */}
                            <div className="mt-3 p-3 bg-muted rounded-lg">
                              <p className="flex items-start gap-2 text-sm">
                                <MessageSquare className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                <span className="font-medium text-foreground">{request.special_requests}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(request.created_at), 'MMM d, h:mm a')}
                            </p>
                            {request.status === 'PENDING' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => approveReservationMutation.mutate(request.id)}
                                  disabled={approveReservationMutation.isPending}
                                >
                                  <Check className="mr-1 h-4 w-4" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setRejectDialog({
                                    type: 'restaurant',
                                    id: request.id,
                                    title: request.restaurant_time_slots.restaurants.name,
                                  })}
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Activity Special Requests */}
              {activitySpecialCount > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Activity Requests ({activitySpecialCount})
                  </h2>
                  {activitySpecialRequests?.map((request: any) => (
                    <Card key={request.id} className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              {renderStatusBadge(request.status)}
                              <Badge variant="outline">Guest Portal</Badge>
                            </div>
                            <h3 className="font-semibold text-foreground">
                              {request.activity_sessions.activities.name}
                            </h3>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p className="flex items-center gap-2">
                                <Users className="h-4 w-4" />
                                {request.guests.full_name} • Room {request.room_number}
                              </p>
                              <p className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {format(parseISO(request.activity_sessions.date), 'EEE, MMM d, yyyy')}
                              </p>
                              <p className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {request.activity_sessions.start_time.slice(0, 5)} - {request.activity_sessions.end_time.slice(0, 5)}
                              </p>
                              <p>
                                {request.num_adults} adult{request.num_adults !== 1 ? 's' : ''}
                                {request.num_children > 0 && `, ${request.num_children} child${request.num_children !== 1 ? 'ren' : ''}`}
                              </p>
                            </div>
                            {/* Highlighted Special Request */}
                            <div className="mt-3 p-3 bg-muted rounded-lg">
                              <p className="flex items-start gap-2 text-sm">
                                <MessageSquare className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                                <span className="font-medium text-foreground">{request.notes}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(request.created_at), 'MMM d, h:mm a')}
                            </p>
                            {request.status === 'PENDING' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => approveActivityMutation.mutate(request.id)}
                                  disabled={approveActivityMutation.isPending}
                                >
                                  <Check className="mr-1 h-4 w-4" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-destructive hover:text-destructive"
                                  onClick={() => setRejectDialog({
                                    type: 'activity',
                                    id: request.id,
                                    title: request.activity_sessions.activities.name,
                                  })}
                                >
                                  <X className="mr-1 h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="activities" className="mt-4 space-y-4">
          {loadingActivities ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : activityRequests?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending activity approvals</p>
              </CardContent>
            </Card>
          ) : (
            activityRequests?.map((request: any) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="pending">Pending</Badge>
                        <Badge variant="outline">Guest Portal</Badge>
                      </div>
                      <h3 className="font-semibold text-foreground">
                        {request.activity_sessions.activities.name}
                      </h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {request.guests.full_name} • Room {request.room_number}
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(parseISO(request.activity_sessions.date), 'EEE, MMM d, yyyy')}
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {request.activity_sessions.start_time.slice(0, 5)} - {request.activity_sessions.end_time.slice(0, 5)}
                        </p>
                        <p>
                          {request.num_adults} adult{request.num_adults !== 1 ? 's' : ''}
                          {request.num_children > 0 && `, ${request.num_children} child${request.num_children !== 1 ? 'ren' : ''}`}
                        </p>
                        {request.notes && (
                          <div className="mt-2 p-2 bg-muted rounded">
                            <p className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 mt-0.5" />
                              {request.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveActivityMutation.mutate(request.id)}
                        disabled={approveActivityMutation.isPending}
                      >
                        {approveActivityMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-1 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRejectDialog({
                          type: 'activity',
                          id: request.id,
                          title: request.activity_sessions.activities.name,
                        })}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="restaurants" className="mt-4 space-y-4">
          {loadingRestaurants ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : restaurantRequests?.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Utensils className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending restaurant approvals</p>
              </CardContent>
            </Card>
          ) : (
            restaurantRequests?.map((request: any) => (
              <Card key={request.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="pending">Pending</Badge>
                        <Badge variant="outline">Guest Portal</Badge>
                      </div>
                      <h3 className="font-semibold text-foreground">
                        {request.restaurant_time_slots.restaurants.name}
                      </h3>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          {request.guests.full_name} • Room {request.room_number}
                        </p>
                        <p className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(parseISO(request.restaurant_time_slots.date), 'EEE, MMM d, yyyy')}
                          <Badge variant="secondary" className="ml-1">
                            {request.restaurant_time_slots.meal_period}
                          </Badge>
                        </p>
                        <p className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {request.restaurant_time_slots.start_time.slice(0, 5)} - {request.restaurant_time_slots.end_time.slice(0, 5)}
                        </p>
                        <p>
                          {request.num_adults} adult{request.num_adults !== 1 ? 's' : ''}
                          {request.num_children > 0 && `, ${request.num_children} child${request.num_children !== 1 ? 'ren' : ''}`}
                        </p>
                        {request.special_requests && (
                          <div className="mt-2 p-2 bg-muted rounded">
                            <p className="flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 mt-0.5" />
                              {request.special_requests}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => approveReservationMutation.mutate(request.id)}
                        disabled={approveReservationMutation.isPending}
                      >
                        {approveReservationMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-1 h-4 w-4" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setRejectDialog({
                          type: 'restaurant',
                          id: request.id,
                          title: request.restaurant_time_slots.restaurants.name,
                        })}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Request</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{rejectDialog?.title}".
              This will be visible to the guest.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea
              placeholder="e.g., Activity is fully booked, weather conditions..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectReason.trim() || rejectActivityMutation.isPending || rejectReservationMutation.isPending}
            >
              {(rejectActivityMutation.isPending || rejectReservationMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
