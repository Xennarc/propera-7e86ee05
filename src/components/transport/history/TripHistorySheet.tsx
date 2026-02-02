import { format, differenceInMinutes } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle2, 
  MapPin,
  Users,
  Clock,
  User,
  Car,
  ArrowDown,
  Calendar,
} from 'lucide-react';
import { useTripStops } from '@/hooks/transport';
import { useTripEvents } from '@/hooks/transport/useTransportHistory';
import type { TripHistoryRow, TripEventRow } from '@/hooks/transport/useTransportHistory';

interface TripHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: TripHistoryRow | null;
}

const eventLabels: Record<string, string> = {
  trip_created: 'Trip Created',
  request_added: 'Request Added',
  request_removed: 'Request Removed',
  assigned: 'Driver Assigned',
  started: 'Trip Started',
  stop_arrived: 'Arrived at Stop',
  stop_completed: 'Stop Completed',
  stop_skipped: 'Stop Skipped',
  stops_reordered: 'Stops Reordered',
  completed: 'Trip Completed',
};

function TripEventTimeline({ tripId }: { tripId: string }) {
  const { data: events = [], isLoading } = useTripEvents(tripId);
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-12" />
        ))}
      </div>
    );
  }
  
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No events recorded for this trip.
      </p>
    );
  }
  
  return (
    <div className="relative">
      <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
      
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="relative pl-8">
            <div className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full bg-primary border-2 border-background" />
            
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-medium text-sm">
                  {eventLabels[event.event_type] || event.event_type.replace(/_/g, ' ')}
                </span>
                <Badge variant="outline" className="text-xs h-5">
                  {event.actor_type}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(event.created_at), 'MMM d, h:mm:ss a')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TripStopsSummary({ tripId }: { tripId: string }) {
  const { data: stops = [], isLoading } = useTripStops(tripId);
  
  if (isLoading) {
    return <Skeleton className="h-32" />;
  }
  
  if (stops.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        No stops recorded.
      </p>
    );
  }
  
  return (
    <div className="space-y-2">
      {stops.map((stop, index) => (
        <div key={stop.id} className="relative">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
            <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
              stop.status === 'completed' ? 'bg-green-500 text-white' :
              stop.status === 'skipped' ? 'bg-amber-500 text-white' :
              'bg-muted-foreground/20 text-muted-foreground'
            }`}>
              {index + 1}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <MapPin className={`h-3.5 w-3.5 shrink-0 ${
                  stop.stop_kind === 'pickup' ? 'text-green-500' : 'text-red-500'
                }`} />
                <span className="font-medium text-sm truncate">
                  {stop.stop_name || stop.title || 'Unknown stop'}
                </span>
                <Badge variant="outline" className="text-xs capitalize shrink-0">
                  {stop.stop_kind}
                </Badge>
              </div>
              {stop.guest_name && (
                <p className="text-xs text-muted-foreground mt-0.5 ml-5">
                  {stop.guest_name} {stop.room_number && `• Room ${stop.room_number}`}
                </p>
              )}
            </div>
            
            <Badge 
              variant={stop.status === 'completed' ? 'default' : stop.status === 'skipped' ? 'secondary' : 'outline'}
              className="shrink-0 capitalize"
            >
              {stop.status}
            </Badge>
          </div>
          
          {index < stops.length - 1 && (
            <div className="flex justify-center py-1">
              <ArrowDown className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function TripHistorySheet({ open, onOpenChange, trip }: TripHistorySheetProps) {
  if (!trip) return null;
  
  const duration = trip.start_at && trip.end_at 
    ? differenceInMinutes(new Date(trip.end_at), new Date(trip.start_at))
    : null;
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="pb-4">
          <SheetTitle>Trip Details</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-120px)] pr-4">
          {/* Status banner */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="font-medium text-green-700 dark:text-green-400">Completed</span>
            {trip.end_at && (
              <span className="text-sm text-muted-foreground ml-auto">
                {format(new Date(trip.end_at), 'MMM d, h:mm a')}
              </span>
            )}
          </div>
          
          {/* Driver & Buggy */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Driver</p>
              </div>
              <p className="font-medium">{trip.driver_name || 'Unknown'}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2 mb-1">
                <Car className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Buggy</p>
              </div>
              <p className="font-medium">{trip.buggy_name || 'Unknown'}</p>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{trip.request_count}</p>
              <p className="text-xs text-muted-foreground">Requests</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{trip.stop_count}</p>
              <p className="text-xs text-muted-foreground">Stops</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{trip.capacity_total || 0}</p>
              <p className="text-xs text-muted-foreground">Passengers</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted">
              <p className="text-2xl font-bold">{duration || '—'}</p>
              <p className="text-xs text-muted-foreground">Minutes</p>
            </div>
          </div>
          
          {/* Timing */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Started</p>
              <p className="text-sm font-medium">
                {trip.start_at ? format(new Date(trip.start_at), 'h:mm a') : 'N/A'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground mb-1">Ended</p>
              <p className="text-sm font-medium">
                {trip.end_at ? format(new Date(trip.end_at), 'h:mm a') : 'N/A'}
              </p>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          {/* Stops summary */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Stops Summary
            </h4>
            <TripStopsSummary tripId={trip.id} />
          </div>
          
          <Separator className="my-6" />
          
          {/* Event timeline */}
          <div>
            <h4 className="text-sm font-medium text-muted-foreground mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Event Timeline
            </h4>
            <TripEventTimeline tripId={trip.id} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
