import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Inbox, RefreshCw } from 'lucide-react';
import { TripCard } from './TripCard';
import type { TransportTrip } from '@/hooks/transport/useTransportTrips';

interface TripsPanelProps {
  trips: TransportTrip[];
  isLoading: boolean;
  onAssignTrip: (tripId: string) => void;
  onAddRequestToTrip: (tripId: string) => void;
  onRemoveRequest: (tripId: string, requestId: string) => void;
  onViewTripDetails: (tripId: string) => void;
  onCancelTrip?: (tripId: string) => void;
  isCancellingTrip?: boolean;
  onRefresh: () => void;
}

type TripTab = 'planning' | 'active';

export function TripsPanel({
  trips,
  isLoading,
  onAssignTrip,
  onAddRequestToTrip,
  onRemoveRequest,
  onViewTripDetails,
  onCancelTrip,
  isCancellingTrip,
  onRefresh,
}: TripsPanelProps) {
  const [activeTab, setActiveTab] = useState<TripTab>('planning');
  
  // Split trips by status
  const planningTrips = trips.filter(t => t.status === 'planning');
  const activeTrips = trips.filter(t => 
    t.status === 'assigned' || t.status === 'en_route' || t.status === 'active'
  );
  
  const displayTrips = activeTab === 'planning' ? planningTrips : activeTrips;
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Trips</h2>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="tabular-nums">
              {trips.length}
            </Badge>
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TripTab)}>
          <TabsList className="w-full">
            <TabsTrigger value="planning" className="flex-1">
              Planning
              {planningTrips.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {planningTrips.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1">
              Active
              {activeTrips.length > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 px-1.5">
                  {activeTrips.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Trip list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {isLoading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))
          ) : displayTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Inbox className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">No trips</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === 'planning'
                  ? 'Select requests to create a new trip'
                  : 'No trips currently in progress'}
              </p>
            </div>
          ) : (
            displayTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onAssign={() => onAssignTrip(trip.id)}
                onAddRequest={() => onAddRequestToTrip(trip.id)}
                onRemoveRequest={(reqId) => onRemoveRequest(trip.id, reqId)}
                onViewDetails={() => onViewTripDetails(trip.id)}
                onCancelTrip={onCancelTrip ? () => onCancelTrip(trip.id) : undefined}
                isCancellingTrip={isCancellingTrip}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
