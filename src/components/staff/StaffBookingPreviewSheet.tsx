/**
 * StaffBookingPreviewSheet - Unified side sheet for previewing activity bookings
 * and restaurant reservations with quick actions.
 */

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { useStaffBookingCancel, canCancelBooking } from '@/hooks/useStaffBookingCancel';
import { safeFormatDate } from '@/lib/safe-date-format';
import { isBefore, startOfDay } from 'date-fns';
import { safeParseDateISO } from '@/lib/safe-date-format';
import {
  User,
  Users,
  Calendar,
  Clock,
  MapPin,
  FileText,
  AlertTriangle,
  ExternalLink,
  XCircle,
  Loader2,
  Utensils,
  Waves,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types matching GuestDetailPage interfaces
interface ActivityBookingWithSession {
  id: string;
  guest_id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  num_adults: number;
  num_children: number;
  booking_source?: string | null;
  notes?: string | null;
  room_number?: string;
  created_at?: string;
  session: {
    id: string;
    date: string;
    start_time: string;
    end_time?: string;
    activity: {
      name: string;
      cancellation_policy_text?: string | null;
      guest_cancel_cutoff_hours?: number;
    } | null;
  } | null;
}

interface ReservationWithSlot {
  id: string;
  guest_id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  num_adults: number;
  num_children: number;
  special_requests?: string | null;
  room_number?: string;
  created_at?: string;
  slot: {
    id: string;
    date: string;
    start_time: string;
    end_time?: string;
    meal_period: string;
    restaurant: {
      name: string;
      guest_cancel_cutoff_minutes?: number;
    } | null;
  } | null;
}

export interface StaffBookingPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activityBooking?: ActivityBookingWithSession | null;
  restaurantReservation?: ReservationWithSlot | null;
  guestName?: string;
  onNavigateToDetail?: () => void;
  onRefresh?: () => void;
  canCancel?: boolean;
}

