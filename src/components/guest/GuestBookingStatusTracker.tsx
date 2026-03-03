/**
 * GuestBookingStatusTracker – Live session + booking status with compact timeline.
 *
 * Lifecycle: Scheduled → Check-in Open → Checked In → Departed → Completed (or Cancelled)
 *
 * Relies on existing realtime subscriptions (useGuestActivitySync) for live updates.
 * When session/booking rows change, React Query caches are invalidated automatically.
 */
import { useMemo } from 'react';
import { useFeatureEnabled } from '@/components/FeatureGate';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInMinutes, isToday } from 'date-fns';
import { Check, Clock, Circle, MapPin, Anchor, Flag, Ship, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusPill } from '@/components/guest/StatusPill';
import type { BookingDisplayModel } from '@/types/booking-display';

interface GuestBookingStatusTrackerProps {
  booking: BookingDisplayModel;
  /** Optional: pass session status directly to avoid extra fetch */
  sessionStatus?: string;
  className?: string;
}

// ── Status mapping ────────────────────────────────────────────────

type LifecyclePhase =
  | 'booked'
  | 'confirmed'
  | 'check_in_open'
  | 'checked_in'
  | 'departed'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'pending';

interface PhaseConfig {
  label: string;
  pillVariant: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'no_show' | 'active' | 'default';
  explanation: string;
  icon: typeof Check;
}

const PHASE_CONFIG: Record<LifecyclePhase, PhaseConfig> = {
  booked: {
    label: 'Booked',
    pillVariant: 'confirmed',
    explanation: 'Your spot is reserved.',
    icon: Check,
  },
  pending: {
    label: 'Pending',
    pillVariant: 'pending',
    explanation: 'Waiting for confirmation from the team.',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    pillVariant: 'confirmed',
    explanation: 'You\'re all set. Arrive 10 minutes early.',
    icon: Check,
  },
  check_in_open: {
    label: 'Check-in Open',
    pillVariant: 'active',
    explanation: 'Check-in is now open — head to the meeting point!',
    icon: MapPin,
  },
  checked_in: {
    label: 'Checked In',
    pillVariant: 'active',
    explanation: 'You\'re checked in. Enjoy your activity!',
    icon: Anchor,
  },
  departed: {
    label: 'Departed',
    pillVariant: 'active',
    explanation: 'Your group has departed. Have a great time!',
    icon: Ship,
  },
  completed: {
    label: 'Completed',
    pillVariant: 'completed',
    explanation: 'Hope you had an amazing experience!',
    icon: Flag,
  },
  cancelled: {
    label: 'Cancelled',
    pillVariant: 'cancelled',
    explanation: 'This booking was cancelled.',
    icon: XCircle,
  },
  no_show: {
    label: 'No Show',
    pillVariant: 'no_show',
    explanation: 'Marked as no-show.',
    icon: AlertCircle,
  },
};

/**
 * Resolve the guest-facing lifecycle phase from booking + session status.
 */
function resolvePhase(
  bookingStatus: string,
  sessionStatus: string | null | undefined,
): LifecyclePhase {
  // Terminal booking states
  if (bookingStatus === 'CANCELLED') return 'cancelled';
  if (bookingStatus === 'NO_SHOW') return 'no_show';
  if (bookingStatus === 'COMPLETED') return 'completed';
  if (bookingStatus === 'PENDING') return 'pending';

  // Session-level states (staff ops driven)
  switch (sessionStatus) {
    case 'COMPLETED':
      return 'completed';
    case 'DEPARTED':
      return 'departed';
    case 'CHECK_IN':
      return 'check_in_open';
    case 'CANCELLED':
      return 'cancelled';
    default:
      // SCHEDULED or null
      return 'confirmed';
  }
}

// ── Timeline steps ────────────────────────────────────────────────

const LIFECYCLE_ORDER: LifecyclePhase[] = [
  'confirmed',
  'check_in_open',
  'departed',
  'completed',
];

interface TimelineStep {
  label: string;
  icon: typeof Check;
  status: 'complete' | 'current' | 'upcoming';
  time?: string;
}

function buildTimelineSteps(
  phase: LifecyclePhase,
  booking: BookingDisplayModel,
): TimelineStep[] {
  if (phase === 'cancelled' || phase === 'no_show' || phase === 'pending') {
    return []; // No timeline for terminal/pending states
  }

  const phaseIndex = LIFECYCLE_ORDER.indexOf(phase);

  return LIFECYCLE_ORDER.map((p, idx) => {
    const config = PHASE_CONFIG[p];
    let status: TimelineStep['status'] = 'upcoming';
    if (idx < phaseIndex) status = 'complete';
    else if (idx === phaseIndex) status = 'current';

    let time: string | undefined;
    if (p === 'confirmed' && booking.createdAt) {
      time = format(parseISO(booking.createdAt), 'h:mm a');
    }

    return {
      label: config.label,
      icon: config.icon,
      status,
      time,
    };
  });
}

