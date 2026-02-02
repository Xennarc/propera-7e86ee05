import { formatDistanceToNow, differenceInMinutes, format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { 
  Car, 
  User, 
  MapPin, 
  Clock, 
  Users,
  Inbox,
  CheckCircle2,
} from 'lucide-react';
import type { TripHistoryRow } from '@/hooks/transport/useTransportHistory';

interface TripHistoryListProps {
  trips: TripHistoryRow[];
  isLoading: boolean;
  onSelectTrip: (trip: TripHistoryRow) => void;
  selectedId?: string;
}

export function TripHistoryList({ 
  trips, 
  isLoading, 
  onSelectTrip,
  selectedId,
}: TripHistoryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }
  
  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
          <Inbox className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No completed trips</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Completed trips will appear here once drivers finish their runs.
        </p>
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-4">
        {trips.map((trip) => {
          const duration = trip.start_at && trip.end_at 
            ? differenceInMinutes(new Date(trip.end_at), new Date(trip.start_at))
            : null;
          
          return (
            <button
              key={trip.id}
              onClick={() => onSelectTrip(trip)}
              className={cn(
                'w-full text-left p-4 rounded-xl border transition-all',
                'hover:bg-accent/50 hover:border-primary/20',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                selectedId === trip.id && 'bg-accent border-primary/30'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Trip header */}
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline" className="gap-1 shrink-0">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                      Completed
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {trip.end_at ? format(new Date(trip.end_at), 'MMM d, h:mm a') : 'Unknown time'}
                    </span>
                  </div>
                  
                  {/* Driver & Buggy */}
                  <div className="flex flex-wrap items-center gap-3 mb-2 text-sm">
                    {trip.driver_name && (
                      <span className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        {trip.driver_name}
                      </span>
                    )}
                    {trip.buggy_name && (
                      <span className="flex items-center gap-1.5">
                        <Car className="h-3.5 w-3.5 text-muted-foreground" />
                        {trip.buggy_name}
                      </span>
                    )}
                  </div>
                  
                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {trip.request_count} request{trip.request_count !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {trip.stop_count} stops
                    </span>
                    {duration !== null && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {duration} min
                      </span>
                    )}
                    {trip.capacity_total && (
                      <span>
                        {trip.capacity_total} passengers
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
