import { format, differenceInHours, differenceInMinutes } from 'date-fns';
import { AlertTriangle, Clock, Info } from 'lucide-react';
import type { BookingDisplayModel, BookingDetailsExtended } from '@/types/booking-display';

interface BookingDetailsPoliciesProps {
  booking: BookingDisplayModel;
  extendedDetails?: BookingDetailsExtended | null;
}

/**
 * Format cutoff duration in human-readable form
 * e.g., "4 hours", "30 minutes", "1 hour 30 min"
 */
function formatCutoffDuration(hours: number | undefined, isRestaurant: boolean): string {
  if (hours === undefined || hours === null) return '';
  
  // Restaurants typically use shorter windows, show minutes for < 2 hours
  if (isRestaurant && hours < 2) {
    const minutes = Math.round(hours * 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  }
  
  // For whole hours, show simply
  if (hours === Math.floor(hours)) {
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  }
  
  // For fractional hours, convert to hours and minutes
  const wholeHours = Math.floor(hours);
  const remainingMinutes = Math.round((hours - wholeHours) * 60);
  
  if (wholeHours === 0) {
    return `${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
  }
  
  if (remainingMinutes === 0) {
    return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''}`;
  }
  
  return `${wholeHours} hour${wholeHours !== 1 ? 's' : ''} ${remainingMinutes} min`;
}

/**
 * Format deadline display with relative time when close
 */
function formatDeadlineDisplay(cutoffTime: Date): { primary: string; secondary?: string } {
  const now = new Date();
  const hoursUntil = differenceInHours(cutoffTime, now);
  
  if (cutoffTime < now) {
    // Deadline passed - show absolute time
    return { primary: format(cutoffTime, 'MMM d, h:mm a') };
  }
  
  if (hoursUntil < 24) {
    // Within 24 hours - show relative time
    const minutesUntil = differenceInMinutes(cutoffTime, now);
    if (minutesUntil < 60) {
      return { 
        primary: `${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''} remaining`,
        secondary: format(cutoffTime, 'h:mm a')
      };
    }
    return { 
      primary: `${hoursUntil} hour${hoursUntil !== 1 ? 's' : ''} remaining`,
      secondary: format(cutoffTime, 'h:mm a')
    };
  }
  
  // More than 24 hours - show absolute time
  return { primary: format(cutoffTime, 'MMM d, h:mm a') };
}

export function BookingDetailsPolicies({ booking, extendedDetails }: BookingDetailsPoliciesProps) {
  const isPast = booking.status === 'COMPLETED' || booking.status === 'CANCELLED' || booking.status === 'NO_SHOW';
  
  // Don't show policies for past bookings
  if (isPast) return null;

  // Check if we have any policy info to show
  const hasCancellationInfo = booking.guestCanCancel !== false && booking.cancelCutoffTime;
  const hasPolicyText = extendedDetails?.cancellationPolicyText;
  
  if (!hasCancellationInfo && !hasPolicyText) return null;

  // Calculate cancellation deadline
  const canStillCancel = booking.canCancel;
  const cutoffTime = booking.cancelCutoffTime;
  const deadlineDisplay = cutoffTime ? formatDeadlineDisplay(cutoffTime) : null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Info className="h-4 w-4 text-muted-foreground" />
        Cancellation Policy
      </h3>

      <div className="bg-muted/20 rounded-xl p-4 space-y-3">
        {/* Cancellation Window Status */}
        {hasCancellationInfo && (
          <div className={`flex items-start gap-3 ${canStillCancel ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {canStillCancel ? (
              <Clock className="h-5 w-5 mt-0.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0" />
            )}
            <div>
              {canStillCancel ? (
                <>
                  <p className="font-medium">Free cancellation available</p>
                  {deadlineDisplay && (
                    <p className="text-sm opacity-80">
                      {deadlineDisplay.primary}
                      {deadlineDisplay.secondary && (
                        <span className="block text-xs opacity-70">by {deadlineDisplay.secondary}</span>
                      )}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-medium">Cancellation window closed</p>
                  {cutoffTime && (
                    <p className="text-sm opacity-80">
                      Deadline was {format(cutoffTime, 'MMM d, h:mm a')}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Policy Text from database */}
        {hasPolicyText && (
          <p className="text-sm text-muted-foreground">
            {extendedDetails.cancellationPolicyText}
          </p>
        )}

        {/* Default policy message if no custom text - using smart formatting */}
        {!hasPolicyText && hasCancellationInfo && booking.cancelCutoffHours !== undefined && (
          <p className="text-sm text-muted-foreground">
            {booking.type === 'restaurant' 
              ? `Reservations can be cancelled up to ${formatCutoffDuration(booking.cancelCutoffHours, true)} before your booking time.`
              : `Bookings can be cancelled up to ${formatCutoffDuration(booking.cancelCutoffHours, false)} before the activity starts.`
            }
          </p>
        )}

        {/* No self-cancel info */}
        {booking.guestCanCancel === false && (
          <div className="flex items-start gap-3 text-muted-foreground">
            <Info className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Cancellation requires assistance</p>
              <p className="text-sm">
                Please contact the front desk to modify or cancel this booking.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
