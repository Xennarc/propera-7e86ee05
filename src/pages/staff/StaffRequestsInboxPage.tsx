import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RequestDetailDrawer } from '@/components/staff/RequestDetailDrawer';
import {
  RequestStatusTabs,
  RequestTabStatus,
  RequestCard,
  RequestFiltersBar,
  RequestsHeader,
  RequestsEmptyState,
} from '@/components/staff/requests';
import { ScopeDebugBanner } from '@/components/staff/ScopeDebugBanner';
import {
  useStaffServiceRequests,
  useStaffRequestPermissions,
  useStaffRequestMutations,
  StaffServiceRequest,
  StaffRequestPriority,
  StaffRequestFilters,
} from '@/hooks/useStaffServiceRequests';
import { useResortScope } from '@/hooks/sync/useResortScope';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ui/error-boundary';

function StaffRequestsInboxContent() {
  const { resortId, userId } = useResortScope();
  const {
    accessibleDepartments,
    canViewAllDepartments,
    canAssign,
    canManage,
    canViewArchived,
  } = useStaffRequestPermissions();

  // State
  const [activeTab, setActiveTab] = useState<RequestTabStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('__all__');
  const [priorityFilter, setPriorityFilter] = useState<StaffRequestPriority | 'all'>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('__all__');
  const [multiItemFilter, setMultiItemFilter] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StaffServiceRequest | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Fetch departments for filter
  const { data: departments = [] } = useQuery({
    queryKey: ['resort-departments', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      const { data, error } = await supabase
        .from('departments')
        .select('key, name')
        .eq('resort_id', resortId)
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!resortId,
  });

  // Build filters
  const filters: StaffRequestFilters = useMemo(() => {
    const f: StaffRequestFilters = {
      search: searchQuery || undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      hasMultipleItems: multiItemFilter || undefined,
    };

    // Tab-based status filter
    if (activeTab === 'all') {
      // Show all active (non-completed, non-cancelled) - filter client-side
    } else if (activeTab === 'ARCHIVED') {
      f.includeArchived = true;
    } else if (activeTab === 'NEW') {
      // "New" tab includes NEW, ACKNOWLEDGED, ASSIGNED (needs attention)
      // We'll filter client-side
    } else if (activeTab === 'COMPLETED') {
      f.status = 'COMPLETED';
    } else if (activeTab === 'IN_PROGRESS') {
      f.status = 'IN_PROGRESS';
    }

    // Department filter
    if (departmentFilter !== '__all__') {
      f.departments = [departmentFilter];
    } else if (accessibleDepartments) {
      f.departments = accessibleDepartments;
    }

    // Assigned filter
    if (assignedFilter === '__me__') {
      f.assignedTo = userId || undefined;
    } else if (assignedFilter === '__unassigned__') {
      f.assignedTo = 'unassigned';
    } else if (assignedFilter !== '__all__') {
      f.assignedTo = assignedFilter;
    }

    return f;
  }, [activeTab, searchQuery, departmentFilter, priorityFilter, assignedFilter, multiItemFilter, accessibleDepartments, userId]);

  const { requests, isLoading, refetch } = useStaffServiceRequests({ filters });
  const isFetching = isLoading; // Use isLoading as isFetching indicator

  // Client-side filtering based on active tab
  const filteredRequests = useMemo(() => {
    let result = requests;

    if (activeTab === 'all') {
      // All active: exclude COMPLETED and CANCELLED
      result = result.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status));
    } else if (activeTab === 'NEW') {
      // "Needs attention": NEW, ACKNOWLEDGED, ASSIGNED
      result = result.filter((r) => ['NEW', 'ACKNOWLEDGED', 'ASSIGNED'].includes(r.status));
    }

    // Sort: Urgent/High priority first, then by creation date
    return result.sort((a, b) => {
      const priorityOrder = { URGENT: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [requests, activeTab]);

  // Count by status for tabs
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [requests]);

  // Active count for header
  const activeCount = useMemo(() => {
    return requests.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status)).length;
  }, [requests]);

  // Mutations for quick actions
  const { acknowledge, start, complete, isAcknowledging, isStarting, isCompleting } = useStaffRequestMutations();

  const handleRowClick = (request: StaffServiceRequest) => {
    setSelectedRequest(request);
    setDrawerOpen(true);
  };

  // Filter visible departments based on permissions
  const visibleDepartments = useMemo(() => {
    if (canViewAllDepartments) return departments;
    if (!accessibleDepartments) return departments;
    return departments.filter((d) => accessibleDepartments.includes(d.key));
  }, [departments, canViewAllDepartments, accessibleDepartments]);

  const hasActiveFilters =
    searchQuery !== '' ||
    departmentFilter !== '__all__' ||
    priorityFilter !== 'all' ||
    assignedFilter !== '__all__' ||
    multiItemFilter;

  const clearAllFilters = () => {
    setSearchQuery('');
    setDepartmentFilter('__all__');
    setPriorityFilter('all');
    setAssignedFilter('__all__');
    if (multiItemFilter) setMultiItemFilter(false);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Debug Banner (visible with ?debug=1) */}
      <ScopeDebugBanner dataCount={filteredRequests.length} />

      {/* Header */}
      <RequestsHeader
        onRefresh={() => refetch()}
        isLoading={isFetching}
        totalCount={activeCount}
      />

      {/* Status Tabs */}
      <RequestStatusTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={statusCounts}
        showArchived={canViewArchived}
      />

      {/* Filters */}
      <RequestFiltersBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        departmentFilter={departmentFilter}
        onDepartmentChange={setDepartmentFilter}
        departments={visibleDepartments}
        priorityFilter={priorityFilter}
        onPriorityChange={setPriorityFilter}
        assignedFilter={assignedFilter}
        onAssignedChange={setAssignedFilter}
        multiItemFilter={multiItemFilter}
        onMultiItemToggle={() => setMultiItemFilter(!multiItemFilter)}
        canAssign={canAssign}
        showDepartments={visibleDepartments.length > 1}
      />

      {/* Requests List */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                  <div className="flex gap-2 mt-3">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <RequestsEmptyState
              hasFilters={hasActiveFilters}
              activeTab={activeTab}
              onClearFilters={clearAllFilters}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRequests.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              onClick={() => handleRowClick(request)}
              onAcknowledge={() => acknowledge(request.id)}
              onStart={() => start(request.id)}
              onComplete={() => complete({ requestId: request.id })}
              isAcknowledging={isAcknowledging}
              isStarting={isStarting}
              isCompleting={isCompleting}
              canManage={canManage}
              currentUserId={userId}
            />
          ))}
        </div>
      )}

      {/* Detail Drawer */}
      <RequestDetailDrawer
        request={selectedRequest}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}

export default function StaffRequestsInboxPage() {
  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <StaffRequestsInboxContent />
    </ErrorBoundary>
  );
}
