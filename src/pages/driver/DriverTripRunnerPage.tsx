import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { useResort } from '@/contexts/ResortContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTripStops, useTripRequests } from '@/hooks/transport/useTripDetails';
import {
  useDriverTrips,
  useUpdateStopStatusMutation,
} from '@/hooks/transport/useDriverSession';
import {
  useDriverLifecycleActions,
  getNextState,
  NEXT_ACTION_LABELS,
  LIFECYCLE_STATE_LABELS,
  type TripLifecycleState,
} from '@/hooks/transport/useDriverLifecycleActions';
import { useDriverRealtimeSync } from '@/hooks/sync/useDriverRealtimeSync';
import { useDriverETAAndDistance } from '@/hooks/driver/useDriverETAAndDistance';
import { getNextStop } from '@/lib/driverTrip';
import type { DriverOutletContext } from '@/components/driver/DriverLayout';
import { StopNavigationLink } from '@/components/driver/StopNavigationLink';
import { DriverInstructionsPanel } from '@/components/driver/DriverInstructionsPanel';
import { PassengerNotesIndicator } from '@/components/driver/PassengerNotesIndicator';
import { DriverMobileActionBar, DriverMobileActionBarSpacer } from '@/components/driver/DriverMobileActionBar';
import { DriverStatusBanner } from '@/components/driver/DriverStatusBanner';
import { TripStateMicrocopy } from '@/components/driver/TripStateMicrocopy';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  MapPin,
  MapPinOff,
  Users,
  CheckCircle2,
  XCircle,
  Play,
  Flag,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Star,
  Home,
  Navigation,
  Route,
  Clock,
  ChevronsUpDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type StopStatus = 'pending' | 'arrived' | 'completed' | 'skipped';
type StopKind = 'pickup' | 'dropoff' | 'waypoint';

interface TripStop {
  id: string;
  sequence: number;
  stop_kind: StopKind;
  status: StopStatus;
  title: string | null;
  stop_name: string | null;
  guest_name: string | null;
  room_number: string | null;
}

