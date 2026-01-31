import { useState, useCallback } from 'react';
import { useResort } from '@/contexts/ResortContext';
import { useResortSettings } from '@/hooks/useResortSettings';
import { usePermissions } from '@/hooks/usePermissions';
import { 
  useTransportQueue,
  useTransportTrips,
  useTripStops,
  useBuggies,
  useBuggyDrivers,
  useTransportMutations,
} from '@/hooks/transport';
import { 
  RequestQueuePanel, 
  TripsPanel,
  AssignTripDialog,
  AddRequestToTripDialog,
  TripDetailSheet,
} from '@/components/transport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Car, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TransportTrip } from '@/hooks/transport/useTransportTrips';

export default function TransportPage() {
  const { currentResort } = useResort();
  const resortId = currentResort?.id;
  
  // Access control
  const { isSuperAdmin, currentResortRole, permissionsLoading } = usePermissions();
  // Transport access: TRANSPORT, MANAGER, or RESORT_ADMIN roles (or super admin)
  const canViewTransport = isSuperAdmin || 
    currentResortRole === 'TRANSPORT' || 
    currentResortRole === 'MANAGER' || 
    currentResortRole === 'RESORT_ADMIN';
  
  // Feature flag
  const { data: settings, isLoading: settingsLoading } = useResortSettings(resortId);
  const transportEnabled = settings?.transport_enabled ?? false;
  
  // Data hooks
  const { data: queueRequests = [], isLoading: queueLoading, refetch: refetchQueue } = useTransportQueue(resortId);
  const { data: trips = [], isLoading: tripsLoading, refetch: refetchTrips } = useTransportTrips(resortId);
  const { data: buggies = [] } = useBuggies(resortId);
  const { data: drivers = [] } = useBuggyDrivers(resortId);
  
  // Mutations
  const mutations = useTransportMutations(resortId);
  
  // Dialog state
  const [assigningTripId, setAssigningTripId] = useState<string | null>(null);
  const [addingToTripId, setAddingToTripId] = useState<string | null>(null);
  const [detailTripId, setDetailTripId] = useState<string | null>(null);
  
  // Get trip for dialogs
  const assigningTrip = trips.find(t => t.id === assigningTripId) || null;
  const detailTrip = trips.find(t => t.id === detailTripId) || null;
  
  // Trip stops for detail sheet
  const { data: detailStops = [] } = useTripStops(detailTripId || undefined);
  
  // Handlers
  const handleCreateTrip = useCallback((requestIds: string[]) => {
    mutations.createTripFromRequests.mutate({ requestIds });
  }, [mutations]);
  
  const handleCancelRequest = useCallback((requestId: string) => {
    mutations.cancelRequest.mutate({ requestId });
  }, [mutations]);
  
  const handleAssignTrip = useCallback((buggyId: string, driverUserId: string) => {
    if (assigningTripId) {
      mutations.assignTrip.mutate(
        { tripId: assigningTripId, buggyId, driverUserId },
        { onSuccess: () => setAssigningTripId(null) }
      );
    }
  }, [assigningTripId, mutations]);
  
  const handleAddRequestsToTrip = useCallback((requestIds: string[]) => {
    if (addingToTripId && requestIds.length > 0) {
      // Add each request sequentially (could be improved with batch RPC)
      const addNext = (index: number) => {
        if (index >= requestIds.length) {
          setAddingToTripId(null);
          return;
        }
        mutations.addRequestToTrip.mutate(
          { tripId: addingToTripId, requestId: requestIds[index] },
          { onSuccess: () => addNext(index + 1) }
        );
      };
      addNext(0);
    }
  }, [addingToTripId, mutations]);
  
  const handleRemoveRequest = useCallback((tripId: string, requestId: string) => {
    mutations.removeRequestFromTrip.mutate({ tripId, requestId });
  }, [mutations]);
  
  const handleReorderStops = useCallback((orderedIds: string[]) => {
    if (detailTripId) {
      mutations.reorderTripStops.mutate({ tripId: detailTripId, orderedStopIds: orderedIds });
    }
  }, [detailTripId, mutations]);
  
  const handleRefresh = useCallback(() => {
    refetchQueue();
    refetchTrips();
  }, [refetchQueue, refetchTrips]);
  
  // Loading state
  if (permissionsLoading || settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  // Access denied
  if (!canViewTransport) {
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Access Denied
          </CardTitle>
          <CardDescription>
            You don't have permission to access the Transport module.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // Module not enabled
  if (!transportEnabled) {
    return (
      <Card className="m-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-muted-foreground" />
            Transport Module
          </CardTitle>
          <CardDescription>
            The transport module is not enabled for this resort.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Contact your administrator to enable transport features.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div>
          <h1 className="text-xl font-semibold">Transport</h1>
          <p className="text-sm text-muted-foreground">
            Manage buggy requests and trips
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
      
      {/* Main content - responsive grid */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x">
          {/* Request Queue */}
          <div className="min-h-0 overflow-hidden">
            <RequestQueuePanel
              requests={queueRequests}
              isLoading={queueLoading}
              onCreateTrip={handleCreateTrip}
              onCancelRequest={handleCancelRequest}
              isCreatingTrip={mutations.createTripFromRequests.isPending}
            />
          </div>
          
          {/* Trips Panel */}
          <div className="min-h-0 overflow-hidden">
            <TripsPanel
              trips={trips}
              isLoading={tripsLoading}
              onAssignTrip={setAssigningTripId}
              onAddRequestToTrip={setAddingToTripId}
              onRemoveRequest={handleRemoveRequest}
              onViewTripDetails={setDetailTripId}
              onRefresh={refetchTrips}
            />
          </div>
        </div>
      </div>
      
      {/* Dialogs */}
      <AssignTripDialog
        open={!!assigningTripId}
        onOpenChange={(open) => !open && setAssigningTripId(null)}
        trip={assigningTrip}
        buggies={buggies}
        drivers={drivers}
        onAssign={handleAssignTrip}
        isAssigning={mutations.assignTrip.isPending}
      />
      
      <AddRequestToTripDialog
        open={!!addingToTripId}
        onOpenChange={(open) => !open && setAddingToTripId(null)}
        tripId={addingToTripId}
        queuedRequests={queueRequests}
        onAdd={handleAddRequestsToTrip}
        isAdding={mutations.addRequestToTrip.isPending}
      />
      
      <TripDetailSheet
        open={!!detailTripId}
        onOpenChange={(open) => !open && setDetailTripId(null)}
        trip={detailTrip}
        stops={detailStops}
        onReorderStops={handleReorderStops}
        isReordering={mutations.reorderTripStops.isPending}
      />
    </div>
  );
}
