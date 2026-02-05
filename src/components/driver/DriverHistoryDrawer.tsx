import { format, differenceInMinutes } from 'date-fns';
import { useTripStops, useTripRequests } from '@/hooks/transport/useTripDetails';
import type { DriverTripHistoryRow } from '@/hooks/driver/useDriverTripHistory';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  MapPin,
  Users,
  Clock,
  Car,
  CheckCircle2,
  XCircle,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DriverHistoryDrawerProps {
  trip: DriverTripHistoryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DriverHistoryDrawer({ trip, open, onOpenChange }: DriverHistoryDrawerProps) {
  const { data: stops = [], isLoading: stopsLoading } = useTripStops(trip?.id);
  const { data: requests = [], isLoading: requestsLoading } = useTripRequests(trip?.id);

  if (!trip) return null;

  const isCompleted = trip.status === 'completed';
  const duration = trip.start_at && trip.end_at
    ? differenceInMinutes(new Date(trip.end_at), new Date(trip.start_at))
    : null;

  const finishedAt = trip.completed_at || trip.cancelled_at || trip.end_at;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[90vh]">
        <DrawerHeader className="text-left border-b pb-4">
          <div className="flex items-center gap-2 mb-2">
            {isCompleted ? (
              <Badge variant="outline" className="gap-1 border-emerald-500/50 text-emerald-700 dark:text-emerald-400 bg-emerald-500/5">
                <CheckCircle2 className="h-3 w-3" />
                Completed
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Cancelled
              </Badge>
            )}
            {trip.buggy_name && (
              <Badge variant="secondary" className="gap-1">
                <Car className="h-3 w-3" />
                {trip.buggy_name}
              </Badge>
            )}
          </div>
          <DrawerTitle className="text-lg">
            {trip.first_stop_name && trip.last_stop_name ? (
              <span className="flex items-center gap-2 flex-wrap">
                {trip.first_stop_name}
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                {trip.last_stop_name}
              </span>
            ) : (
              'Trip Details'
            )}
          </DrawerTitle>
          <DrawerDescription>
            {finishedAt && format(new Date(finishedAt), 'EEEE, MMM d · h:mm a')}
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 max-h-[calc(90vh-160px)]">
          <div className="px-5 py-4 space-y-6">
            {/* Summary Stats - Section 1 */}
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
                Summary
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                  <MapPin className="h-4 w-4 text-muted-foreground mb-1" />
                  <span className="text-lg font-semibold">{trip.stop_count}</span>
                  <span className="text-xs text-muted-foreground">Stops</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                  <Users className="h-4 w-4 text-muted-foreground mb-1" />
                  <span className="text-lg font-semibold">{trip.capacity_total ?? trip.request_count}</span>
                  <span className="text-xs text-muted-foreground">Passengers</span>
                </div>
                <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50">
                  <Clock className="h-4 w-4 text-muted-foreground mb-1" />
                  <span className="text-lg font-semibold">{duration ?? '—'}</span>
                  <span className="text-xs text-muted-foreground">Minutes</span>
                </div>
              </div>
            </div>

          {/* Stops List */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Stops
            </h3>
            {stopsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : stops.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stops recorded</p>
            ) : (
              <div className="space-y-2">
                {stops.map((stop, index) => (
                  <div
                    key={stop.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border bg-card',
                      stop.status === 'completed' && 'border-emerald-500/30 dark:border-emerald-400/30 bg-emerald-500/5'
                    )}
                  >
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {stop.stop_name || stop.title || 'Unknown stop'}
                      </p>
                      {stop.stop_zone && (
                        <p className="text-xs text-muted-foreground">{stop.stop_zone}</p>
                      )}
                    </div>
                    {stop.status === 'completed' && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator className="my-4" />

          {/* Passengers List */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Passengers
            </h3>
            {requestsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <p className="text-sm text-muted-foreground">No passengers recorded</p>
            ) : (
              <div className="space-y-2">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">
                          {req.guest_name || 'Guest'}
                          {req.room_number && (
                            <span className="text-muted-foreground ml-1">
                              · Room {req.room_number}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {req.pickup_name} → {req.dropoff_name}
                        </p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">
                        {req.party_size} pax
                      </Badge>
                    </div>
                    {req.notes && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                        <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{req.notes}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
