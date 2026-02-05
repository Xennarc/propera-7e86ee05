import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, Navigation, Users, Clock, Route, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDriverETAAndDistance, type DriverLocation } from '@/hooks/driver/useDriverETAAndDistance';
import { getNextStop, countRemainingStops, deriveTripInfoFromRequests } from '@/lib/driverTrip';
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
 * 
 * Now includes fallback logic to derive info from tripRequests when stops are missing.
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

  // Fallback: derive trip info from requests when stops are missing
  const derivedInfo = useMemo(() => {
    if (tripStops && tripStops.length > 0) return null;
    return deriveTripInfoFromRequests(tripRequests);
  }, [tripStops, tripRequests]);

  // Calculate passenger count - prefer stops data, fallback to derived
  const passengerCount = useMemo(() => {
    if (tripRequests && tripRequests.length > 0) {
      return tripRequests.reduce((sum, req) => sum + (req.party_size || 0), 0);
    }
    if (derivedInfo) {
      return derivedInfo.totalPassengers;
    }
    return 0;
  }, [tripRequests, derivedInfo]);

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

  // Check if we have stops or need fallback
  const hasStops = tripStops && tripStops.length > 0;
  const hasDerivedInfo = derivedInfo && (derivedInfo.pickupNames.length > 0 || derivedInfo.dropoffNames.length > 0);

  return (
    <Card className={cn("border-border/50 bg-card/80", className)}>
      <CardContent className={cn("space-y-3", compact ? "py-3 px-4" : "py-4")}>
        {/* Stops-based display (when stops are available) */}
        {hasStops ? (
          <>
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
          </>
        ) : hasDerivedInfo ? (
          /* Fallback: Request-derived display */
          <>
            {/* Pickup Location */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Navigation className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Pickup</p>
                <p className="font-medium truncate">
                  {derivedInfo.pickupNames.join(', ') || '—'}
                </p>
              </div>
            </div>

            {/* Dropoff Location */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Dropoff</p>
                <p className="font-medium truncate text-muted-foreground">
                  {derivedInfo.dropoffNames.join(', ') || '—'}
                </p>
              </div>
            </div>

            {/* Guest Info */}
            {derivedInfo.firstGuest && derivedInfo.firstGuest.name && (
              <div className="flex items-start gap-3">
                <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Guest</p>
                  <p className="font-medium truncate">
                    {derivedInfo.firstGuest.name}
                    {derivedInfo.firstGuest.room && (
                      <span className="text-muted-foreground"> • Room {derivedInfo.firstGuest.room}</span>
                    )}
                  </p>
                </div>
              </div>
            )}
          </>
        ) : (
          /* No data available */
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Navigation className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Trip Info</p>
              <p className="font-medium text-muted-foreground">Loading trip details...</p>
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
