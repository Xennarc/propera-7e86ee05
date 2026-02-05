import { MessageSquare, Clock, Accessibility } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { TripRequestWithDetails } from '@/hooks/transport/useTripDetails';
import { cn } from '@/lib/utils';

interface TripQuickInfoChipsProps {
  tripRequests?: TripRequestWithDetails[] | null;
  trip?: { scheduled_for?: string | null } | null;
  className?: string;
}

/**
 * Quick info chips showing relevant trip context at a glance.
 * Derives all data from already-fetched trip/request fields.
 */
export function TripQuickInfoChips({
  tripRequests,
  trip,
  className,
}: TripQuickInfoChipsProps) {
  const hasNotes = (tripRequests || []).some(
    (req) => req.notes || req.pickup_text || req.dropoff_text
  );
  
  const isScheduled = trip?.scheduled_for && new Date(trip.scheduled_for) > new Date();
  
  const needsAccessibility = (tripRequests || []).some(
    (req) => req.needs_accessible === true
  );

  // Don't render if no chips to show
  if (!hasNotes && !isScheduled && !needsAccessibility) {
    return null;
  }

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {hasNotes && (
        <Badge 
          variant="outline" 
          className="text-xs gap-1 border-amber-500/50 text-amber-700 dark:text-amber-400 bg-amber-500/5"
        >
          <MessageSquare className="h-3 w-3" />
          Notes
        </Badge>
      )}
      {isScheduled && (
        <Badge 
          variant="outline" 
          className="text-xs gap-1 border-blue-500/50 text-blue-700 dark:text-blue-400 bg-blue-500/5"
        >
          <Clock className="h-3 w-3" />
          Scheduled
        </Badge>
      )}
      {needsAccessibility && (
        <Badge 
          variant="outline" 
          className="text-xs gap-1 border-purple-500/50 text-purple-700 dark:text-purple-400 bg-purple-500/5"
        >
          <Accessibility className="h-3 w-3" />
          Accessibility
        </Badge>
      )}
    </div>
  );
}