export default function DriverTripRunnerPage() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  const { currentResort } = useResort();
  const { user } = useAuth();
  const resortId = currentResort?.id;
  
  const { driverSession, isOnline, driverLocation } = useOutletContext<DriverOutletContext>();

  // Realtime sync for faster updates
  useDriverRealtimeSync({
    driverId: user?.id,
    resortId,
    tripId,
    enabled: !!tripId,
  });

  // Data
  const { data: trips = [] } = useDriverTrips(resortId);
  const trip = trips.find((t: any) => t.id === tripId);
  const { data: stops = [], isLoading: stopsLoading } = useTripStops(tripId);
  const { data: requests = [] } = useTripRequests(tripId);

  // Mutations - use new lifecycle actions
  const lifecycleActions = useDriverLifecycleActions(resortId);
  const updateStop = useUpdateStopStatusMutation(resortId, tripId);
  
  // Get current lifecycle state from trip
  const currentLifecycleState = (trip?.lifecycle_state || trip?.status || 'assigned') as TripLifecycleState;
  const nextState = getNextState(currentLifecycleState);
  const nextActionLabel = NEXT_ACTION_LABELS[currentLifecycleState];

  // State
  const [skipConfirmId, setSkipConfirmId] = useState<string | null>(null);
  const [expandedStopId, setExpandedStopId] = useState<string | null>(null);
  const [allStopsExpanded, setAllStopsExpanded] = useState(false);

  // Find current stop (first pending)
  const currentStop = useMemo(() => {
    return stops.find(s => s.status === 'pending') || null;
  }, [stops]);

  // Get next stop for ETA calculation (using helper)
  const nextStopForETA = useMemo(() => getNextStop(stops), [stops]);
  const nextStopLocation = nextStopForETA?.stopLatLng ?? null;

  // Calculate ETA and distance
  const { distanceLabel, etaLabel } = useDriverETAAndDistance({
    tripId,
    driverLocation,
    nextStopLocation,
  });

  // Calculate progress
  const progress = useMemo(() => {
    if (!stops.length) return 0;
    const completed = stops.filter(s => s.status === 'completed' || s.status === 'skipped').length;
    return Math.round((completed / stops.length) * 100);
  }, [stops]);

  // All stops done?
  const allStopsDone = useMemo(() => {
    return stops.length > 0 && stops.every(s => s.status === 'completed' || s.status === 'skipped');
  }, [stops]);

  // Handler to advance trip state
  const handleAdvanceState = useCallback(() => {
    if (tripId && nextState) {
      lifecycleActions.updateTripState.mutate({ tripId, nextState });
    }
  }, [tripId, nextState, lifecycleActions]);

  const handleArrived = useCallback((stopId: string) => {
    updateStop.mutate({ stopId, newStatus: 'arrived' });
  }, [updateStop]);

  const handleCompleteStop = useCallback((stopId: string) => {
    updateStop.mutate({ stopId, newStatus: 'completed' });
  }, [updateStop]);

  const handleSkipStop = useCallback((stopId: string) => {
    updateStop.mutate({ stopId, newStatus: 'skipped' });
    setSkipConfirmId(null);
  }, [updateStop]);

  // Get stop icon
  const getStopIcon = (kind: StopKind, status: StopStatus) => {
    if (status === 'completed') return CheckCircle2;
    if (status === 'skipped') return XCircle;
    if (kind === 'pickup') return MapPin;
    if (kind === 'dropoff') return MapPinOff;
    return Navigation;
  };

  // Not found
  if (!trip && !stopsLoading) {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Trip Not Found</h2>
        <p className="text-muted-foreground text-sm mt-1 mb-4">
          This trip may have been completed or cancelled.
        </p>
        <Button variant="outline" onClick={() => navigate('/driver')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  // Loading
  if (stopsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isPending = lifecycleActions.isUpdating || updateStop.isPending;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="sticky top-8 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/driver')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">Trip Runner</h1>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{stops.length} stops</span>
              <span>•</span>
              <span>{requests.reduce((sum, r) => sum + r.party_size, 0)} passengers</span>
            </div>
          </div>
          <Badge variant={trip?.status === 'assigned' ? 'outline' : 'default'}>
            {trip?.status}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-4 space-y-4">
        {/* Status Banners (Offline/GPS) */}
        <DriverStatusBanner isOnline={isOnline} hasGPS={!!driverLocation} />
        
        {/* Primary Action CTA - shows next lifecycle action */}
        {currentLifecycleState === 'assigned' && (
          <Card className="border-primary shadow-lg">
            <CardContent className="py-6">
              <Button
                size="lg"
                className="w-full h-16 text-lg gap-3"
                onClick={handleAdvanceState}
                disabled={isPending}
              >
                {lifecycleActions.isUpdating ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
                {nextActionLabel || 'Start Trip'}
              </Button>
              <TripStateMicrocopy state={currentLifecycleState} />
            </CardContent>
          </Card>
        )}
        
        {/* Lifecycle State Actions - for intermediate states */}
        {currentLifecycleState !== 'assigned' && currentLifecycleState !== 'completed' && nextActionLabel && (
          <Card className="border-primary/50 shadow-md">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-muted-foreground">Current Status</p>
                  <p className="font-medium">{LIFECYCLE_STATE_LABELS[currentLifecycleState]}</p>
                </div>
                <Badge variant="outline">{currentLifecycleState.replace(/_/g, ' ')}</Badge>
              </div>
              <Button
                size="lg"
                className="w-full h-14 text-base"
                onClick={handleAdvanceState}
                disabled={isPending}
              >
                {lifecycleActions.isUpdating ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                )}
                {nextActionLabel}
              </Button>
              <TripStateMicrocopy state={currentLifecycleState} stopKind={currentStop?.stop_kind as any} />
            </CardContent>
          </Card>
        )}

        {/* Special Instructions Panel - NEW */}
        <DriverInstructionsPanel tripRequests={requests} />

        {/* Current Stop (prominent) */}
        {currentStop && currentLifecycleState !== 'assigned' && (
          <Card className="border-primary/50 shadow-lg bg-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1">
                  <Navigation className="h-3 w-3" />
                  Current Stop
                </Badge>
                <Badge variant="outline" className="ml-auto">
                  #{currentStop.sequence}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stop details */}
              <div>
                <h2 className="text-xl font-semibold">
                  {currentStop.stop_name || currentStop.title || 'Unknown Stop'}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={currentStop.stop_kind === 'pickup' ? 'default' : 'secondary'}>
                    {currentStop.stop_kind === 'pickup' ? 'Pickup' : 'Dropoff'}
                  </Badge>
                  {currentStop.status === 'arrived' && (
                    <Badge variant="outline" className="text-emerald-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Arrived
                    </Badge>
                  )}
                </div>
                
                {/* ETA + Distance Row - NEW */}
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Route className="h-4 w-4" />
                    <span>{distanceLabel}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{etaLabel}</span>
                  </div>
                </div>

                {/* Navigation link */}
                <div className="mt-3">
                  <StopNavigationLink
                    stopName={currentStop.stop_name || currentStop.title || 'Stop'}
                    zone={(currentStop as any).zone}
                    location={(currentStop as any).location}
                    variant="button"
                  />
                </div>
              </div>

              {/* Guest info */}
              {(currentStop.guest_name || currentStop.room_number) && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-card border">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{currentStop.guest_name || 'Guest'}</p>
                    {currentStop.room_number && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Home className="h-3 w-3" />
                        Room {currentStop.room_number}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="grid grid-cols-2 gap-3">
                {currentStop.status === 'pending' ? (
                  <>
                    <Button
                      size="lg"
                      className="h-14 text-base"
                      onClick={() => handleArrived(currentStop.id)}
                      disabled={isPending}
                    >
                      {updateStop.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <MapPin className="h-5 w-5 mr-2" />
                          Arrived
                        </>
                      )}
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 text-base"
                      onClick={() => setSkipConfirmId(currentStop.id)}
                      disabled={isPending}
                    >
                      <XCircle className="h-5 w-5 mr-2" />
                      Skip
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="lg"
                      className="h-14 text-base col-span-2"
                      onClick={() => handleCompleteStop(currentStop.id)}
                      disabled={isPending}
                    >
                      {updateStop.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          Complete Stop
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Complete Trip CTA */}
        {allStopsDone && currentLifecycleState !== 'completed' && (
          <Card className="border-emerald-500/50 shadow-lg bg-emerald-500/5">
            <CardContent className="py-6">
              <Button
                size="lg"
                className="w-full h-16 text-lg gap-3 bg-emerald-600 hover:bg-emerald-700"
                onClick={handleAdvanceState}
                disabled={isPending}
              >
                {lifecycleActions.isUpdating ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <Flag className="h-6 w-6" />
                )}
                Complete Trip
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-3">
                All stops done! Tap to finish trip.
              </p>
            </CardContent>
          </Card>
        )}

        {/* All Stops List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">All Stops</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => {
                  setAllStopsExpanded(!allStopsExpanded);
                  setExpandedStopId(allStopsExpanded ? null : stops[0]?.id || null);
                }}
              >
                <ChevronsUpDown className="h-3.5 w-3.5" />
                {allStopsExpanded ? 'Collapse All' : 'Expand All'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {stops.map((stop, index) => {
              const Icon = getStopIcon(stop.stop_kind as StopKind, stop.status as StopStatus);
              const isExpanded = allStopsExpanded || expandedStopId === stop.id;
              const isCurrent = currentStop?.id === stop.id;
              
              return (
                <button
                  key={stop.id}
                  onClick={() => setExpandedStopId(isExpanded ? null : stop.id)}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition-all",
                    isCurrent && "border-primary bg-primary/5",
                    stop.status === 'completed' && "opacity-60",
                    stop.status === 'skipped' && "opacity-40"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      stop.status === 'completed' && "bg-emerald-500/20 text-emerald-600",
                      stop.status === 'skipped' && "bg-muted text-muted-foreground",
                      stop.status === 'pending' && "bg-muted",
                      stop.status === 'arrived' && "bg-blue-500/20 text-blue-600"
                    )}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {stop.stop_name || stop.title || `Stop ${stop.sequence}`}
                        </span>
                        {isCurrent && (
                          <Badge variant="default" className="text-[10px] px-1.5 py-0">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="capitalize">{stop.stop_kind}</span>
                        {stop.guest_name && (
                          <>
                            <span>•</span>
                            <span>{stop.guest_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-2 text-sm">
                      {stop.room_number && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Home className="h-4 w-4" />
                          <span>Room {stop.room_number}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">
                          {stop.status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Passengers List */}
        {requests.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Passengers ({requests.reduce((sum, r) => sum + r.party_size, 0)})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border",
                    req.state === 'picked_up' && "bg-emerald-500/5 border-emerald-500/30",
                    req.state === 'completed' && "opacity-60"
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    {req.priority === 'urgent' && (
                      <Star className="h-5 w-5 text-amber-500" />
                    )}
                    {req.priority !== 'urgent' && (
                      <Users className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {req.guest_name || 'Guest'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{req.party_size} guest{req.party_size > 1 ? 's' : ''}</span>
                      {req.room_number && (
                        <>
                          <span>•</span>
                          <span>Room {req.room_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Notes indicator - NEW */}
                  <PassengerNotesIndicator request={req} />
                  <Badge variant={req.state === 'picked_up' ? 'default' : 'outline'} className="shrink-0">
                    {req.state}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
        
        {/* Spacer for mobile action bar */}
        <DriverMobileActionBarSpacer />
      </div>

      {/* Mobile Sticky Action Bar */}
      {currentStop && currentLifecycleState !== 'assigned' && currentLifecycleState !== 'completed' && (
        <DriverMobileActionBar className="md:hidden">
          {currentStop.status === 'pending' ? (
            <>
              <Button
                size="lg"
                className="flex-1 h-12"
                onClick={() => handleArrived(currentStop.id)}
                disabled={isPending}
              >
                {updateStop.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <MapPin className="h-5 w-5 mr-2" />}
                Arrived
              </Button>
              <StopNavigationLink
                stopName={currentStop.stop_name || currentStop.title || 'Stop'}
                zone={(currentStop as any).zone}
                location={(currentStop as any).location}
                variant="button"
                className="shrink-0"
              />
            </>
          ) : (
            <Button
              size="lg"
              className="flex-1 h-12"
              onClick={() => handleCompleteStop(currentStop.id)}
              disabled={isPending}
            >
              {updateStop.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
              Complete Stop
            </Button>
          )}
        </DriverMobileActionBar>
      )}

      {/* Skip confirmation dialog */}
      <AlertDialog open={!!skipConfirmId} onOpenChange={(open) => !open && setSkipConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip this stop?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the stop as skipped. The guest will be notified.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => skipConfirmId && handleSkipStop(skipConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Skip Stop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