// ── Component ─────────────────────────────────────────────────────

export function GuestBookingStatusTracker({
  booking,
  sessionStatus: propSessionStatus,
  className,
}: GuestBookingStatusTrackerProps) {
  const opsEnabled = useFeatureEnabled('enable_activities_ops');

  // Only fetch session status if not provided and is an activity booking
  const needsFetch = booking.type === 'activity' && booking.sessionId && !propSessionStatus && opsEnabled;

  const { data: fetchedSession } = useQuery({
    queryKey: ['activity-session', booking.sessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_sessions')
        .select('status, date, start_time')
        .eq('id', booking.sessionId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!needsFetch,
    staleTime: 5_000,
  });

  const sessionStatus = propSessionStatus || fetchedSession?.status || null;

  const phase = useMemo(
    () => resolvePhase(booking.status, sessionStatus),
    [booking.status, sessionStatus],
  );

  const config = PHASE_CONFIG[phase];
  const steps = useMemo(() => buildTimelineSteps(phase, booking), [phase, booking]);

  // Contextual hint
  const contextHint = useMemo(() => {
    if (phase === 'confirmed' && booking.date && booking.startTime) {
      const sessionStart = new Date(`${booking.date}T${booking.startTime}`);
      const now = new Date();
      if (isToday(parseISO(booking.date))) {
        const minsUntil = differenceInMinutes(sessionStart, now);
        if (minsUntil > 20) {
          return `Check-in opens ~20 min before departure (${format(sessionStart, 'h:mm a')})`;
        } else if (minsUntil > 0) {
          return `Starting soon — check-in opens any moment`;
        }
      }
    }
    return null;
  }, [phase, booking.date, booking.startTime]);

  // If ops module is disabled, don't render the live tracker
  if (!opsEnabled) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Status banner */}
      <div className={cn(
        'flex items-center gap-3 rounded-xl p-3',
        phase === 'cancelled' && 'bg-destructive/5',
        phase === 'completed' && 'bg-muted/50',
        phase === 'check_in_open' && 'bg-primary/5',
        phase === 'departed' && 'bg-primary/5',
        phase === 'pending' && 'bg-warning/5',
        (phase === 'confirmed' || phase === 'booked') && 'bg-success/5',
      )}>
        <StatusPill label={config.label} variant={config.pillVariant} />
        <p className="text-xs text-muted-foreground flex-1">{config.explanation}</p>
      </div>

      {/* Context hint */}
      {contextHint && (
        <p className="text-xs text-muted-foreground px-1 flex items-center gap-1.5">
          <Clock className="h-3 w-3 shrink-0" />
          {contextHint}
        </p>
      )}

      {/* Compact timeline */}
      {steps.length > 0 && (
        <div className="relative pl-6 space-y-3">
          {/* Vertical line */}
          <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-border" />

          {steps.map((step, index) => (
            <div key={step.label} className="relative flex items-center gap-2.5">
              {/* Dot */}
              <div className={cn(
                'absolute left-[-24px] flex h-5 w-5 items-center justify-center rounded-full border-2 bg-background',
                step.status === 'complete' && 'border-success bg-success',
                step.status === 'current' && 'border-primary bg-primary',
                step.status === 'upcoming' && 'border-muted-foreground/30',
              )}>
                {step.status === 'complete' ? (
                  <Check className="h-3 w-3 text-white" />
                ) : step.status === 'current' ? (
                  <Loader2 className="h-3 w-3 text-primary-foreground animate-spin" />
                ) : (
                  <Circle className="h-2 w-2 text-muted-foreground/40" />
                )}
              </div>

              {/* Label */}
              <span className={cn(
                'text-xs font-medium',
                step.status === 'complete' && 'text-foreground',
                step.status === 'current' && 'text-primary font-semibold',
                step.status === 'upcoming' && 'text-muted-foreground',
              )}>
                {step.label}
              </span>

              {step.time && (
                <span className="text-[10px] text-muted-foreground ml-auto">{step.time}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pickup placeholder (for future transport integration) */}
      {phase === 'check_in_open' && (
        <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5 flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Pickup info will appear here when available
          </p>
        </div>
      )}
    </div>
  );
}
