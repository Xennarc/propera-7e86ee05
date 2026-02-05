import type { TripLifecycleState } from '@/hooks/transport/useDriverLifecycleActions';
import { cn } from '@/lib/utils';

interface TripStateMicrocopyProps {
  state: TripLifecycleState;
  stopKind?: 'pickup' | 'dropoff' | 'waypoint';
  className?: string;
}

/**
 * Microcopy guidance for what the driver should do next.
 * Derived purely from trip state - no side effects.
 */
export function TripStateMicrocopy({ state, stopKind, className }: TripStateMicrocopyProps) {
  const getMicrocopy = (): string | null => {
    switch (state) {
      case 'assigned':
        return 'Head to pickup. Tap "Start Trip" when you begin moving.';
      case 'enroute_to_pickup':
        return 'Tap "Arrived" when you reach the pickup location.';
      case 'arrived_pickup':
        return 'Confirm pickup once all guests are aboard, then continue.';
      case 'enroute_to_dropoff':
        return 'Tap "Arrived" when you reach the dropoff location.';
      case 'arrived_dropoff':
        return 'Complete the stop once guests have exited.';
      case 'completed':
        return 'Trip complete! Great job.';
      default:
        return null;
    }
  };

  const microcopy = getMicrocopy();
  
  if (!microcopy) return null;

  return (
    <p className={cn(
      'text-xs text-muted-foreground mt-2 text-center',
      className
    )}>
      {microcopy}
    </p>
  );
}
