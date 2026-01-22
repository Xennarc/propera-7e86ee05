import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGuestAuth } from '@/contexts/GuestAuthContext';
import { 
  useGuestServiceRequests, 
  useServiceRequestMutations,
  ServiceRequest 
} from '@/hooks/useServiceRequests';
import { Button } from '@/components/ui/button';
import { GuestEmptyState } from '@/components/guest/GuestEmptyState';
import { RequestCard } from '@/components/guest/requests/RequestCard';
import { RequestSubmissionCard } from '@/components/guest/requests/RequestSubmissionCard';
import { RequestCardSkeleton } from '@/components/guest/requests/RequestCardSkeleton';
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
import { Plus, ClipboardList, Loader2, Sparkles, Coffee, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterType = 'active' | 'completed' | 'all';

const FRIENDLY_MESSAGES = {
  noActive: [
    "You're all set! No pending requests.",
    "Nothing in progress—enjoy your stay!",
    "All caught up! Need something? We're here.",
  ],
  noRequests: [
    "Need something? We're here to help!",
    "Our team is ready to assist you.",
    "From extra towels to room service—just ask!",
  ],
  noPast: [
    "No completed requests yet.",
    "Your request history will appear here.",
  ],
};

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

// Group requests by submission_id
interface RequestGroup {
  type: 'single' | 'bundle';
  submissionId: string | null;
  requests: ServiceRequest[];
  sortDate: string; // For sorting
}

function groupRequestsBySubmission(requests: ServiceRequest[]): RequestGroup[] {
  const groups: RequestGroup[] = [];
  const submissionMap = new Map<string, ServiceRequest[]>();
  const singleRequests: ServiceRequest[] = [];

  // Separate bundled vs single requests
  requests.forEach((request) => {
    if (request.submission_id) {
      const existing = submissionMap.get(request.submission_id) || [];
      existing.push(request);
      submissionMap.set(request.submission_id, existing);
    } else {
      singleRequests.push(request);
    }
  });

  // Add bundle groups
  submissionMap.forEach((reqs, submissionId) => {
    // Sort requests within group by created_at
    reqs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    groups.push({
      type: 'bundle',
      submissionId,
      requests: reqs,
      sortDate: reqs[0].created_at,
    });
  });

  // Add single requests
  singleRequests.forEach((request) => {
    groups.push({
      type: 'single',
      submissionId: null,
      requests: [request],
      sortDate: request.created_at,
    });
  });

  // Sort all groups by date desc
  groups.sort((a, b) => new Date(b.sortDate).getTime() - new Date(a.sortDate).getTime());

  return groups;
}

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

  // Filter requests - exclude optimistic entries for stable counts
  const realRequests = requests.filter((r) => !r.id.startsWith('optimistic-'));
  const activeStatuses = ['NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS'];
  const completedStatuses = ['COMPLETED', 'CANCELLED'];
  
  const filteredRequests = requests.filter((r) => {
    if (filter === 'active') return activeStatuses.includes(r.status);
    if (filter === 'completed') return completedStatuses.includes(r.status);
    return true;
  });
  
  // Group requests by submission_id
  const groupedRequests = useMemo(() => 
    groupRequestsBySubmission(filteredRequests),
    [filteredRequests]
  );
  
  const activeCount = realRequests.filter((r) => activeStatuses.includes(r.status)).length;
  const completedCount = realRequests.filter((r) => completedStatuses.includes(r.status)).length;

  const handleCancel = async () => {
    if (!cancelDialog) return;
    try {
      await cancelRequest(cancelDialog.id);
      setCancelDialog(null);
    } catch {
      // Error handled by mutation
    }
  };

  // Determine empty state content
  const getEmptyContent = () => {
    if (filter === 'active') {
      return {
        icon: activeCount === 0 && completedCount > 0 ? PartyPopper : Coffee,
        title: completedCount > 0 ? 'All done!' : 'No active requests',
        description: getRandomMessage(FRIENDLY_MESSAGES.noActive),
      };
    }
    if (filter === 'completed') {
      return {
        icon: ClipboardList,
        title: 'No past requests',
        description: getRandomMessage(FRIENDLY_MESSAGES.noPast),
      };
    }
    return {
      icon: Sparkles,
      title: 'No requests yet',
      description: getRandomMessage(FRIENDLY_MESSAGES.noRequests),
    };
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Requests</h1>
          <p className="text-sm text-muted-foreground">
            {activeCount > 0 ? `${activeCount} active request${activeCount !== 1 ? 's' : ''}` : 'Track your requests'}
          </p>
        </div>
        <Button size="sm" asChild className="gap-1.5 shadow-sm">
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
          { key: 'all' as const, label: 'All', count: realRequests.length },
        ].map(({ key, label, count }) => (
          <Button
            key={key}
            variant={filter === key ? 'default' : 'outline'}
            size="sm"
            className={cn(
              'h-8 px-3 gap-1.5 rounded-full transition-all',
              filter === key && 'shadow-md'
            )}
            onClick={() => setFilter(key)}
          >
            {label}
            <motion.span 
              layout
              className={cn(
                'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] tabular-nums',
                filter === key 
                  ? 'bg-primary-foreground/20 text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {count}
            </motion.span>
          </Button>
        ))}
      </div>

      {/* Loading state */}
      {isLoading && <RequestCardSkeleton count={3} />}

      {/* Empty state */}
      {!isLoading && groupedRequests.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GuestEmptyState
            icon={getEmptyContent().icon}
            title={getEmptyContent().title}
            description={getEmptyContent().description}
            actionLabel="Make a Request"
            actionHref="/guest/requests"
          />
        </motion.div>
      )}

      {/* Request list with grouping */}
      {!isLoading && groupedRequests.length > 0 && (
        <motion.div layout className="space-y-3">
          <AnimatePresence mode="popLayout">
            {groupedRequests.map((group) => {
              if (group.type === 'bundle' && group.submissionId) {
                return (
                  <RequestSubmissionCard
                    key={`bundle-${group.submissionId}`}
                    requests={group.requests}
                    submissionId={group.submissionId}
                    onCancel={(requestId) => {
                      const req = group.requests.find((r) => r.id === requestId);
                      if (req) setCancelDialog(req);
                    }}
                    isCancelling={isCancelling}
                  />
                );
              }
              
              // Single request
              const request = group.requests[0];
              return (
                <RequestCard
                  key={request.id}
                  request={request}
                  onCancel={request.status === 'NEW' ? () => setCancelDialog(request) : undefined}
                  isCancelling={isCancelling}
                  resortTimezone={guest.resortTimezone}
                />
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Cancel confirmation dialog */}
      <AlertDialog open={!!cancelDialog} onOpenChange={() => setCancelDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel your request for "<span className="font-medium">{cancelDialog?.title}</span>"?
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
