import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Navigation, Users, Clock, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDriverETAAndDistance, type DriverLocation } from '@/hooks/driver/useDriverETAAndDistance';
import { getNextStop, countRemainingStops } from '@/lib/driverTrip';
import type { TripStopWithDetails, TripRequestWithDetails } from '@/hooks/transport/useTripDetails';

export interface TripPreviewCardProps {
  trip: {
    id: string;
    status: string;
    lifecycle_state?: string | null;
  };
  tripStops?: TripStopWithDetails[] | null;
  tripRequests?: TripRequestWithDetails[] | null;
  driverLocation?: DriverLocation | null;
  isLoading?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * Displays a preview of trip details including next stop, final stop,
 * passenger count, and ETA/distance to next stop.
 * Used exclusively in the Driver Portal.
 */
export function TripPreviewCard({
  trip,
  tripStops,
  tripRequests,
  driverLocation,
  isLoading = false,
  compact = false,
  className,
}: TripPreviewCardProps) {
  // Derive next and final stops
  const nextStop = useMemo(() => getNextStop(tripStops), [tripStops]);
  const finalStop = useMemo(() => {
    if (!tripStops || tripStops.length === 0) return null;
    return tripStops[tripStops.length - 1];
  }, [tripStops]);

  // Calculate passenger count
  const passengerCount = useMemo(() => {
    if (!tripRequests || tripRequests.length === 0) return 0;
    return tripRequests.reduce((sum, req) => sum + (req.party_size || 0), 0);
  }, [tripRequests]);

  // Count remaining stops
  const remainingStops = useMemo(() => countRemainingStops(tripStops), [tripStops]);

  // Get next stop location for ETA calculation
  const nextStopLocation = nextStop?.stopLatLng ?? null;

  // Calculate ETA and distance
  const { distanceLabel, etaLabel } = useDriverETAAndDistance({
    tripId: trip.id,
    driverLocation: driverLocation ?? null,
    nextStopLocation,
  });

  if (isLoading) {
    return (
      <Card className={cn("border-border/50", className)}>
        <CardContent className={cn("space-y-3", compact ? "py-3 px-4" : "py-4")}>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-border/50 bg-card/80", className)}>
      <CardContent className={cn("space-y-3", compact ? "py-3 px-4" : "py-4")}>
        {/* Next Stop */}
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Navigation className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Next Stop</p>
            <p className="font-medium truncate">
              {nextStop?.stop_name || nextStop?.title || '—'}
            </p>
            {nextStop?.stop_zone && (
              <p className="text-xs text-muted-foreground">{nextStop.stop_zone}</p>
            )}
          </div>
        </div>

        {/* Final Stop (if different from next) */}
        {finalStop && finalStop.id !== nextStop?.id && (
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Final Stop</p>
              <p className="font-medium truncate text-muted-foreground">
                {finalStop.stop_name || finalStop.title || '—'}
              </p>
            </div>
          </div>
        )}

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {/* Passengers */}
          <div className="flex flex-col items-center justify-center rounded-lg bg-muted/50 py-2 px-1">
            <Users className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="font-semibold text-sm">{passengerCount}</span>
            <span className="text-[10px] text-muted-foreground uppercase">Pax</span>
          </div>

          {/* Distance */}
          <div className="flex flex-col items-center justify-center rounded-lg bg-muted/50 py-2 px-1">
            <Route className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="font-semibold text-sm">{distanceLabel}</span>
            <span className="text-[10px] text-muted-foreground uppercase">Dist</span>
          </div>

          {/* ETA */}
          <div className="flex flex-col items-center justify-center rounded-lg bg-muted/50 py-2 px-1">
            <Clock className="h-4 w-4 text-muted-foreground mb-1" />
            <span className="font-semibold text-sm">{etaLabel}</span>
            <span className="text-[10px] text-muted-foreground uppercase">ETA</span>
          </div>
        </div>

        {/* Remaining stops indicator */}
        {remainingStops > 1 && (
          <p className="text-xs text-center text-muted-foreground">
            {remainingStops} stops remaining
          </p>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Skeleton placeholder for TripPreviewCard loading states.
 */
export function TripPreviewCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="border-border/50">
      <CardContent className={cn("space-y-3", compact ? "py-3 px-4" : "py-4")}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
          <Skeleton className="h-12 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}
