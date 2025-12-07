import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { useTranslation } from 'react-i18next';
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
import { Calendar, Utensils, ChevronDown, Loader2, X, Users, Clock, Pencil, MapPin, AlertCircle, CheckCircle2, XCircle, History } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { CategoryIcon, CategoryBadge } from '@/components/ui/category-badge';
import { getCategoryConfig } from '@/lib/activity-category-config';
import { IconRestaurants, IconActivities, IconBookings } from '@/components/icons/ProperaIcons';
import { EditBookingDialog } from '@/components/guest/EditBookingDialog';
import { GuestBookingsLoading } from '@/components/guest/GuestLoadingSkeleton';
import { GuestEmptyState } from '@/components/guest/GuestEmptyState';
import { GuestSectionHeader } from '@/components/guest/GuestSectionHeader';
import { Link } from 'react-router-dom';

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
  const [showPast, setShowPast] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
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
    staleTime: 30000,
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
      await queryClient.cancelQueries({ queryKey: ['guest-room-bookings'] });
      const previousBookings = queryClient.getQueryData(['guest-room-bookings', guest?.resortId, guest?.roomNumber, roomGuests]);
      
      queryClient.setQueryData(['guest-room-bookings', guest?.resortId, guest?.roomNumber, roomGuests], (old: any) => {
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
      queryClient.invalidateQueries({ queryKey: ['guest-room-bookings'] });
    },
    onError: (error: Error, _bookingId, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(['guest-room-bookings', guest?.resortId, guest?.roomNumber, roomGuests], context.previousBookings);
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
      await queryClient.cancelQueries({ queryKey: ['guest-room-bookings'] });
      const previousBookings = queryClient.getQueryData(['guest-room-bookings', guest?.resortId, guest?.roomNumber, roomGuests]);
      
      queryClient.setQueryData(['guest-room-bookings', guest?.resortId, guest?.roomNumber, roomGuests], (old: any) => {
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
      queryClient.invalidateQueries({ queryKey: ['guest-room-bookings'] });
    },
    onError: (error: Error, _reservationId, context) => {
      if (context?.previousBookings) {
        queryClient.setQueryData(['guest-room-bookings', guest?.resortId, guest?.roomNumber, roomGuests], context.previousBookings);
      }
      const errorCode = mapCancelErrorToCode(error.message);
      const friendlyMessage = getBookingErrorMessage(errorCode, 'guest');
      toast.error(friendlyMessage);
    },
  });

  if (!guest) return null;

  const today = new Date().toISOString().split('T')[0];

  // Separate bookings by status
  const allActivities = bookings?.activity_bookings || [];
  const allReservations = bookings?.restaurant_reservations || [];
  
  // For upcoming: only show CONFIRMED or PENDING bookings for future/today dates
  const upcomingActivities = allActivities
    .filter((b) => b.date >= today && (b.status === 'CONFIRMED' || b.status === 'PENDING'))
    .filter((b, index, self) => index === self.findIndex(other => other.id === b.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
  
  const upcomingReservations = allReservations
    .filter((r) => r.date >= today && (r.status === 'CONFIRMED' || r.status === 'PENDING'))
    .filter((r, index, self) => index === self.findIndex(other => other.id === r.id))
    .sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time));
  
  // For completed: past dates with COMPLETED status or past dates with CONFIRMED (assumed completed)
  const completedActivities = allActivities
    .filter((b) => (b.date < today && b.status !== 'CANCELLED' && b.status !== 'NO_SHOW') || b.status === 'COMPLETED')
    .filter((b) => !(b.date >= today && (b.status === 'CONFIRMED' || b.status === 'PENDING')))
    .filter((b, index, self) => index === self.findIndex(other => other.id === b.id))
    .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time));
  
  const completedReservations = allReservations
    .filter((r) => (r.date < today && r.status !== 'CANCELLED' && r.status !== 'NO_SHOW') || r.status === 'COMPLETED')
    .filter((r) => !(r.date >= today && (r.status === 'CONFIRMED' || r.status === 'PENDING')))
    .filter((r, index, self) => index === self.findIndex(other => other.id === r.id))
    .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time));

  // For cancelled/no-show: explicitly cancelled or no-show bookings
  const cancelledActivities = allActivities
    .filter((b) => b.status === 'CANCELLED' || b.status === 'NO_SHOW')
    .filter((b, index, self) => index === self.findIndex(other => other.id === b.id))
    .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time));
  
  const cancelledReservations = allReservations
    .filter((r) => r.status === 'CANCELLED' || r.status === 'NO_SHOW')
    .filter((r, index, self) => index === self.findIndex(other => other.id === r.id))
    .sort((a, b) => b.date.localeCompare(a.date) || b.start_time.localeCompare(a.start_time));

  // Apply filter
  const showActivities = filter === 'all' || filter === 'activities';
  const showDining = filter === 'all' || filter === 'dining';

  const canCancelActivity = (booking: any) => {
    if (!booking.is_own_booking) return false;
    if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') return false;
    if (!booking.guest_can_cancel) return false;
    const sessionDateTime = new Date(`${booking.date}T${booking.start_time}`);
    const cutoff = new Date(sessionDateTime.getTime() - booking.guest_cancel_cutoff_hours * 60 * 60 * 1000);
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
      <Card className={cn(
        "guest-card-interactive overflow-hidden transition-all",
        isPast && "opacity-60"
      )}>
        <CardContent className="p-0">
          {/* Status bar at top */}
          <div className={cn(
            "flex items-center justify-between px-4 py-2 border-b",
            booking.status === 'CONFIRMED' && "bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30",
            booking.status === 'PENDING' && "bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30",
            booking.status === 'CANCELLED' && "bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30",
            (booking.status === 'COMPLETED' || booking.status === 'NO_SHOW') && "bg-muted/30 border-border"
          )}>
            <div className="flex items-center gap-2">
              <StatusIcon className={cn("h-4 w-4", statusConfig.className)} />
              <span className={cn("text-sm font-medium", statusConfig.className)}>
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-muted-foreground hover:text-foreground tap-target"
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
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:ml-1 text-xs">Edit</span>
                </Button>
              )}
              {canCancel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10 tap-target"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCancelDialog({
                      type,
                      id: booking.id,
                      title: isActivity ? booking.activity_name : booking.restaurant_name,
                    });
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:ml-1 text-xs">Cancel</span>
                </Button>
              )}
            </div>
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
                <h3 className="font-semibold text-foreground truncate mb-1">
                  {isActivity ? booking.activity_name : booking.restaurant_name}
                </h3>
                
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
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">{t('bookings.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('bookings.subtitle')}</p>
      </div>

      {/* Quick Filter Tabs */}
      {!isEmpty && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
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
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all tap-target",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
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
      ) : isEmpty ? (
        <Card className="guest-card border-dashed bg-muted/20">
          <GuestEmptyState
            icon={Calendar}
            title={t('bookings.noBookings')}
            description={t('bookings.noBookingsDescription')}
            actionLabel={t('bookings.browseActivities')}
            actionHref="/guest/activities"
            secondaryActionLabel={t('bookings.viewRestaurants')}
            secondaryActionHref="/guest/restaurants"
          />
        </Card>
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
                actionHref="/guest/activities"
              />
              {upcomingActivities.length === 0 ? (
                <Card className="border-dashed bg-muted/10">
                  <CardContent className="py-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">No upcoming activities</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/guest/activities">Browse Activities</Link>
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
                actionHref="/guest/restaurants"
              />
              {upcomingReservations.length === 0 ? (
                <Card className="border-dashed bg-muted/10">
                  <CardContent className="py-6 text-center">
                    <p className="text-sm text-muted-foreground mb-3">No upcoming reservations</p>
                    <Button variant="outline" size="sm" asChild>
                      <Link to="/guest/restaurants">View Restaurants</Link>
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

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('bookings.cancelConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('bookings.cancelConfirmDescription')} "{cancelDialog?.title}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">{t('bookings.keepBooking')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={cancelActivityMutation.isPending || cancelReservationMutation.isPending}
            >
              {(cancelActivityMutation.isPending || cancelReservationMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t('bookings.yesCancel')}
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
