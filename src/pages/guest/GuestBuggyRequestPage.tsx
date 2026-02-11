import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { motion } from 'framer-motion';
import { Car, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useFeatureEnabled } from '@/components/FeatureGate';
import { useActiveStay } from '@/hooks/useActiveStay';
import { useIsPrearrivalGuest } from '@/hooks/usePrearrivalData';
import { useGuestRideRealtimeSync } from '@/hooks/sync/useDriverRealtimeSync';
import { 
  useGuestTransportStops, 
  useGuestTransportRoutes,
  useActiveGuestRide,
  useCreateBuggyRequest
} from '@/hooks/transport/useGuestBuggyRequests';
import { BuggyRequestForm, BuggyRideCard } from '@/components/guest/buggy';
import { GuestEmptyState } from '@/components/guest/GuestEmptyState';
import { MobilePageHeader } from '@/components/guest/MobilePageHeader';
import { cn } from '@/lib/utils';

export default function GuestBuggyRequestPage() {
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const { activeStay } = useActiveStay();
  const isPrearrival = activeStay?.status === 'pre_arrival';
  
  // Feature flag check (modern system)
  const transportEnabled = useFeatureEnabled('enable_transport_guest_booking');
  const settingsLoading = false; // Feature flags load synchronously via context
  
  // Data hooks
  const { data: stops, isLoading: stopsLoading } = useGuestTransportStops(guest?.resortId);
  const { data: routes, isLoading: routesLoading } = useGuestTransportRoutes(guest?.resortId);
  const { activeRide, isLoading: rideLoading } = useActiveGuestRide(guest?.guestId, guest?.resortId);
  
  const createRequest = useCreateBuggyRequest();

  // Realtime sync with toast notifications for status changes
  useGuestRideRealtimeSync({
    guestId: guest?.guestId,
    resortId: guest?.resortId,
    enabled: transportEnabled && !!guest,
  });
  
  if (!guest) return null;

  const isLoading = settingsLoading || stopsLoading || routesLoading || rideLoading;

  // Pre-arrival check
  if (isPrearrival) {
    return (
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <MobilePageHeader title="Request a Buggy" />
        
        <GuestEmptyState
          icon={Car}
          title="Available during your stay"
          description="Buggy transport requests will be available once you check in. We'll be ready to take you anywhere around the resort!"
        />
      </motion.div>
    );
  }

  // Feature disabled state
  if (!transportEnabled && !settingsLoading) {
    return (
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <MobilePageHeader title="Request a Buggy" />
        
        <GuestEmptyState
          icon={Car}
          title="Transport not available"
          description="Buggy transport is not currently available at this resort. Please contact reception for assistance."
        />
      </motion.div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-6 w-40" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  const handleSubmit = async (data: Parameters<typeof createRequest.mutate>[0]['requestType'] extends infer T ? {
    requestType: T;
    partySize: number;
    pickupStopId: string | null;
    pickupText: string | null;
    dropoffStopId: string | null;
    dropoffText: string | null;
    scheduledFor: string | null;
    routeId: string | null;
    needsAccessible: boolean;
  } : never) => {
    await createRequest.mutateAsync({
      resortId: guest.resortId,
      guestId: guest.guestId,
      requestType: data.requestType,
      partySize: data.partySize,
      pickupStopId: data.pickupStopId,
      pickupText: data.pickupText,
      dropoffStopId: data.dropoffStopId,
      dropoffText: data.dropoffText,
      scheduledFor: data.scheduledFor,
      routeId: data.routeId,
      needsAccessible: data.needsAccessible,
    });
    
    // Navigate to my rides after successful request
    navigate('/guest/my-rides');
  };

  return (
    <motion.div 
      className="space-y-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Header */}
      <MobilePageHeader 
        title="Request a Buggy" 
        subtitle="We'll pick you up anywhere on the island" 
      />

      {/* Active Ride Card (if exists) */}
      {activeRide && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Your active ride</p>
          <BuggyRideCard 
            request={activeRide}
            compact
          />
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate('/guest/my-rides')}
          >
            View Ride Details
          </Button>
        </div>
      )}

      {/* Request Form */}
      <Card className="guest-card">
        <CardContent className="p-5">
          <BuggyRequestForm
            stops={stops || []}
            routes={(routes || []).map(r => ({
              ...r,
              route_stops: r.route_stops.map((rs: any) => ({
                ...rs,
                stop: rs.stop || { id: '', name: 'Unknown' }
              }))
            }))}
            onSubmit={handleSubmit}
            isSubmitting={createRequest.isPending}
            hasActiveRide={!!activeRide}
          />
        </CardContent>
      </Card>

      {/* Bottom safe area spacer */}
      <div className="h-20 lg:h-0" />
    </motion.div>
  );
}
