import { useState, useEffect, useCallback, useMemo } from 'react';
import { GuestPageShell } from '@/components/guest/GuestPageShell';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useSearchParams, Link } from 'react-router-dom';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { motion } from 'framer-motion';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getBookingErrorMessage, BookingErrorCode } from '@/lib/booking-errors';
import { createStaffNotificationsForRoles } from '@/lib/notifications';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar, Utensils, ChevronDown, Loader2, X, Users, Clock, Pencil, MapPin, AlertCircle, CheckCircle2, XCircle, History, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CategoryIcon, CategoryBadge } from '@/components/ui/category-badge';
import { getCategoryConfig } from '@/lib/activity-category-config';
import { IconRestaurants, IconActivities, IconBookings } from '@/components/icons/ProperaIcons';
import { MobilePageHeader } from '@/components/guest/MobilePageHeader';
import { StatusPill, bookingStatusToVariant } from '@/components/guest/StatusPill';
import { EditBookingDialog } from '@/components/guest/EditBookingDialog';
import { GuestBookingsLoading } from '@/components/guest/GuestLoadingSkeleton';
import { GuestEmptyState } from '@/components/guest/GuestEmptyState';
import { GuestSectionHeader } from '@/components/guest/GuestSectionHeader';
import { useGuestDiningSync } from '@/hooks/useDiningBookingSync';
import { useGuestActivitySync } from '@/hooks/useActivityBookingSync';
import { GuestDebugPanel } from '@/components/guest/GuestDebugPanel';
import { useGuestDebugMode } from '@/hooks/useGuestDebugMode';
import { BookingDetailsSheet } from '@/components/guest/booking-details';
import { 
  BookingDisplayModel, 
  mapActivityToDisplayModel, 
  mapRestaurantToDisplayModel 
} from '@/types/booking-display';

// Map server error messages to error codes
function mapCancelErrorToCode(error: string): BookingErrorCode {
  const lowerError = error.toLowerCase();
  if (lowerError.includes('cutoff') || lowerError.includes('too late') || lowerError.includes('deadline') || lowerError.includes('passed')) return 'CANCEL_CUTOFF_PAST';
  if (lowerError.includes('disabled') || lowerError.includes('not allowed') || lowerError.includes('contact front desk')) return 'CANCEL_DISABLED';
  if (lowerError.includes('status') || lowerError.includes('cannot be cancelled')) return 'BOOKING_NOT_CANCELLABLE';
  return 'UNKNOWN_ERROR';
}

type FilterType = 'all' | 'activities' | 'dining';

