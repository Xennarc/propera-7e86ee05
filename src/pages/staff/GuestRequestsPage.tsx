import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { validateActivityBooking, validateRestaurantReservation } from '@/lib/booking-validation';
import { getBookingErrorMessage } from '@/lib/booking-errors';
import { createGuestNotification } from '@/lib/notifications';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar, Utensils, Check, X, Loader2, Users, Clock, MessageSquare, ExternalLink, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useStaffRequestsPageSync } from '@/hooks/useGuestRequestsSync';

type RequestStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
type SourceFilter = 'ALL' | 'ACTIVITY' | 'RESTAURANT';
type StatusFilter = 'ALL' | RequestStatus;

export default function GuestRequestsPage() {
  const { currentResort } = useResort();
  const { hasAnyRole } = useAuth();
  const queryClient = useQueryClient();
  
  // Enable real-time sync for requests
  useStaffRequestsPageSync();
  
  // Filter states
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('OPEN');
  
  // Rejection dialog state for pending approvals
  const [rejectDialog, setRejectDialog] = useState<{
    type: 'activity' | 'restaurant';
    id: string;
    title: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Check permissions
  const canManageActivities = hasAnyRole(['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'ACTIVITIES']);
  const canManageRestaurants = hasAnyRole(['ADMIN', 'MANAGER', 'FRONT_OFFICE', 'FNB']);

  // Fetch centralized guest requests
  const { data: guestRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ['guest-requests', currentResort?.id, sourceFilter, statusFilter],
    queryFn: async () => {
      if (!currentResort) return [];
      
      let query = supabase
        .from('guest_requests')
        .select(`
          id,
          source_type,
          special_request_text,
          status,
          room_number,
          reservation_date,
          reservation_time,
          staff_notes,
          created_at,
          updated_at,
          activity_booking_id,
          restaurant_reservation_id,
          guests!inner(id, full_name),
          activity_bookings(
            id,
            status,
            num_adults,
            num_children,
            activity_sessions(
              id,
              date,
              start_time,
              end_time,
              activities(id, name)
            )
          ),
          restaurant_reservations(
            id,
            status,
            num_adults,
            num_children,
            restaurant_time_slots(
              id,
              date,
              start_time,
              end_time,
              meal_period,
              restaurants(id, name)
            )
          )
        `)
        .eq('resort_id', currentResort.id)
        .order('created_at', { ascending: false });

      // Apply source filter
      if (sourceFilter !== 'ALL') {
        query = query.eq('source_type', sourceFilter);
      }

      // Apply status filter
      if (statusFilter !== 'ALL') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentResort,
  });

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

  // Update guest request status
  const updateRequestStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: RequestStatus }) => {
      const { error } = await supabase
        .from('guest_requests')
        .update({ status })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guest-requests'] });
      toast.success('Request status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Approve activity booking
  const approveActivityMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const booking = activityRequests?.find((r: any) => r.id === bookingId);
      if (!booking) throw new Error('Booking not found');

      const { data: bookingData } = await supabase
        .from('activity_bookings')
        .select('guest_id')
        .eq('id', bookingId)
        .single();

      if (!bookingData) throw new Error('Booking not found');

      const validationResult = await validateActivityBooking({
        resortId: currentResort!.id,
        guestId: bookingData.guest_id,
        sessionId: booking.activity_sessions.id,
        numAdults: booking.num_adults,
        numChildren: booking.num_children,
        source: 'STAFF_FRONT_DESK',
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
      return { bookingId, booking };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-activity-requests'] });
      toast.success('Booking approved');

      // Notify guest
      const booking = data.booking;
      if (booking && currentResort) {
        const session = booking.activity_sessions;
        const dateStr = format(parseISO(session.date), 'EEE, MMM d');
        createGuestNotification({
          resort_id: currentResort.id,
          guest_id: booking.guests.id,
          type: 'ACTIVITY_BOOKING_CONFIRMED',
          title: 'Booking Confirmed',
          message: `Your booking for ${session.activities.name} on ${dateStr} at ${session.start_time.slice(0, 5)} is confirmed.`,
          link_url: '/guest/bookings',
        }).catch(console.error);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Reject activity booking
  const rejectActivityMutation = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason: string }) => {
      const booking = activityRequests?.find((r: any) => r.id === bookingId);
      const { error } = await supabase
        .from('activity_bookings')
        .update({ status: 'CANCELLED', notes: reason })
        .eq('id', bookingId);
      if (error) throw error;
      return { bookingId, booking };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-activity-requests'] });
      toast.success('Booking rejected');
      setRejectDialog(null);
      setRejectReason('');

      // Notify guest
      const booking = data.booking;
      if (booking && currentResort) {
        const session = booking.activity_sessions;
        const dateStr = format(parseISO(session.date), 'EEE, MMM d');
        createGuestNotification({
          resort_id: currentResort.id,
          guest_id: booking.guests.id,
          type: 'ACTIVITY_BOOKING_CANCELLED',
          title: 'Booking Not Approved',
          message: `Your request for ${session.activities.name} on ${dateStr} at ${session.start_time.slice(0, 5)} was not approved. Please contact front desk for details.`,
          link_url: '/guest/bookings',
        }).catch(console.error);
      }
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

      const { data: reservationData } = await supabase
        .from('restaurant_reservations')
        .select('guest_id')
        .eq('id', reservationId)
        .single();

      if (!reservationData) throw new Error('Reservation not found');

      const validationResult = await validateRestaurantReservation({
        resortId: currentResort!.id,
        guestId: reservationData.guest_id,
        slotId: reservation.restaurant_time_slots.id,
        numAdults: reservation.num_adults,
        numChildren: reservation.num_children,
        source: 'STAFF_FRONT_DESK',
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
      return { reservationId, reservation };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-restaurant-requests'] });
      toast.success('Reservation approved');

      // Notify guest
      const reservation = data.reservation;
      if (reservation && currentResort) {
        const slot = reservation.restaurant_time_slots;
        const dateStr = format(parseISO(slot.date), 'EEE, MMM d');
        createGuestNotification({
          resort_id: currentResort.id,
          guest_id: reservation.guests.id,
          type: 'RESTAURANT_RESERVATION_CONFIRMED',
          title: 'Table Confirmed',
          message: `Your reservation at ${slot.restaurants.name} on ${dateStr} at ${slot.start_time.slice(0, 5)} is confirmed.`,
          link_url: '/guest/bookings',
        }).catch(console.error);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Reject restaurant reservation
  const rejectReservationMutation = useMutation({
    mutationFn: async ({ reservationId, reason }: { reservationId: string; reason: string }) => {
      const reservation = restaurantRequests?.find((r: any) => r.id === reservationId);
      const { error } = await supabase
        .from('restaurant_reservations')
        .update({ status: 'CANCELLED', special_requests: reason })
        .eq('id', reservationId);
      if (error) throw error;
      return { reservationId, reservation };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-restaurant-requests'] });
      toast.success('Reservation rejected');
      setRejectDialog(null);
      setRejectReason('');

      // Notify guest
      const reservation = data.reservation;
      if (reservation && currentResort) {
        const slot = reservation.restaurant_time_slots;
        const dateStr = format(parseISO(slot.date), 'EEE, MMM d');
        createGuestNotification({
          resort_id: currentResort.id,
          guest_id: reservation.guests.id,
          type: 'RESTAURANT_RESERVATION_CANCELLED',
          title: 'Reservation Not Approved',
          message: `Your reservation request at ${slot.restaurants.name} on ${dateStr} at ${slot.start_time.slice(0, 5)} was not approved. Please contact front desk for details.`,
          link_url: '/guest/bookings',
        }).catch(console.error);
      }
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
  const totalPendingCount = activityPendingCount + restaurantPendingCount;
  const openRequestsCount = guestRequests?.filter((r: any) => r.status === 'OPEN').length || 0;

  // Helper to render request status badge
  const renderRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <Badge variant="pending">Open</Badge>;
      case 'IN_PROGRESS':
        return <Badge variant="default">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge variant="success">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Helper to render booking status badge
  const renderBookingStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="pending">Pending Approval</Badge>;
      case 'CONFIRMED':
        return <Badge variant="success">Confirmed</Badge>;
      case 'COMPLETED':
        return <Badge variant="secondary">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get view link for a request
  const getViewLink = (request: any) => {
    if (request.source_type === 'ACTIVITY' && request.activity_bookings?.activity_sessions?.id) {
      return `/staff/activities/sessions/${request.activity_bookings.activity_sessions.id}`;
    } else if (request.source_type === 'RESTAURANT' && request.restaurant_reservations?.restaurant_time_slots?.id) {
      return `/staff/restaurants/slots/${request.restaurant_reservations.restaurant_time_slots.id}`;
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Guest Requests</h1>
        <p className="text-muted-foreground">
          {openRequestsCount} open special request{openRequestsCount !== 1 ? 's' : ''} • {totalPendingCount} pending approval{totalPendingCount !== 1 ? 's' : ''}
        </p>
      </div>

      <Tabs defaultValue="special-requests">
        <TabsList>
          <TabsTrigger value="special-requests">
            <MessageSquare className="mr-2 h-4 w-4" />
            Special Requests ({guestRequests?.length || 0})
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

        {/* Special Requests Tab */}
        <TabsContent value="special-requests" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filters:</span>
            </div>
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as SourceFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sources</SelectItem>
                <SelectItem value="ACTIVITY">Activities</SelectItem>
                <SelectItem value="RESTAURANT">Restaurants</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loadingRequests ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !guestRequests || guestRequests.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No guest special requests found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {statusFilter !== 'ALL' || sourceFilter !== 'ALL' 
                    ? 'Try adjusting your filters.'
                    : 'Special requests from guest reservations will appear here.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {guestRequests.map((request: any) => {
                const isActivity = request.source_type === 'ACTIVITY';
                const booking = isActivity ? request.activity_bookings : request.restaurant_reservations;
                const viewLink = getViewLink(request);
                
                return (
                  <Card key={request.id} className={`border-l-4 ${isActivity ? 'border-l-primary' : 'border-l-accent'}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {renderRequestStatusBadge(request.status)}
                            <Badge variant="outline">
                              {isActivity ? 'Activity' : 'Restaurant'}
                            </Badge>
                            {booking && renderBookingStatusBadge(booking.status)}
                          </div>
                          
                          <h3 className="font-semibold text-foreground">
                            {isActivity 
                              ? booking?.activity_sessions?.activities?.name || 'Activity'
                              : booking?.restaurant_time_slots?.restaurants?.name || 'Restaurant'}
                          </h3>
                          
                          <div className="text-sm text-muted-foreground space-y-1">
                            <p className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              {request.guests?.full_name} • Room {request.room_number}
                            </p>
                            {request.reservation_date && (
                              <p className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                {format(parseISO(request.reservation_date), 'EEE, MMM d, yyyy')}
                              </p>
                            )}
                            {request.reservation_time && (
                              <p className="flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                {request.reservation_time.slice(0, 5)}
                              </p>
                            )}
                            {booking && (
                              <p>
                                {booking.num_adults} adult{booking.num_adults !== 1 ? 's' : ''}
                                {booking.num_children > 0 && `, ${booking.num_children} child${booking.num_children !== 1 ? 'ren' : ''}`}
                              </p>
                            )}
                          </div>
                          
                          {/* Special Request Text */}
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="flex items-start gap-2 text-sm">
                              <MessageSquare className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                              <span className="font-medium text-foreground">{request.special_request_text}</span>
                            </p>
                          </div>
                          
                          {request.staff_notes && (
                            <div className="mt-2 p-2 bg-secondary/50 rounded text-sm">
                              <p className="text-muted-foreground"><strong>Staff notes:</strong> {request.staff_notes}</p>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col gap-2 lg:items-end min-w-[200px]">
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(request.created_at), 'MMM d, yyyy HH:mm')}
                          </p>
                          
                          {/* Status Update Dropdown */}
                          <Select
                            value={request.status}
                            onValueChange={(value) => 
                              updateRequestStatusMutation.mutate({ 
                                requestId: request.id, 
                                status: value as RequestStatus 
                              })
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="OPEN">Open</SelectItem>
                              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                              <SelectItem value="COMPLETED">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          {viewLink && (
                            <Button variant="outline" size="sm" asChild>
                              <Link to={viewLink}>
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Reservation
                              </Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Pending Activities Tab */}
        <TabsContent value="activities" className="mt-4 space-y-4">
          {loadingActivities ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : activityPendingCount === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending activity bookings</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All activity bookings from the guest portal have been processed.
                </p>
              </CardContent>
            </Card>
          ) : (
            activityRequests?.map((request: any) => (
              <Card key={request.id} className="border-l-4 border-l-warning">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="pending">Pending Approval</Badge>
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
                      {request.notes && request.notes.trim() && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="flex items-start gap-2 text-sm">
                            <MessageSquare className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                            <span className="text-foreground">{request.notes}</span>
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(request.created_at), 'MMM d, yyyy HH:mm')}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => approveActivityMutation.mutate(request.id)}
                        disabled={approveActivityMutation.isPending}
                      >
                        {approveActivityMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRejectDialog({
                          type: 'activity',
                          id: request.id,
                          title: request.activity_sessions.activities.name,
                        })}
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Pending Restaurants Tab */}
        <TabsContent value="restaurants" className="mt-4 space-y-4">
          {loadingRestaurants ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : restaurantPendingCount === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Utensils className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending restaurant reservations</p>
                <p className="text-sm text-muted-foreground mt-1">
                  All restaurant reservations from the guest portal have been processed.
                </p>
              </CardContent>
            </Card>
          ) : (
            restaurantRequests?.map((request: any) => (
              <Card key={request.id} className="border-l-4 border-l-warning">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="pending">Pending Approval</Badge>
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
                      {request.special_requests && request.special_requests.trim() && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="flex items-start gap-2 text-sm">
                            <MessageSquare className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                            <span className="text-foreground">{request.special_requests}</span>
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs text-muted-foreground">
                        {format(parseISO(request.created_at), 'MMM d, yyyy HH:mm')}
                      </p>
                      <Button
                        size="sm"
                        onClick={() => approveReservationMutation.mutate(request.id)}
                        disabled={approveReservationMutation.isPending}
                      >
                        {approveReservationMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRejectDialog({
                          type: 'restaurant',
                          id: request.id,
                          title: request.restaurant_time_slots.restaurants.name,
                        })}
                      >
                        <X className="h-4 w-4 mr-2" />
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
      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject {rejectDialog?.type === 'activity' ? 'Booking' : 'Reservation'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject the request for "{rejectDialog?.title}"?
              Please provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for rejection</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={
                !rejectReason.trim() ||
                rejectActivityMutation.isPending ||
                rejectReservationMutation.isPending
              }
            >
              {(rejectActivityMutation.isPending || rejectReservationMutation.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
