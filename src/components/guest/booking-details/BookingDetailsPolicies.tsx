import { format } from 'date-fns';
import { AlertTriangle, Clock, Info } from 'lucide-react';
import type { BookingDisplayModel, BookingDetailsExtended } from '@/types/booking-display';

interface BookingDetailsPoliciesProps {
  booking: BookingDisplayModel;
  extendedDetails?: BookingDetailsExtended | null;
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
                  {cutoffTime && (
                    <p className="text-sm opacity-80">
                      Cancel before {format(cutoffTime, 'MMM d, h:mm a')}
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

        {/* Policy Text */}
        {hasPolicyText && (
          <p className="text-sm text-muted-foreground">
            {extendedDetails.cancellationPolicyText}
          </p>
        )}

        {/* Default policy message if no custom text */}
        {!hasPolicyText && hasCancellationInfo && booking.cancelCutoffHours && (
          <p className="text-sm text-muted-foreground">
            {booking.type === 'restaurant' 
              ? `Reservations can be cancelled up to ${Math.round(booking.cancelCutoffHours * 60)} minutes before your booking time.`
              : `Bookings can be cancelled up to ${booking.cancelCutoffHours} hours before the start time.`
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
