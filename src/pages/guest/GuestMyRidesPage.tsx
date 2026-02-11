import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GUEST_ROUTES } from '@/routes/guestRoutes';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { Car, Plus, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { MobilePageHeader } from '@/components/guest/MobilePageHeader';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { useResortSettings } from '@/hooks/useResortSettings';
import { useGuestBuggyRequestsSync } from '@/hooks/sync/useTransportSync';
import { useGuestRideRealtimeSync } from '@/hooks/sync/useDriverRealtimeSync';
import { 
  useGuestBuggyRequests, 
  useCancelBuggyRequest,
  type GuestBuggyRequest
} from '@/hooks/transport/useGuestBuggyRequests';
import { BuggyRideCard } from '@/components/guest/buggy';
import { GuestEmptyState } from '@/components/guest/GuestEmptyState';
import { cn } from '@/lib/utils';
import type { BuggyRequestStatus } from '@/types/database';

type FilterType = 'active' | 'past' | 'all';

const ACTIVE_STATUSES: BuggyRequestStatus[] = [
  'requested', 'queued', 'assigned_to_trip', 'driver_en_route', 'arrived', 'picked_up'
];

const PAST_STATUSES: BuggyRequestStatus[] = [
  'completed', 'cancelled', 'failed', 'no_show'
];

export default function GuestMyRidesPage() {
  const navigate = useNavigate();
  const { guest } = useGuestAuth();
  const [filter, setFilter] = useState<FilterType>('active');
  const [cancelDialog, setCancelDialog] = useState<GuestBuggyRequest | null>(null);
  
  // Feature flag check
  const { data: settings, isLoading: settingsLoading } = useResortSettings(guest?.resortId);
  const transportEnabled = settings?.transport_enabled ?? false;
  
  // Data
  const { data: requests, isLoading } = useGuestBuggyRequests(guest?.guestId, guest?.resortId);
  const cancelMutation = useCancelBuggyRequest();

  // Realtime sync - updates My Rides in real-time (polling fallback)
  useGuestBuggyRequestsSync({
    guestId: guest?.guestId,
    resortId: guest?.resortId,
    enabled: transportEnabled && !!guest,
  });

  // Enhanced realtime sync with toast notifications for status changes
  useGuestRideRealtimeSync({
    guestId: guest?.guestId,
    resortId: guest?.resortId,
    enabled: transportEnabled && !!guest,
  });

  if (!guest) return null;

  // Filter requests
  const filteredRequests = useMemo(() => {
    if (!requests) return [];
    
    switch (filter) {
      case 'active':
        return requests.filter(r => ACTIVE_STATUSES.includes(r.status));
      case 'past':
        return requests.filter(r => PAST_STATUSES.includes(r.status));
      default:
        return requests;
    }
  }, [requests, filter]);

  const activeCount = requests?.filter(r => ACTIVE_STATUSES.includes(r.status)).length || 0;
  const pastCount = requests?.filter(r => PAST_STATUSES.includes(r.status)).length || 0;

  const handleCancel = async () => {
    if (!cancelDialog) return;
    try {
      await cancelMutation.mutateAsync({
        requestId: cancelDialog.id,
        guestId: guest.guestId,
        resortId: guest.resortId,
        reason: 'Cancelled by guest',
      });
      setCancelDialog(null);
    } catch {
      // Error handled by mutation
    }
  };

  // Feature disabled
  if (!transportEnabled && !settingsLoading) {
    return (
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <MobilePageHeader title="My Rides" />
        
        <GuestEmptyState
          icon={Car}
          title="Transport not available"
          description="Buggy transport is not currently available at this resort."
        />
      </motion.div>
    );
  }

  // Loading
  if (isLoading || settingsLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10" />
            <Skeleton className="h-6 w-32" />
          </div>
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-14" />
        </div>
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  // Get empty content based on filter
  const getEmptyContent = () => {
    if (filter === 'active') {
      return {
        icon: Car,
        title: 'No active rides',
        description: 'Request a buggy to get picked up anywhere on the island.',
      };
    }
    if (filter === 'past') {
      return {
        icon: Clock,
        title: 'No past rides',
        description: 'Your completed rides will appear here.',
      };
    }
    return {
      icon: Car,
      title: 'No rides yet',
      description: 'Request your first buggy ride to get around the resort.',
    };
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
        title="My Rides"
        subtitle={activeCount > 0 
          ? `${activeCount} active ride${activeCount !== 1 ? 's' : ''}` 
          : 'Track your buggy requests'}
        actions={
          <Button size="sm" asChild className="gap-1.5 shadow-md shadow-primary/20">
            <Link to={GUEST_ROUTES.BUGGY}>
              <Plus className="h-4 w-4" />
              New Ride
            </Link>
          </Button>
        }
      />

      {/* Filter Tabs */}
      <motion.div 
        className="flex gap-2"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.15 }}
      >
        {[
          { key: 'active' as const, label: 'Active', count: activeCount },
          { key: 'past' as const, label: 'Past', count: pastCount },
          { key: 'all' as const, label: 'All', count: requests?.length || 0 },
        ].map(({ key, label, count }) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-10 px-3 gap-1.5 rounded-full transition-all tap-target',
              filter === key && 'shadow-md shadow-primary/20'
            )}
            onClick={() => setFilter(key)}
          >
            {label}
            <AnimatePresence mode="popLayout">
              <motion.span 
                key={`${key}-${count}`}
                layout
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] tabular-nums text-center',
                  filter === key 
                    ? 'bg-primary-foreground/20 text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {count}
              </motion.span>
            </AnimatePresence>
          </Button>
        ))}
      </motion.div>

      {/* Empty State */}
      {filteredRequests.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GuestEmptyState
            icon={getEmptyContent().icon}
            title={getEmptyContent().title}
            description={getEmptyContent().description}
            actionLabel="Request a Buggy"
            actionHref="/guest/buggy"
          />
        </motion.div>
      )}

      {/* Rides List */}
      {filteredRequests.length > 0 && (
        <motion.div layout className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredRequests.map((request, index) => {
              const canCancel = ['requested', 'queued', 'assigned_to_trip'].includes(request.status);
              
              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <BuggyRideCard
                    request={request}
                    onCancel={canCancel ? () => setCancelDialog(request) : undefined}
                    isCancelling={cancelMutation.isPending}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Cancel Dialog */}
      <AlertDialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this ride?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your buggy request? You can always request a new ride.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelMutation.isPending}>Keep Ride</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={cancelMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Ride'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bottom safe area spacer */}
      <div className="h-20 lg:h-0" />
    </motion.div>
  );
}
