import { useState, useMemo } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowUp, 
  ArrowDown, 
  MapPin,
  Users,
  Clock,
  CheckCircle2,
  Circle,
  Car,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { TransportTrip } from '@/hooks/transport/useTransportTrips';
import type { TripStopWithDetails } from '@/hooks/transport/useTripDetails';

interface TripDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: TransportTrip | null;
  stops: TripStopWithDetails[];
  onReorderStops: (orderedIds: string[]) => void;
  isReordering: boolean;
}

const stopKindConfig = {
  pickup: { label: 'Pickup', color: 'text-green-500', bgColor: 'bg-green-500' },
  dropoff: { label: 'Drop-off', color: 'text-red-500', bgColor: 'bg-red-500' },
  waypoint: { label: 'Waypoint', color: 'text-blue-500', bgColor: 'bg-blue-500' },
};

const stopStatusConfig = {
  pending: { icon: Circle, className: 'text-muted-foreground' },
  arrived: { icon: Clock, className: 'text-amber-500' },
  completed: { icon: CheckCircle2, className: 'text-green-500' },
  skipped: { icon: Circle, className: 'text-muted-foreground line-through' },
};

export function TripDetailSheet({
  open,
  onOpenChange,
  trip,
  stops,
  onReorderStops,
  isReordering,
}: TripDetailSheetProps) {
  const [localStops, setLocalStops] = useState<TripStopWithDetails[]>([]);
  
  // Sync local stops when sheet opens or stops change
  useMemo(() => {
    if (open && stops.length > 0) {
      setLocalStops([...stops]);
    }
  }, [open, stops]);
  
  const moveStop = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localStops.length) return;
    
    const newStops = [...localStops];
    [newStops[index], newStops[newIndex]] = [newStops[newIndex], newStops[index]];
    setLocalStops(newStops);
  };
  
  const hasChanges = useMemo(() => {
    if (localStops.length !== stops.length) return false;
    return localStops.some((s, i) => s.id !== stops[i]?.id);
  }, [localStops, stops]);
  
  const handleSaveOrder = () => {
    if (hasChanges) {
      onReorderStops(localStops.map(s => s.id));
    }
  };
  
  if (!trip) return null;
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0">
        <SheetHeader className="p-6 pb-0">
          <SheetTitle>Trip Details</SheetTitle>
          <SheetDescription>
            Manage stop order and view trip information
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1 px-6">
          {/* Trip info */}
          <div className="py-4 space-y-3">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1.5">
                <Car className="h-4 w-4 text-muted-foreground" />
                <span>{trip.buggy_name || 'No buggy'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{trip.driver_name || 'No driver'}</span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Badge variant="secondary">
                {trip.request_count} requests
              </Badge>
              <Badge variant="secondary">
                <Users className="h-3 w-3 mr-1" />
                {trip.total_party_size} passengers
              </Badge>
            </div>
          </div>
          
          <Separator />
          
          {/* Stops list */}
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">Stop Order</h3>
              {hasChanges && (
                <Button size="sm" onClick={handleSaveOrder} disabled={isReordering}>
                  {isReordering ? 'Saving...' : 'Save Order'}
                </Button>
              )}
            </div>
            
            <div className="space-y-1">
              {localStops.map((stop, index) => {
                const kind = stopKindConfig[stop.stop_kind as keyof typeof stopKindConfig] || stopKindConfig.waypoint;
                const status = stopStatusConfig[stop.status as keyof typeof stopStatusConfig] || stopStatusConfig.pending;
                const StatusIcon = status.icon;
                const canMoveUp = index > 0 && stop.status === 'pending';
                const canMoveDown = index < localStops.length - 1 && stop.status === 'pending';
                
                return (
                  <div
                    key={stop.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                  >
                    {/* Timeline indicator */}
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn('h-3 w-3 rounded-full', kind.bgColor)} />
                      {index < localStops.length - 1 && (
                        <div className="w-0.5 h-4 bg-border" />
                      )}
                    </div>
                    
                    {/* Stop info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium truncate">
                          {stop.stop_name || 'Unknown location'}
                        </span>
                        <Badge variant="outline" className={cn('text-2xs', kind.color)}>
                          {kind.label}
                        </Badge>
                      </div>
                      {stop.guest_name && (
                        <div className="text-xs text-muted-foreground">
                          {stop.guest_name} • Room {stop.room_number || '—'}
                        </div>
                      )}
                    </div>
                    
                    {/* Status */}
                    <StatusIcon className={cn('h-4 w-4 shrink-0', status.className)} />
                    
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-0.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        disabled={!canMoveUp || isReordering}
                        onClick={() => moveStop(index, 'up')}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        disabled={!canMoveDown || isReordering}
                        onClick={() => moveStop(index, 'down')}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              
              {localStops.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No stops in this trip
                </p>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
