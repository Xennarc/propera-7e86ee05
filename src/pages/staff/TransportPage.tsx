import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useResort } from '@/contexts/ResortContext';
import { useResortSettings } from '@/hooks/useResortSettings';
import { usePermissions } from '@/hooks/usePermissions';
import { useTransportRequestsSync } from '@/hooks/sync/useTransportSync';
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
import { FeatureGate } from '@/components/FeatureGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Car, RefreshCw, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TransportTrip } from '@/hooks/transport/useTransportTrips';

function TransportPageContent() {
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
  
  // Realtime sync - subscribes to all transport tables
  useTransportRequestsSync({
    resortId,
    enabled: transportEnabled && canViewTransport,
  });
  
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
  const canManageModules = isSuperAdmin || currentResortRole === 'RESORT_ADMIN';
  
  if (!transportEnabled) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <Car className="h-7 w-7 text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Transport Module Disabled</CardTitle>
            <CardDescription>
              The transport module is not enabled for this resort.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            {canManageModules ? (
              <Button asChild>
                <Link to="/staff/settings/modules">
                  <Settings className="h-4 w-4 mr-2" />
                  Go to Modules Settings
                </Link>
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Contact your Resort Admin to enable transport features.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
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

export default function TransportPage() {
  return (
    <FeatureGate requiredFlags={['enable_transport']} mode="staff">
      <TransportPageContent />
    </FeatureGate>
  );
}