export default function GuestMyBookings() {
  const { guest } = useGuestAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showPast, setShowPast] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [cancelDialog, setCancelDialog] = useState<{
    type: 'activity' | 'restaurant';
    id: string;
    title: string;
    date?: string;
    start_time?: string;
    guest_can_cancel?: boolean;
    guest_cancel_cutoff_hours?: number;
    guest_cancel_cutoff_minutes?: number;
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
  
  // Selected booking for details sheet
  const [selectedBooking, setSelectedBooking] = useState<BookingDisplayModel | null>(null);
  const [detailsSheetOpen, setDetailsSheetOpen] = useState(false);

  // Debug mode hook - only shows panel with ?debug=1
  const { showDebugPanel, debugLog, resortCode } = useGuestDebugMode(guest?.resortId);

  // Enable real-time sync for activities and dining
  useGuestActivitySync(guest?.guestId, guest?.resortId);
  useGuestDiningSync(guest?.guestId, guest?.resortId);

  // Fetch all bookings using secure RPC (works for guest sessions without JWT claims)
  const { data: bookings, isLoading, isError, error: queryError, refetch } = useQuery({
    queryKey: ['guest-room-bookings', guest?.guestId],
    queryFn: async () => {
      if (!guest?.guestId) throw new Error('No guest ID');
      
      const { data, error } = await supabase.rpc('guest_get_room_bookings', {
        p_guest_id: guest.guestId,
      });
      
      if (error) {
        console.error('Failed to fetch room bookings:', error);
        throw new Error(error.message || 'Failed to fetch bookings');
      }
      
      const result = data as any;
      if (result?.error) {
        console.error('RPC error:', result.error);
        throw new Error(result.error);
      }
      
      // Transform RPC response to match expected format
      const activity_bookings = (result?.activity_bookings || []).map((b: any) => ({
        id: b.id,
        guest_id: b.guest_id,
        booked_by: b.guest?.full_name || 'Room guest',
        is_own_booking: b.guest_id === guest.guestId,
        num_adults: b.num_adults,
        num_children: b.num_children,
        status: b.status,
        notes: b.notes,
        booking_source: b.booking_source, // Include booking_source for pre-arrival badge
        date: b.session?.date,
        start_time: b.session?.start_time,
        end_time: b.session?.end_time,
        session_id: b.session?.id,
        activity_name: b.session?.activity?.name,
        category: b.session?.activity?.category,
        duration_minutes: b.session?.activity?.duration_minutes,
        guest_can_cancel: b.session?.activity?.guest_can_cancel,
        guest_cancel_cutoff_hours: b.session?.activity?.guest_cancel_cutoff_hours ?? 4,
        max_pax_per_booking: 10,
        image_url: b.session?.activity?.image_url,
        booking_type: 'activity' as const,
      }));

      // FIXED: Use num_adults/num_children directly (not party_size)
      const restaurant_reservations = (result?.restaurant_reservations || []).map((r: any) => ({
        id: r.id,
        guest_id: r.guest_id,
        booked_by: r.guest?.full_name || 'Room guest',
        is_own_booking: r.guest_id === guest.guestId,
        num_adults: r.num_adults ?? 2,
        num_children: r.num_children ?? 0,
        status: r.status,
        special_requests: r.special_requests,
        date: r.slot?.date,
        start_time: r.slot?.start_time,
        end_time: r.slot?.end_time,
        slot_id: r.slot?.id,
        meal_period: r.slot?.meal_period,
        restaurant_name: r.slot?.restaurant?.name,
        guest_can_cancel: r.slot?.restaurant?.guest_can_cancel,
        guest_cancel_cutoff_minutes: r.slot?.restaurant?.guest_cancel_cutoff_minutes ?? 60,
        max_pax_per_booking: 10,
        booking_type: 'restaurant' as const,
      }));

      return { activity_bookings, restaurant_reservations };
    },
    enabled: !!guest?.guestId,
    staleTime: 30000,
    retry: 2,
  });

  const cancelActivityMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { data, error } = await supabase.rpc('guest_cancel_activity_booking', {
        p_guest_id: guest!.guestId,
        p_booking_id: bookingId,
      });
      if (error) throw error;
      // RPC now returns boolean directly
      if (!data) {
        throw new Error('Failed to cancel booking');
      }
      return { success: true, bookingId };
    },
    onMutate: async (bookingId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['guest-room-bookings'] });
      
      // Get ALL matching queries with fuzzy key match
      const queries = queryClient.getQueriesData<any>({ queryKey: ['guest-room-bookings'] });
      
      // Snapshot the previous values for rollback
      const previousBookings = queries;
      
      // Optimistically update ALL matching cache entries using setQueriesData
      queryClient.setQueriesData<any>(
        { queryKey: ['guest-room-bookings'] },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            activity_bookings: old.activity_bookings.map((b: any) =>
              b.id === bookingId ? { ...b, status: 'CANCELLED' } : b
            ),
          };
        }
      );
      
      return { previousBookings };
    },
    onSuccess: (data, bookingId) => {
      toast.success('Your booking has been cancelled.');
      setCancelDialog(null);
      queryClient.invalidateQueries({ queryKey: ['guest-room-bookings'] });

      // Notify staff about cancellation
      const booking = allActivities?.find(b => b.id === bookingId);
      if (booking && guest) {
        const dateStr = format(parseISO(booking.date), 'EEE, MMM d');
        createStaffNotificationsForRoles({
          resort_id: guest.resortId,
          roles: ['RESORT_ADMIN', 'FRONT_OFFICE', 'ACTIVITIES'],
          type: 'ACTIVITY_BOOKING_CANCELLED',
          title: 'Activity Booking Cancelled',
          message: `${guest.fullName} (Room ${guest.roomNumber}) cancelled ${booking.activity_name} on ${dateStr} at ${booking.start_time?.slice(0, 5)}.`,
          link_url: `/staff/activities/sessions/${booking.session_id}`,
        }).catch(console.error);
      }
    },
    onError: (error: Error, _bookingId, context) => {
      // Restore all previous query states on error
      if (context?.previousBookings) {
        context.previousBookings.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
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
      // RPC now returns boolean directly
      if (!data) {
        throw new Error('Failed to cancel reservation');
      }
      return { success: true, reservationId };
    },
    onMutate: async (reservationId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['guest-room-bookings'] });
      
      // Get ALL matching queries with fuzzy key match
      const queries = queryClient.getQueriesData<any>({ queryKey: ['guest-room-bookings'] });
      
      // Snapshot the previous values for rollback
      const previousBookings = queries;
      
      // Optimistically update ALL matching cache entries using setQueriesData
      queryClient.setQueriesData<any>(
        { queryKey: ['guest-room-bookings'] },
        (old: any) => {
          if (!old) return old;
          return {
            ...old,
            restaurant_reservations: old.restaurant_reservations.map((r: any) =>
              r.id === reservationId ? { ...r, status: 'CANCELLED' } : r
            ),
          };
        }
      );
      
      return { previousBookings };
    },
    onSuccess: (data, reservationId) => {
      toast.success('Your reservation has been cancelled.');
      setCancelDialog(null);
      queryClient.invalidateQueries({ queryKey: ['guest-room-bookings'] });

      // Notify staff about cancellation
      const reservation = allReservations?.find(r => r.id === reservationId);
      if (reservation && guest) {
        const dateStr = format(parseISO(reservation.date), 'EEE, MMM d');
        createStaffNotificationsForRoles({
          resort_id: guest.resortId,
          roles: ['RESORT_ADMIN', 'FRONT_OFFICE', 'FNB'],
          type: 'RESTAURANT_RESERVATION_CANCELLED',
          title: 'Restaurant Reservation Cancelled',
          message: `${guest.fullName} (Room ${guest.roomNumber}) cancelled ${reservation.restaurant_name} reservation on ${dateStr} at ${reservation.start_time?.slice(0, 5)}.`,
          link_url: `/staff/restaurants/slots/${reservation.slot_id}`,
        }).catch(console.error);
      }
    },
    onError: (error: Error, _reservationId, context) => {
      // Restore all previous query states on error
      if (context?.previousBookings) {
        context.previousBookings.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      const errorCode = mapCancelErrorToCode(error.message);
      const friendlyMessage = getBookingErrorMessage(errorCode, 'guest');
      toast.error(friendlyMessage);
    },
  });

  if (!guest) return null;

  const today = new Date().toISOString().split('T')[0];

  // Separate bookings by status — memoized to avoid re-filtering on every render
  const allActivities = bookings?.activity_bookings || [];
  const allReservations = bookings?.restaurant_reservations || [];
  
  const { upcomingActivities, upcomingReservations, completedActivities, completedReservations, cancelledActivities, cancelledReservations } = useMemo(() => {
    const dedupe = <T extends { id: string }>(arr: T[]) => arr.filter((b, i, self) => i === self.findIndex(o => o.id === b.id));
    
    const upAct = dedupe(allActivities
      .filter((b) => b.date >= today && (b.status === 'CONFIRMED' || b.status === 'PENDING')))
      .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
    
    const upRes = dedupe(allReservations
      .filter((r) => r.date >= today && (r.status === 'CONFIRMED' || r.status === 'PENDING')))
      .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
    
    const compAct = dedupe(allActivities
      .filter((b) => (b.date < today && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW') || b.status === 'COMPLETED')
      .filter((b) => !(b.date >= today && (b.status === 'CONFIRMED' || b.status === 'PENDING'))))
      .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time));
    
    const compRes = dedupe(allReservations
      .filter((r) => (r.date < today && r.status !== 'CANCELLED' && r.status !== 'NO_SHOW') || r.status === 'COMPLETED')
      .filter((r) => !(r.date >= today && (r.status === 'CONFIRMED' || r.status === 'PENDING'))))
      .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time));

    const canAct = dedupe(allActivities
      .filter((b) => b.status === 'CANCELLED' || b.status === 'NO_SHOW'))
      .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time));
    
    const canRes = dedupe(allReservations
      .filter((r) => r.status === 'CANCELLED' || r.status === 'NO_SHOW'))
      .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time));

    return {
      upcomingActivities: upAct, upcomingReservations: upRes,
      completedActivities: compAct, completedReservations: compRes,
      cancelledActivities: canAct, cancelledReservations: canRes,
    };
  }, [allActivities, allReservations, today]);

  // Debug logging for filtered counts
  useEffect(() => {
    if (bookings && !isLoading) {
      debugLog('Data loaded', {
        guestId: guest?.guestId,
        resortId: guest?.resortId,
        resortCode,
        rawActivityCount: allActivities.length,
        rawReservationCount: allReservations.length,
        upcomingActivities: upcomingActivities.length,
        upcomingReservations: upcomingReservations.length,
        completedActivities: completedActivities.length,
        completedReservations: completedReservations.length,
        cancelledActivities: cancelledActivities.length,
        cancelledReservations: cancelledReservations.length,
        today,
      });
    }
  }, [bookings, isLoading, guest?.guestId, guest?.resortId, resortCode, debugLog, today, allActivities.length, allReservations.length, upcomingActivities.length, upcomingReservations.length, completedActivities.length, completedReservations.length, cancelledActivities.length, cancelledReservations.length]);

  // Apply filter
  const showActivities = filter === 'all' || filter === 'activities';
  const showDining = filter === 'all' || filter === 'dining';

  const canCancelActivity = (booking: any) => {
    if (!booking.is_own_booking) return false;
    if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') return false;
    if (!booking.guest_can_cancel) return false;
    const sessionDateTime = new Date(`${booking.date}T${booking.start_time}`);
    // Activities use hours for cutoff (guest_cancel_cutoff_hours)
    const cutoffHours = booking.guest_cancel_cutoff_hours ?? 24;
    const cutoff = new Date(sessionDateTime.getTime() - cutoffHours * 60 * 60 * 1000);
    return new Date() < cutoff;
  };

  const canCancelReservation = (reservation: any) => {
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

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return t('common.today');
    if (isTomorrow(date)) return t('common.tomorrow');
    return format(date, 'EEE, MMM d');
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return { 
          icon: CheckCircle2, 
          label: t('bookings.status.CONFIRMED'), 
          variant: 'confirmed' as const,
          className: 'text-emerald-600 dark:text-emerald-400'
        };
      case 'PENDING':
        return { 
          icon: AlertCircle, 
          label: t('bookings.status.PENDING'), 
          variant: 'pending' as const,
          className: 'text-amber-600 dark:text-amber-400'
        };
      case 'CANCELLED':
        return { 
          icon: XCircle, 
          label: t('bookings.status.CANCELLED'), 
          variant: 'cancelled' as const,
          className: 'text-red-500'
        };
      case 'COMPLETED':
        return { 
          icon: CheckCircle2, 
          label: t('bookings.status.COMPLETED'), 
          variant: 'completed' as const,
          className: 'text-muted-foreground'
        };
      case 'NO_SHOW':
        return { 
          icon: XCircle, 
          label: t('bookings.status.NO_SHOW'), 
          variant: 'noShow' as const,
          className: 'text-muted-foreground'
        };
      default:
        return { 
          icon: AlertCircle, 
          label: status, 
          variant: 'secondary' as const,
          className: 'text-muted-foreground'
        };
    }
  };

  const mealPeriodConfig: Record<string, { colorClass: string; bgClass: string; label: string }> = {
    BREAKFAST: { colorClass: 'text-sunset', bgClass: 'bg-sunset/10', label: t('dining.mealPeriods.BREAKFAST') },
    LUNCH: { colorClass: 'text-lagoon', bgClass: 'bg-lagoon/10', label: t('dining.mealPeriods.LUNCH') },
    DINNER: { colorClass: 'text-orchid', bgClass: 'bg-orchid/10', label: t('dining.mealPeriods.DINNER') },
    EVENT: { colorClass: 'text-coral', bgClass: 'bg-coral/10', label: t('dining.mealPeriods.EVENT') },
  };

  // Handle opening booking details
  const handleOpenBooking = useCallback((booking: any, type: 'activity' | 'restaurant') => {
    const displayModel = type === 'activity' 
      ? mapActivityToDisplayModel(booking, guest?.guestId || '')
      : mapRestaurantToDisplayModel(booking, guest?.guestId || '');
    setSelectedBooking(displayModel);
    setDetailsSheetOpen(true);
  }, [guest?.guestId]);

  const handleCloseDetailsSheet = useCallback(() => {
    setDetailsSheetOpen(false);
    setSelectedBooking(null);
  }, []);

  const handleCancelFromSheet = useCallback(() => {
    if (!selectedBooking) return;
    // Find original booking to get cutoff info
    const origActivity = allActivities.find(b => b.id === selectedBooking.id);
    const origReservation = allReservations.find(r => r.id === selectedBooking.id);
    setCancelDialog({
      type: selectedBooking.type as 'activity' | 'restaurant',
      id: selectedBooking.id,
      title: selectedBooking.title,
      date: selectedBooking.date,
      start_time: selectedBooking.startTime,
      guest_cancel_cutoff_hours: origActivity?.guest_cancel_cutoff_hours,
      guest_cancel_cutoff_minutes: origReservation?.guest_cancel_cutoff_minutes,
    });
  }, [selectedBooking, allActivities, allReservations]);

  const handleEditFromSheet = useCallback(() => {
    if (!selectedBooking) return;
    setEditDialog({
      id: selectedBooking.id,
      type: selectedBooking.type as 'activity' | 'restaurant',
      title: selectedBooking.title,
      num_adults: selectedBooking.numAdults,
      num_children: selectedBooking.numChildren,
      session_id: selectedBooking.sessionId,
      slot_id: selectedBooking.slotId,
      max_pax_per_booking: selectedBooking.maxPaxPerBooking,
    });
    setDetailsSheetOpen(false);
  }, [selectedBooking]);

  const BookingCard = ({ 
    booking, 
    type, 
    canCancel,
    canEdit,
    isPast = false
  }: { 
    booking: any; 
    type: 'activity' | 'restaurant'; 
    canCancel: boolean;
    canEdit: boolean;
    isPast?: boolean;
  }) => {
    const isActivity = type === 'activity';
    const config = isActivity ? getCategoryConfig(booking.category) : null;
    const statusConfig = getStatusConfig(booking.status);
    const StatusIcon = statusConfig.icon;
    const restaurantConfig = !isActivity ? (mealPeriodConfig[booking.meal_period] || mealPeriodConfig.DINNER) : null;
    
    return (
      <Card 
        className={cn(
          "guest-card-interactive overflow-hidden transition-all cursor-pointer",
          isPast && "opacity-60"
        )}
        onClick={() => handleOpenBooking(booking, type)}
      >
        <CardContent className="p-0">
          {/* Status bar at top */}
          <div className={cn(
            "flex items-center justify-between px-4 py-2 border-b",
            booking.status === 'CONFIRMED' && "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30",
            booking.status === 'PENDING' && "bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30",
            booking.status === 'CANCELLED' && "bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30",
            (booking.status === 'COMPLETED' || booking.status === 'NO_SHOW') && "bg-muted/30 border-border"
          )}>
            <StatusPill {...bookingStatusToVariant(booking.status)} />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          
          {/* Main content */}
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl shrink-0",
                booking.status === 'CANCELLED' 
                  ? "bg-muted" 
                  : isActivity && config 
                    ? config.bgClass 
                    : restaurantConfig?.bgClass || "bg-sunset/10"
              )}>
                {isActivity ? (
                  <CategoryIcon 
                    category={booking.category} 
                    size={24} 
                    className={booking.status === 'CANCELLED' ? "text-muted-foreground" : undefined}
                  />
                ) : (
                  <IconRestaurants className={cn(
                    "h-6 w-6", 
                    booking.status === 'CANCELLED' ? "text-muted-foreground" : restaurantConfig?.colorClass || "text-sunset"
                  )} />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground truncate">
                    {isActivity ? booking.activity_name : booking.restaurant_name}
                  </h3>
                  {/* Pre-arrival "Planned" badge */}
                  {isActivity && booking.booking_source === 'PRE_STAY' && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary shrink-0">
                      Planned
                    </Badge>
                  )}
                </div>
                
                {/* Date and time - prominent */}
                <div className={cn(
                  "flex items-center gap-2 text-sm mb-2",
                  booking.status === 'CANCELLED' 
                    ? "text-muted-foreground" 
                    : "text-foreground font-medium"
                )}>
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{getDateLabel(booking.date)}</span>
                  <span className="text-muted-foreground">•</span>
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{booking.start_time?.slice(0, 5)}</span>
                </div>
                
                {/* Meta info row */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {booking.num_adults + booking.num_children} guest{(booking.num_adults + booking.num_children) !== 1 ? 's' : ''}
                  </span>
                  
                  {isActivity && booking.category && (
                    <CategoryBadge category={booking.category} size="sm" showIcon={false} />
                  )}
                  
                  {!isActivity && booking.meal_period && (
                    <Badge className={cn("text-[10px] px-1.5 py-0", 
                      restaurantConfig?.bgClass,
                      restaurantConfig?.colorClass
                    )}>
                      {restaurantConfig?.label}
                    </Badge>
                  )}
                  
                  {isActivity && booking.duration_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {booking.duration_minutes}min
                    </span>
                  )}
                  
                  {!booking.is_own_booking && booking.booked_by && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      By {booking.booked_by.split(' ')[0]}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const totalUpcoming = upcomingActivities.length + upcomingReservations.length;
  const totalCompleted = completedActivities.length + completedReservations.length;
  const totalCancelled = cancelledActivities.length + cancelledReservations.length;
  const isEmpty = totalUpcoming === 0 && totalCompleted === 0 && totalCancelled === 0;

  return (
    <GuestPageShell>
    <motion.div 
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Header */}
      <MobilePageHeader 
        title={t('bookings.title')} 
        subtitle={t('bookings.subtitle')}
        showBack={false}
      />

      {/* Today's Quick Status - Always visible */}
      <div className="guest-card-surface mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Today</p>
              <p className="text-xs text-muted-foreground">{format(new Date(), 'EEEE, MMM d')}</p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
            {(showActivities ? upcomingActivities : []).filter(a => a.date === today).length + 
             (showDining ? upcomingReservations : []).filter(r => r.date === today).length} today
          </span>
        </div>
      </div>

      {/* Quick Filter Tabs */}
      {!isEmpty && (
        <div className="guest-chip-row">
          {[
            { value: 'all', label: t('bookings.all'), icon: IconBookings, count: totalUpcoming },
            { value: 'activities', label: t('bookings.filterActivities'), icon: IconActivities, count: upcomingActivities.length },
            { value: 'dining', label: t('bookings.filterDining'), icon: IconRestaurants, count: upcomingReservations.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = filter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setFilter(tab.value as FilterType)}
                 className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all tap-target border",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm border-primary ring-1 ring-primary/20" 
                    : "bg-card text-muted-foreground border-border/50 hover:bg-muted hover:text-foreground hover:border-border"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={cn(
                    "ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                    isActive ? "bg-primary-foreground/20" : "bg-background"
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {isLoading ? (
        <GuestBookingsLoading />
      ) : isError ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <Card className="guest-card border-destructive/30 bg-destructive/5 w-full">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('bookings.errorLoadingTitle', 'Unable to load bookings')}
              </h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-xs">
                {t('bookings.errorLoadingDescription', 'There was a problem fetching your bookings. Please try again.')}
              </p>
              <Button 
                variant="outline" 
                onClick={() => refetch()}
                className="gap-2"
              >
                <Loader2 className="h-4 w-4" />
                {t('common.tryAgain', 'Try Again')}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : isEmpty ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <Card className="guest-card border-dashed bg-muted/20 w-full">
            <GuestEmptyState
              icon={Calendar}
              title={t('bookings.noBookings')}
              description={t('bookings.noBookingsDescription')}
              actionLabel={t('bookings.browseActivities')}
              actionHref={GUEST_ROUTES.ACTIVITIES}
              secondaryActionLabel={t('bookings.viewRestaurants')}
              secondaryActionHref={GUEST_ROUTES.RESTAURANTS}
            />
          </Card>
        </div>
      ) : (
        <>
          {/* Upcoming Summary */}
          {totalUpcoming > 0 && (
            <div className="guest-card p-4 bg-gradient-to-r from-primary/5 to-lagoon/5 border-primary/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('bookings.upcoming')}</p>
                  <p className="text-2xl font-bold text-foreground">{totalUpcoming}</p>
                </div>
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-lg font-semibold text-lagoon">{upcomingActivities.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('nav.activities')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-sunset">{upcomingReservations.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('nav.dining')}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Activities */}
          {showActivities && (
            <div>
              <GuestSectionHeader
                title="Activities"
                count={upcomingActivities.length}
                icon={IconActivities}
                iconClassName="text-lagoon"
                iconBgClassName="bg-lagoon/10"
                actionLabel="Book more"
                actionHref={GUEST_ROUTES.ACTIVITIES}
              />
              {upcomingActivities.length === 0 ? (
                <Card className="border-dashed bg-muted/10">
                  <CardContent className="py-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">No upcoming activities</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={GUEST_ROUTES.ACTIVITIES}>Browse Activities</Link>
                    </Button>
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
          )}

          {/* Upcoming Reservations */}
          {showDining && (
            <div>
              <GuestSectionHeader
                title="Dining"
                count={upcomingReservations.length}
                icon={IconRestaurants}
                iconClassName="text-sunset"
                iconBgClassName="bg-sunset/10"
                actionLabel="Reserve table"
                actionHref={GUEST_ROUTES.RESTAURANTS}
              />
              {upcomingReservations.length === 0 ? (
                <Card className="border-dashed bg-muted/10">
                  <CardContent className="py-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">No upcoming reservations</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to={GUEST_ROUTES.RESTAURANTS}>View Restaurants</Link>
                    </Button>
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
          )}

          {/* Completed Bookings */}
          {totalCompleted > 0 && (
            <Collapsible open={showPast} onOpenChange={setShowPast}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between text-muted-foreground hover:text-foreground h-12 tap-target"
                >
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Completed
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{totalCompleted}</Badge>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", showPast && "rotate-180")} />
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                {[
                  ...(showActivities ? completedActivities : []), 
                  ...(showDining ? completedReservations : [])
                ]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      type={booking.booking_type}
                      canCancel={false}
                      canEdit={false}
                      isPast
                    />
                  ))}
              </CollapsibleContent>
            </Collapsible>
          )}

          {/* Cancelled Bookings */}
          {totalCancelled > 0 && (
            <Collapsible>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full justify-between text-muted-foreground hover:text-foreground h-12 tap-target"
                >
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    {t('bookings.cancelled')}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{totalCancelled}</Badge>
                    <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-3">
                {[
                  ...(showActivities ? cancelledActivities : []), 
                  ...(showDining ? cancelledReservations : [])
                ]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      type={booking.booking_type}
                      canCancel={false}
                      canEdit={false}
                      isPast
                    />
                  ))}
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      )}

      {/* Cancel Confirmation Bottom Sheet */}
      <Drawer open={!!cancelDialog} onOpenChange={(open) => !open && setCancelDialog(null)}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle className="text-lg">{t('bookings.cancelConfirmTitle')}</DrawerTitle>
            <DrawerDescription className="text-sm">
              {t('bookings.cancelConfirmDescription')} <span className="font-semibold text-foreground">"{cancelDialog?.title}"</span>
            </DrawerDescription>
          </DrawerHeader>

          {/* Policy summary */}
          <div className="px-5 pb-4">
            {cancelDialog?.date && cancelDialog?.start_time && (
              <div className="guest-card-surface p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>{format(parseISO(cancelDialog.date), 'EEEE, MMM d')} at {cancelDialog.start_time.slice(0, 5)}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0 text-warning" />
                  <span>
                    {cancelDialog.type === 'restaurant'
                      ? `Cancellations must be made at least ${cancelDialog.guest_cancel_cutoff_minutes ?? 60} minutes before your reservation.`
                      : `Cancellations must be made at least ${cancelDialog.guest_cancel_cutoff_hours ?? 24} hours before the activity.`}
                  </span>
                </div>
              </div>
            )}
          </div>

          <DrawerFooter className="flex-col gap-2">
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelActivityMutation.isPending || cancelReservationMutation.isPending}
              className="w-full h-12 tap-target"
            >
              {(cancelActivityMutation.isPending || cancelReservationMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('bookings.yesCancel')}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="w-full h-12 tap-target">
                {t('bookings.keepBooking')}
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Edit Booking Dialog */}
      <EditBookingDialog
        open={!!editDialog}
        onOpenChange={(open) => !open && setEditDialog(null)}
        booking={editDialog}
      />

      {/* Booking Details Sheet */}
      <BookingDetailsSheet
        open={detailsSheetOpen}
        onOpenChange={setDetailsSheetOpen}
        booking={selectedBooking}
        onCancel={selectedBooking?.canCancel ? handleCancelFromSheet : undefined}
        onEdit={selectedBooking?.canEdit ? handleEditFromSheet : undefined}
        isCancelling={cancelActivityMutation.isPending || cancelReservationMutation.isPending}
      />

      {/* Debug Panel - only shown with ?debug=1 */}
      {showDebugPanel && (
        <GuestDebugPanel
          guestId={guest?.guestId}
          resortId={guest?.resortId}
          resortCode={resortCode}
          roomNumber={guest?.roomNumber}
          bookingsData={bookings}
          isLoading={isLoading}
          error={queryError as Error | null}
          filters={{
            upcoming: upcomingActivities.length + upcomingReservations.length,
            completed: completedActivities.length + completedReservations.length,
            cancelled: cancelledActivities.length + cancelledReservations.length,
          }}
        />
      )}
    </motion.div>
    </GuestPageShell>
  );
}
