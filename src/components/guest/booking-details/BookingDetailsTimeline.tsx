import { format, parseISO } from 'date-fns';
import { Check, Clock, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BookingDisplayModel } from '@/types/booking-display';

interface BookingDetailsTimelineProps {
  booking: BookingDisplayModel;
}

type TimelineStep = {
  label: string;
  timestamp?: string;
  status: 'complete' | 'current' | 'upcoming';
};

function getTimelineSteps(booking: BookingDisplayModel): TimelineStep[] {
  const steps: TimelineStep[] = [];
  
  // Step 1: Booked
  steps.push({
    label: 'Booked',
    timestamp: booking.createdAt,
    status: booking.createdAt ? 'complete' : 'upcoming',
  });

  // Step 2: Confirmed or Pending
  if (booking.status === 'CANCELLED') {
    steps.push({
      label: 'Cancelled',
      timestamp: booking.cancelledAt,
      status: 'complete',
    });
  } else if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
    steps.push({
      label: 'Confirmed',
      timestamp: booking.confirmedAt || booking.createdAt,
      status: 'complete',
    });
  } else if (booking.status === 'PENDING') {
    steps.push({
      label: 'Awaiting Confirmation',
      status: 'current',
    });
  }

  // Step 3: Completed (only for non-cancelled bookings)
  if (booking.status !== 'CANCELLED') {
    if (booking.status === 'COMPLETED') {
      steps.push({
        label: 'Completed',
        timestamp: booking.completedAt,
        status: 'complete',
      });
    } else if (booking.status === 'NO_SHOW') {
      steps.push({
        label: 'No Show',
        status: 'complete',
      });
    } else {
      // Future booking
      steps.push({
        label: 'Experience Day',
        status: 'upcoming',
      });
    }
  }

  return steps;
}

export function BookingDetailsTimeline({ booking }: BookingDetailsTimelineProps) {
  const steps = getTimelineSteps(booking);
  
  // Don't show timeline if we only have createdAt
  if (!booking.createdAt && !booking.confirmedAt && !booking.cancelledAt && !booking.completedAt) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Booking Timeline</h3>
      
      <div className="relative pl-6 space-y-4">
        {/* Vertical line */}
        <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border" />

        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.label} className="relative flex items-start gap-3">
              {/* Step indicator */}
              <div className={cn(
                "absolute left-[-24px] flex h-6 w-6 items-center justify-center rounded-full border-2 bg-background",
                step.status === 'complete' && "border-emerald-500 bg-emerald-500",
                step.status === 'current' && "border-primary bg-primary",
                step.status === 'upcoming' && "border-muted-foreground/30"
              )}>
                {step.status === 'complete' ? (
                  <Check className="h-3.5 w-3.5 text-white" />
                ) : step.status === 'current' ? (
                  <Clock className="h-3.5 w-3.5 text-primary-foreground" />
                ) : (
                  <Circle className="h-2.5 w-2.5 text-muted-foreground/50" />
                )}
              </div>

              {/* Step content */}
              <div className="min-w-0 pt-0.5">
                <p className={cn(
                  "text-sm font-medium",
                  step.status === 'complete' && "text-foreground",
                  step.status === 'current' && "text-primary",
                  step.status === 'upcoming' && "text-muted-foreground"
                )}>
                  {step.label}
                </p>
                {step.timestamp && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(parseISO(step.timestamp), 'MMM d, yyyy • h:mm a')}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
