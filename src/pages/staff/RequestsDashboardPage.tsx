import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRequestsDashboard, RequestWithSLA } from '@/hooks/useRequestsDashboard';
import { DashboardHeader } from '@/components/staff/requests-dashboard/DashboardHeader';
import { StatusLaneTabs, StatusLane } from '@/components/staff/requests-dashboard/StatusLaneTabs';
import { RequestDashboardCard } from '@/components/staff/requests-dashboard/RequestDashboardCard';
import { KeyboardShortcutsModal } from '@/components/staff/requests-dashboard/KeyboardShortcutsModal';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Inbox, Search, Filter, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StaffRequestStatus, StaffRequestFilters } from '@/hooks/useStaffServiceRequests';

const statusToLane: Record<StaffRequestStatus, StatusLane> = {
  NEW: 'new',
  ACKNOWLEDGED: 'new',
  ASSIGNED: 'in_progress',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'completed',
};

export default function RequestsDashboardPage() {
  const [activeLane, setActiveLane] = useState<StatusLane>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [filters, setFilters] = useState<StaffRequestFilters>({});

  const {
    requests,
    counts,
    isLoading,
    refetch,
    lastSyncedAt,
    mutations,
  } = useRequestsDashboard({ filters });

  // Filter requests by lane and search
  const filteredRequests = requests.filter((req) => {
    const lane = statusToLane[req.status as StaffRequestStatus];
    if (lane !== activeLane) return false;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        req.title.toLowerCase().includes(query) ||
        req.guest_name.toLowerCase().includes(query) ||
        req.room_number?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  // Sort by priority then by creation time
  const sortedRequests = [...filteredRequests].sort((a, b) => {
    const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;

    if (aPriority !== bPriority) return aPriority - bPriority;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case '1':
          setActiveLane('new');
          break;
        case '2':
          setActiveLane('in_progress');
          break;
        case '3':
          setActiveLane('completed');
          break;
        case 'r':
          refetch();
          break;
        case '?':
          setShortcutsOpen(true);
          break;
        case 'escape':
          setSelectedRequestId(null);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [refetch]);

  const handleAcknowledge = useCallback((id: string) => {
    mutations.acknowledge(id);
  }, [mutations]);

  const handleStart = useCallback((id: string) => {
    mutations.start(id);
  }, [mutations]);

  const handleComplete = useCallback((id: string) => {
    mutations.complete({ requestId: id });
  }, [mutations]);

  const handleAssignToMe = useCallback((id: string) => {
    mutations.assignToMe(id);
  }, [mutations]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <DashboardHeader
        counts={counts}
        lastSyncedAt={lastSyncedAt}
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
        onShowShortcuts={() => setShortcutsOpen(true)}
      />

      {/* Urgent Alert Banner */}
      <AnimatePresence>
        {counts.urgent > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
              <AlertCircle className="h-5 w-5 text-red-500 shrink-0 animate-pulse" />
              <span className="text-sm font-medium text-red-600 dark:text-red-400">
                {counts.urgent} urgent request{counts.urgent !== 1 ? 's' : ''} requiring immediate attention
              </span>
              <Button
                size="sm"
                variant="destructive"
                className="ml-auto"
                onClick={() => setActiveLane('new')}
              >
                View Now
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Lane Tabs */}
      <StatusLaneTabs
        activeLane={activeLane}
        onLaneChange={setActiveLane}
        counts={counts}
      />

      {/* Search & Filter Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest, room, or request..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Filter className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            <div className="py-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Filter options coming soon...
              </p>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Request Cards */}
      <div className="space-y-3">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-xl" />
          ))
        ) : sortedRequests.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No requests</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {activeLane === 'new'
                ? 'All caught up! No new requests.'
                : activeLane === 'in_progress'
                ? 'No requests in progress.'
                : 'No completed requests yet.'}
            </p>
          </div>
        ) : (
          // Request cards
          <AnimatePresence mode="popLayout">
            {sortedRequests.map((request) => (
              <motion.div
                key={request.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <RequestDashboardCard
                  request={request}
                  onAcknowledge={() => handleAcknowledge(request.id)}
                  onStart={() => handleStart(request.id)}
                  onComplete={() => handleComplete(request.id)}
                  onAssignToMe={() => handleAssignToMe(request.id)}
                  isLoading={
                    mutations.isAcknowledging ||
                    mutations.isStarting ||
                    mutations.isCompleting ||
                    mutations.isAssigning
                  }
                />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
      />
    </div>
  );
}
