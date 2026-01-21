import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { 
  useGuestServiceRequests, 
  useServiceRequestMutations,
  ServiceRequest 
} from '@/hooks/useServiceRequests';
import { Button } from '@/components/ui/button';
import { GuestEmptyState } from '@/components/guest/GuestEmptyState';
import { RequestCard } from '@/components/guest/requests/RequestCard';
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
import { Plus, ClipboardList, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterType = 'active' | 'completed' | 'all';

export default function GuestMyRequestsPage() {
  const { guest } = useGuestAuth();
  const [filter, setFilter] = useState<FilterType>('active');
  const [cancelDialog, setCancelDialog] = useState<ServiceRequest | null>(null);
  
  const { requests, isLoading, refetch } = useGuestServiceRequests({
    guestId: guest?.guestId || '',
    resortId: guest?.resortId || '',
    enabled: !!guest,
  });
  
  const { cancelRequest, isCancelling } = useServiceRequestMutations(
    guest?.guestId || '',
    guest?.resortId || ''
  );

  if (!guest) return null;

  // Filter requests
  const activeStatuses = ['NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS'];
  const completedStatuses = ['COMPLETED', 'CANCELLED'];
  
  const filteredRequests = requests.filter((r) => {
    if (filter === 'active') return activeStatuses.includes(r.status);
    if (filter === 'completed') return completedStatuses.includes(r.status);
    return true;
  });
  
  // Sort by created_at desc
  const sortedRequests = [...filteredRequests].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  const activeCount = requests.filter((r) => activeStatuses.includes(r.status)).length;
  const completedCount = requests.filter((r) => completedStatuses.includes(r.status)).length;

  const handleCancel = async () => {
    if (!cancelDialog) return;
    try {
      await cancelRequest(cancelDialog.id);
      setCancelDialog(null);
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Requests</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount > 0 ? `${activeCount} active` : 'Track your requests'}
          </p>
        </div>
        <Button size="sm" asChild className="gap-1.5">
          <Link to="/guest/requests">
            <Plus className="h-4 w-4" />
            New
          </Link>
        </Button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {[
          { key: 'active' as const, label: 'Active', count: activeCount },
          { key: 'completed' as const, label: 'Past', count: completedCount },
          { key: 'all' as const, label: 'All', count: requests.length },
        ].map(({ key, label, count }) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-8 px-3 gap-1.5 rounded-full',
              filter === key && 'shadow-md'
            )}
            onClick={() => setFilter(key)}
          >
            {label}
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded-full min-w-[20px]',
              filter === key 
                ? 'bg-primary-foreground/20 text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            )}>
              {count}
            </span>
          </Button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && sortedRequests.length === 0 && (
        <GuestEmptyState
          icon={ClipboardList}
          title={filter === 'active' ? 'No active requests' : 'No requests yet'}
          description={
            filter === 'active'
              ? "You don't have any active requests right now."
              : "Need something? We're here to help with anything."
          }
          actionLabel="Make a Request"
          actionHref="/guest/requests"
        />
      )}

      {/* Request list */}
      {!isLoading && sortedRequests.length > 0 && (
        <div className="space-y-3">
          {sortedRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onCancel={request.status === 'NEW' ? () => setCancelDialog(request) : undefined}
              isCancelling={isCancelling}
              resortTimezone={guest.resortTimezone}
            />
          ))}
        </div>
      )}

      {/* Cancel confirmation dialog */}
      <AlertDialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your request for "{cancelDialog?.title}"?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Request</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Request'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