export function StaffBookingPreviewSheet({
  open,
  onOpenChange,
  activityBooking,
  restaurantReservation,
  guestName,
  onNavigateToDetail,
  onRefresh,
  canCancel = false,
}: StaffBookingPreviewSheetProps) {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const { cancelActivity, cancelReservation, isCancelling } = useStaffBookingCancel();

  const isActivity = !!activityBooking;
  const booking = activityBooking || restaurantReservation;

  if (!booking) return null;

  // Extract common fields
  const title = isActivity
    ? activityBooking?.session?.activity?.name || 'Unknown Activity'
    : restaurantReservation?.slot?.restaurant?.name || 'Unknown Restaurant';

  const date = isActivity
    ? activityBooking?.session?.date
    : restaurantReservation?.slot?.date;

  const startTime = isActivity
    ? activityBooking?.session?.start_time
    : restaurantReservation?.slot?.start_time;

  const endTime = isActivity
    ? activityBooking?.session?.end_time
    : restaurantReservation?.slot?.end_time;

  const numAdults = booking.num_adults || 0;
  const numChildren = booking.num_children || 0;
  const totalPax = numAdults + numChildren;

  const notes = isActivity
    ? activityBooking?.notes
    : restaurantReservation?.special_requests;

  const roomNumber = booking.room_number;
  const bookingSource = isActivity ? activityBooking?.booking_source : null;
  const mealPeriod = !isActivity ? restaurantReservation?.slot?.meal_period : null;

  // Cancellation policy
  const cancellationPolicy = isActivity
    ? activityBooking?.session?.activity?.cancellation_policy_text
    : null;

  // Check if booking is in the past
  const parsedDate = date ? safeParseDateISO(date) : null;
  const isPast = parsedDate ? isBefore(parsedDate, startOfDay(new Date())) : false;

  // Can this specific booking be cancelled?
  const canCancelThis = canCancel && canCancelBooking(booking.status, isPast);

  const handleCancel = async () => {
    if (isActivity && activityBooking) {
      const result = await cancelActivity(activityBooking.id, activityBooking.guest_id);
      if (result.success) {
        setCancelDialogOpen(false);
        onOpenChange(false);
        onRefresh?.();
      }
    } else if (restaurantReservation) {
      const result = await cancelReservation(restaurantReservation.id, restaurantReservation.guest_id);
      if (result.success) {
        setCancelDialogOpen(false);
        onOpenChange(false);
        onRefresh?.();
      }
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return '-';
    return time.slice(0, 5);
  };

  const getSourceLabel = (source?: string | null) => {
    switch (source) {
      case 'PRE_STAY':
        return 'Pre-arrival';
      case 'GUEST_PORTAL':
        return 'Guest Portal';
      case 'STAFF_FRONT_DESK':
        return 'Front Desk';
      case 'STAFF_DIVE':
        return 'Dive Center';
      case 'STAFF_FNB':
        return 'F&B';
      default:
        return 'In-house';
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader className="space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                {isActivity ? (
                  <Waves className="h-5 w-5 text-primary" />
                ) : (
                  <Utensils className="h-5 w-5 text-primary" />
                )}
                <SheetTitle className="text-lg">{title}</SheetTitle>
              </div>
              <StatusBadge status={booking.status} />
            </div>
            <SheetDescription className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              {date ? safeFormatDate(date, 'EEEE, MMMM d') : 'Unknown date'}
              <span className="text-muted-foreground">•</span>
              <Clock className="h-4 w-4" />
              {formatTime(startTime)}
              {endTime && ` - ${formatTime(endTime)}`}
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-16rem)] mt-6">
            <div className="space-y-6 pr-4">
              {/* Guest & Party Info */}
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                {guestName && (
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Guest</p>
                      <p className="font-medium">{guestName}</p>
                    </div>
                    {roomNumber && (
                      <Badge variant="outline" className="ml-auto">
                        Room {roomNumber}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Party Size</p>
                    <p className="font-medium">
                      {numAdults} adult{numAdults !== 1 ? 's' : ''}
                      {numChildren > 0 && `, ${numChildren} child${numChildren !== 1 ? 'ren' : ''}`}
                      <span className="text-muted-foreground ml-1">({totalPax} total)</span>
                    </p>
                  </div>
                </div>

                {mealPeriod && (
                  <div className="flex items-center gap-3">
                    <Utensils className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Meal Period</p>
                      <Badge variant="outline">{mealPeriod}</Badge>
                    </div>
                  </div>
                )}

                {bookingSource && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Booked via</p>
                      <p className="text-sm">{getSourceLabel(bookingSource)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes / Special Requests */}
              {notes && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="h-4 w-4" />
                    {isActivity ? 'Notes' : 'Special Requests'}
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
                  </div>
                </div>
              )}

              {/* Cancellation Policy */}
              {cancellationPolicy && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Cancellation Policy
                  </div>
                  <div className="rounded-lg border border-warning/20 bg-warning/5 p-3">
                    <p className="text-sm text-muted-foreground">{cancellationPolicy}</p>
                  </div>
                </div>
              )}

              {/* Status Info for past/cancelled */}
              {isPast && booking.status !== 'CANCELLED' && (
                <div className="rounded-lg border bg-muted/30 p-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    This booking is in the past
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Quick Actions */}
          <div className="mt-6 pt-4 border-t space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                onNavigateToDetail?.();
                onOpenChange(false);
              }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full {isActivity ? 'Session' : 'Slot'}
            </Button>

            {canCancelThis && (
              <Button
                variant="destructive"
                className="w-full"
                onClick={() => setCancelDialogOpen(true)}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Cancel {isActivity ? 'Booking' : 'Reservation'}
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel {isActivity ? 'Booking' : 'Reservation'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the {isActivity ? 'activity booking' : 'restaurant reservation'} for {title}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, cancel'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
