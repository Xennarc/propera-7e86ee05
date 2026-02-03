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
  useTransportSetupStatus,
  useTransportDispatchActions,
} from '@/hooks/transport';
import { 
  RequestQueuePanel, 
  TripsPanel,
  AssignTripDialog,
  AddRequestToTripDialog,
  TripDetailSheet,
} from '@/components/transport';
import { TransportHistoryTab } from '@/components/transport/history';
import { 
  SuggestedPools, 
  ResourcesPanel, 
  TripPreviewSheet,
  MobileDispatchNav,
  type MobileDispatchTab,
} from '@/components/transport/dispatch';
import { TransportSetupBanner, TransportSetupWizard } from '@/components/transport/setup';
import { FeatureGate } from '@/components/FeatureGate';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ResizablePanelGroup, 
  ResizablePanel, 
  ResizableHandle 
} from '@/components/ui/resizable';
import { AlertTriangle, Car, RefreshCw, Settings, History, LayoutDashboard, PanelRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import type { TransportTrip } from '@/hooks/transport/useTransportTrips';
import type { TransportQueueRequest } from '@/hooks/transport/useTransportQueue';

function TransportPageContent() {
  const { currentResort } = useResort();
  const resortId = currentResort?.id;
  
  // Access control
  const { isSuperAdmin, currentResortRole, permissionsLoading, canManageTransportResources } = usePermissions();
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
  
  // Mutations (existing, kept for other actions)
  const mutations = useTransportMutations(resortId);
  
  // New atomic dispatch actions hook
  const dispatchActions = useTransportDispatchActions(resortId);
  
  // Setup status
  const setupStatus = useTransportSetupStatus(resortId);
  const showSetupBanner = !setupStatus.isComplete && !setupStatus.isDismissed && !setupStatus.isLoading;
  
  // Dialog state
  const [assigningTripId, setAssigningTripId] = useState<string | null>(null);
  const [addingToTripId, setAddingToTripId] = useState<string | null>(null);
  const [detailTripId, setDetailTripId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dispatch' | 'history'>('dispatch');
  const [showResourcesPanel, setShowResourcesPanel] = useState(true);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  
  // Mobile dispatch navigation
  const isMobile = useIsMobile();
  const [mobileDispatchTab, setMobileDispatchTab] = useState<MobileDispatchTab>('queue');
  
  // Trip preview state
  const [previewRequests, setPreviewRequests] = useState<TransportQueueRequest[]>([]);
  const [showTripPreview, setShowTripPreview] = useState(false);
  
  // Get trip for dialogs
  const assigningTrip = trips.find(t => t.id === assigningTripId) || null;
  const detailTrip = trips.find(t => t.id === detailTripId) || null;
  
  // Trip stops for detail sheet
  const { data: detailStops = [] } = useTripStops(detailTripId || undefined);
  
  // Handlers
  const handleCreateTrip = useCallback((requestIds: string[]) => {
    // Show preview instead of creating directly
    const selectedRequests = queueRequests.filter(r => requestIds.includes(r.id));
    setPreviewRequests(selectedRequests);
    setShowTripPreview(true);
  }, [queueRequests]);
  
  const handleConfirmCreateTrip = useCallback(() => {
    if (previewRequests.length > 0) {
      // Use new atomic RPC via dispatch actions hook
      dispatchActions.createTripFromRequests.mutate(
        { requestIds: previewRequests.map(r => r.id) },
        { 
          onSuccess: () => {
            setShowTripPreview(false);
            setPreviewRequests([]);
          }
          // On error: requests remain visible in queue (handled by hook)
        }
      );
    }
  }, [previewRequests, dispatchActions]);
  
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResourcesPanel(!showResourcesPanel)}
            className="hidden lg:flex"
          >
            <PanelRight className="h-4 w-4 mr-2" />
            Resources
          </Button>
          {(isSuperAdmin || currentResortRole === 'RESORT_ADMIN' || currentResortRole === 'MANAGER') && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/staff/transport/settings">
                <Settings className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Settings</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
      
      {/* Setup Banner */}
      {showSetupBanner && (
        <div className="px-4 pt-4">
          <TransportSetupBanner
            stopsCount={setupStatus.stopsCount}
            buggiesCount={setupStatus.buggiesCount}
            driversCount={setupStatus.driversCount}
            onStartSetup={() => setShowSetupWizard(true)}
            onDismiss={setupStatus.dismissSetup}
          />
        </div>
      )}
      
      {/* Tab navigation */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'dispatch' | 'history')} className="flex-1 flex flex-col">
        <div className="px-4 pt-2 border-b">
          <TabsList>
            <TabsTrigger value="dispatch" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              Dispatch
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="dispatch" className="flex-1 mt-0 overflow-hidden">
          {/* Mobile layout */}
          {isMobile ? (
            <div className="h-full flex flex-col pb-20">
              {mobileDispatchTab === 'queue' && (
                <div className="h-full flex flex-col overflow-hidden">
                  {/* Suggested Pools */}
                  <SuggestedPools
                    requests={queueRequests}
                    onCreatePool={handleCreateTrip}
                    isCreating={dispatchActions.isCreatingTrip}
                  />
                  
                  {/* Request Queue */}
                  <div className="flex-1 overflow-hidden">
                    <RequestQueuePanel
                      requests={queueRequests}
                      isLoading={queueLoading}
                      onCreateTrip={handleCreateTrip}
                      onCancelRequest={handleCancelRequest}
                      isCreatingTrip={dispatchActions.isCreatingTrip}
                    />
                  </div>
                </div>
              )}
              
              {mobileDispatchTab === 'trips' && (
                <TripsPanel
                  trips={trips}
                  isLoading={tripsLoading}
                  onAssignTrip={setAssigningTripId}
                  onAddRequestToTrip={setAddingToTripId}
                  onRemoveRequest={handleRemoveRequest}
                  onViewTripDetails={setDetailTripId}
                  onRefresh={refetchTrips}
                />
              )}
              
              {mobileDispatchTab === 'resources' && (
                <ResourcesPanel
                  buggies={buggies}
                  drivers={drivers}
                  isLoading={queueLoading}
                  resortId={resortId}
                  canManageDrivers={canManageTransportResources}
                />
              )}
              
              {/* Mobile bottom navigation */}
              <MobileDispatchNav
                activeTab={mobileDispatchTab}
                onTabChange={setMobileDispatchTab}
                queueCount={queueRequests.length}
                tripsCount={trips.length}
              />
            </div>
          ) : (
            /* Desktop 3-Column Dispatch Console */
            <ResizablePanelGroup direction="horizontal" className="h-full">
              {/* Left: Request Queue */}
              <ResizablePanel defaultSize={35} minSize={25} className="min-h-0">
                <div className="h-full flex flex-col overflow-hidden">
                  {/* Suggested Pools */}
                  <SuggestedPools
                    requests={queueRequests}
                    onCreatePool={handleCreateTrip}
                    isCreating={dispatchActions.isCreatingTrip}
                  />
                  
                  {/* Request Queue */}
                  <div className="flex-1 overflow-hidden">
                    <RequestQueuePanel
                      requests={queueRequests}
                      isLoading={queueLoading}
                      onCreateTrip={handleCreateTrip}
                      onCancelRequest={handleCancelRequest}
                      isCreatingTrip={dispatchActions.isCreatingTrip}
                    />
                  </div>
                </div>
              </ResizablePanel>
              
              <ResizableHandle withHandle />
              
              {/* Center: Trip Planner */}
              <ResizablePanel defaultSize={40} minSize={30} className="min-h-0">
                <TripsPanel
                  trips={trips}
                  isLoading={tripsLoading}
                  onAssignTrip={setAssigningTripId}
                  onAddRequestToTrip={setAddingToTripId}
                  onRemoveRequest={handleRemoveRequest}
                  onViewTripDetails={setDetailTripId}
                  onRefresh={refetchTrips}
                />
              </ResizablePanel>
              
              {/* Right: Resources Panel (collapsible) */}
              {showResourcesPanel && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} className="min-h-0">
                    <ResourcesPanel
                      buggies={buggies}
                      drivers={drivers}
                      isLoading={queueLoading}
                      resortId={resortId}
                      canManageDrivers={canManageTransportResources}
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          )}
        </TabsContent>
        
        <TabsContent value="history" className="flex-1 mt-0 overflow-hidden">
          <TransportHistoryTab resortId={resortId} />
        </TabsContent>
      </Tabs>
      
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
      
      {/* Trip Preview Sheet */}
      <TripPreviewSheet
        open={showTripPreview}
        onOpenChange={setShowTripPreview}
        requests={previewRequests}
        onConfirm={handleConfirmCreateTrip}
        isCreating={dispatchActions.isCreatingTrip}
      />
      
      {/* Setup Wizard */}
      <TransportSetupWizard
        open={showSetupWizard}
        onOpenChange={setShowSetupWizard}
        resortId={resortId}
        onComplete={setupStatus.dismissSetup}
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
