import { useOutletContext, useNavigate } from 'react-router-dom';
import { useResort } from '@/contexts/ResortContext';
import { 
  useDriverSession, 
  useDriverStatusMutation,
  useDriverTrips,
  DriverStatus,
} from '@/hooks/transport/useDriverSession';
import type { DriverOutletContext } from '@/components/driver/DriverLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Car, 
  Coffee, 
  Power, 
  PowerOff, 
  MapPin, 
  Users, 
  ChevronRight,
  Loader2,
  AlertCircle,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<DriverStatus, { label: string; icon: React.ElementType; color: string }> = {
  online: { label: 'Online', icon: Power, color: 'bg-emerald-500' },
  offline: { label: 'Offline', icon: PowerOff, color: 'bg-slate-400' },
  on_trip: { label: 'On Trip', icon: Car, color: 'bg-blue-500' },
  break: { label: 'On Break', icon: Coffee, color: 'bg-amber-500' },
};

export default function DriverHomePage() {
  const navigate = useNavigate();
  const { currentResort } = useResort();
  const resortId = currentResort?.id;
  
  const { driverSession, settings, isOnline } = useOutletContext<DriverOutletContext>();
  const statusMutation = useDriverStatusMutation(resortId);
  const { data: trips = [], isLoading: tripsLoading } = useDriverTrips(resortId);

  const currentStatus = driverSession?.status || 'offline';
  const assignedBuggy = driverSession?.assigned_buggy;
  
  // Current/active trip (first one)
  const currentTrip = trips[0];

  const handleStatusChange = (newStatus: DriverStatus) => {
    if (newStatus === currentStatus || statusMutation.isPending) return;
    statusMutation.mutate(newStatus);
  };

  const StatusButton = ({ 
    status, 
    disabled 
  }: { 
    status: DriverStatus; 
    disabled?: boolean;
  }) => {
    const config = statusConfig[status];
    const isActive = currentStatus === status;
    const Icon = config.icon;

    return (
      <button
        onClick={() => handleStatusChange(status)}
        disabled={disabled || statusMutation.isPending}
        className={cn(
          "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all min-h-[100px]",
          "active:scale-95 touch-manipulation",
          isActive 
            ? "border-primary bg-primary/10 shadow-lg" 
            : "border-border bg-card hover:border-primary/50",
          (disabled || statusMutation.isPending) && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className={cn(
          "h-12 w-12 rounded-full flex items-center justify-center",
          isActive ? config.color : "bg-muted"
        )}>
          {statusMutation.isPending && statusMutation.variables === status ? (
            <Loader2 className="h-6 w-6 text-white animate-spin" />
          ) : (
            <Icon className={cn("h-6 w-6", isActive ? "text-white" : "text-muted-foreground")} />
          )}
        </div>
        <span className={cn(
          "text-sm font-medium",
          isActive ? "text-primary" : "text-muted-foreground"
        )}>
          {config.label}
        </span>
      </button>
    );
  };

  return (
    <div className="p-4 pb-8 space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold">Driver Portal</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {currentResort?.name || 'Resort'}
        </p>
      </div>

      {/* Status Toggle */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Your Status</CardTitle>
          <CardDescription>
            Set your availability for ride assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <StatusButton status="online" />
            <StatusButton status="offline" />
            <StatusButton status="break" />
            <StatusButton status="on_trip" disabled />
          </div>
        </CardContent>
      </Card>

      {/* Assigned Buggy */}
      {assignedBuggy ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Car className="h-5 w-5" />
              Your Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">{assignedBuggy.name}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {assignedBuggy.capacity} seats
                  </span>
                  <Badge variant={assignedBuggy.status === 'available' ? 'default' : 'secondary'}>
                    {assignedBuggy.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Car className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">
              No vehicle assigned. Contact dispatch.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Trip */}
      {tripsLoading ? (
        <Card>
          <CardContent className="py-8 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : currentTrip ? (
        <Card className="border-primary/50 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Current Trip</CardTitle>
              <Badge variant={currentTrip.status === 'assigned' ? 'outline' : 'default'}>
                {currentTrip.status === 'assigned' ? 'Ready to Start' : currentTrip.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Trip summary */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>{currentTrip.trip_stops?.length || 0} stops</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>
                  {currentTrip.trip_requests?.reduce((sum: number, tr: any) => sum + tr.party_size, 0) || 0} passengers
                </span>
              </div>
            </div>

            {/* Action button */}
            <Button
              size="lg"
              className="w-full h-14 text-lg gap-2"
              onClick={() => navigate(`/driver/trip/${currentTrip.id}`)}
            >
              {currentTrip.status === 'assigned' ? (
                <>
                  <Play className="h-5 w-5" />
                  Start Trip
                </>
              ) : (
                <>
                  Continue Trip
                  <ChevronRight className="h-5 w-5" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="font-medium">No Active Trips</p>
            <p className="text-muted-foreground text-sm mt-1">
              {currentStatus === 'online' 
                ? 'Waiting for trip assignment...'
                : 'Go online to receive trips'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Additional trips if any */}
      {trips.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Queued Trips</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trips.slice(1).map((trip: any) => (
              <button
                key={trip.id}
                onClick={() => navigate(`/driver/trip/${trip.id}`)}
                className="w-full flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-sm">{trip.trip_stops?.length || 0} stops</p>
                    <p className="text-xs text-muted-foreground">{trip.status}</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Offline warning */}
      {!isOnline && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              You're offline. Actions will sync when reconnected.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
