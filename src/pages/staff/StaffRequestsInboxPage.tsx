import { useState, useMemo } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { RequestStatusPill } from '@/components/guest/requests/RequestStatusPill';
import { RequestDetailDrawer } from '@/components/staff/RequestDetailDrawer';
import {
  useStaffServiceRequests,
  useStaffRequestPermissions,
  useStaffRequestMutations,
  StaffServiceRequest,
  StaffRequestStatus,
  StaffRequestPriority,
  StaffRequestFilters,
} from '@/hooks/useStaffServiceRequests';
import { useResortScope } from '@/hooks/sync/useResortScope';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow, format, isToday, isTomorrow } from 'date-fns';
import {
  Search,
  ClipboardList,
  Filter,
  Clock,
  User,
  MapPin,
  Timer,
  AlertTriangle,
  Flag,
  Eye,
  CheckCircle2,
  PlayCircle,
  UserPlus,
  Loader2,
  RefreshCw,
  Building2,
  ChevronRight,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ErrorBoundary } from '@/components/ui/error-boundary';

type TabStatus = 'all' | 'NEW' | 'ACKNOWLEDGED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

const STATUS_TABS: { value: TabStatus; label: string; icon: typeof Clock }[] = [
  { value: 'all', label: 'All Active', icon: ClipboardList },
  { value: 'NEW', label: 'New', icon: Clock },
  { value: 'ACKNOWLEDGED', label: 'Acknowledged', icon: Eye },
  { value: 'ASSIGNED', label: 'Assigned', icon: UserPlus },
  { value: 'IN_PROGRESS', label: 'In Progress', icon: PlayCircle },
  { value: 'COMPLETED', label: 'Completed', icon: CheckCircle2 },
];

const PRIORITY_OPTIONS: { value: StaffRequestPriority | 'all'; label: string }[] = [
  { value: 'all', label: 'All Priorities' },
  { value: 'URGENT', label: 'Urgent' },
  { value: 'HIGH', label: 'High' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Low' },
];

const PRIORITY_CONFIG: Record<StaffRequestPriority, { className: string }> = {
  LOW: { className: 'bg-slate-500/15 text-slate-600 dark:text-slate-400' },
  NORMAL: { className: 'bg-blue-500/15 text-blue-600 dark:text-blue-400' },
  HIGH: { className: 'bg-orange-500/15 text-orange-600 dark:text-orange-400' },
  URGENT: { className: 'bg-red-500/15 text-red-600 dark:text-red-400' },
};

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
  const [activeTab, setActiveTab] = useState<TabStatus>('all');
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
      // Show all active (non-completed, non-cancelled)
      // We'll filter client-side for 'all' active
    } else if (activeTab === 'ARCHIVED') {
      f.includeArchived = true;
    } else {
      f.status = activeTab;
    }

    // Department filter
    if (departmentFilter !== '__all__') {
      f.departments = [departmentFilter];
    } else if (accessibleDepartments) {
      // User can only see specific departments
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

  // Client-side filter for 'all' tab to exclude completed/cancelled
  const filteredRequests = useMemo(() => {
    if (activeTab === 'all') {
      return requests.filter((r) => !['COMPLETED', 'CANCELLED'].includes(r.status));
    }
    return requests;
  }, [requests, activeTab]);

  // Count by status for badge numbers
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    requests.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
      if (!['COMPLETED', 'CANCELLED'].includes(r.status)) {
        counts.all++;
      }
    });
    return counts;
  }, [requests]);

  // Mutations for quick actions
  const { acknowledge, start, isAcknowledging, isStarting } = useStaffRequestMutations();

  const handleRowClick = (request: StaffServiceRequest) => {
    setSelectedRequest(request);
    setDrawerOpen(true);
  };

  const handleQuickAcknowledge = async (e: React.MouseEvent, request: StaffServiceRequest) => {
    e.stopPropagation();
    await acknowledge(request.id);
  };

  const handleQuickStart = async (e: React.MouseEvent, request: StaffServiceRequest) => {
    e.stopPropagation();
    await start(request.id);
  };

  // Filter visible departments based on permissions
  const visibleDepartments = useMemo(() => {
    if (canViewAllDepartments) return departments;
    if (!accessibleDepartments) return departments;
    return departments.filter((d) => accessibleDepartments.includes(d.key));
  }, [departments, canViewAllDepartments, accessibleDepartments]);

  const formatRequestedTime = (request: StaffServiceRequest) => {
    if (request.is_asap) return 'ASAP';
    if (!request.requested_for_at) return null;
    const date = new Date(request.requested_for_at);
    if (isToday(date)) return `Today ${format(date, 'HH:mm')}`;
    if (isTomorrow(date)) return `Tomorrow ${format(date, 'HH:mm')}`;
    return format(date, 'MMM d, HH:mm');
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Guest Requests"
        description="Manage incoming service requests from guests"
        action={
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Refresh
          </Button>
        }
      />

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabStatus)}>
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
          {STATUS_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = statusCounts[tab.value] || 0;
            return (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="flex items-center gap-1.5 whitespace-nowrap"
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className={cn(
                      'ml-1 h-5 min-w-5 px-1.5 text-[10px]',
                      activeTab === tab.value && 'bg-primary text-primary-foreground'
                    )}
                  >
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
          {canViewArchived && (
            <TabsTrigger value="ARCHIVED" className="flex items-center gap-1.5 whitespace-nowrap">
              <ClipboardList className="h-4 w-4" />
              <span className="hidden sm:inline">Archived</span>
            </TabsTrigger>
          )}
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest, room, or request..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {visibleDepartments.length > 1 && (
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Departments</SelectItem>
              {visibleDepartments.map((dept) => (
                <SelectItem key={dept.key} value={dept.key}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Flag className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canAssign && (
          <Select value={assignedFilter} onValueChange={setAssignedFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Assigned To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Assignments</SelectItem>
              <SelectItem value="__me__">Assigned to Me</SelectItem>
              <SelectItem value="__unassigned__">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Multi-item filter toggle */}
        <Button
          variant={multiItemFilter ? 'default' : 'outline'}
          size="sm"
          className="h-10 gap-1.5"
          onClick={() => setMultiItemFilter(!multiItemFilter)}
        >
          <Layers className="h-4 w-4" />
          <span className="hidden sm:inline">Multi-item</span>
        </Button>
      </div>

      {/* Requests List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="divide-y divide-border/50">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="p-4 flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ClipboardList}
                title="No requests found"
                description={
                  searchQuery || departmentFilter !== '__all__' || priorityFilter !== 'all'
                    ? 'Try adjusting your filters.'
                    : activeTab === 'all'
                    ? "You're all caught up! No active requests."
                    : `No requests with status "${activeTab}".`
                }
              />
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {filteredRequests.map((request) => {
                const priorityClass = PRIORITY_CONFIG[request.priority]?.className;
                const requestedTime = formatRequestedTime(request);
                const isUrgent = request.priority === 'URGENT' || request.priority === 'HIGH';

                return (
                  <div
                    key={request.id}
                    onClick={() => handleRowClick(request)}
                    className={cn(
                      'p-4 flex items-start gap-4 cursor-pointer transition-colors hover:bg-muted/50',
                      isUrgent && 'bg-red-500/5'
                    )}
                  >
                    {/* Priority indicator */}
                    <div
                      className={cn(
                        'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
                        priorityClass || 'bg-muted'
                      )}
                    >
                      {request.priority === 'URGENT' ? (
                        <AlertTriangle className="h-5 w-5" />
                      ) : (
                        <ClipboardList className="h-5 w-5" />
                      )}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-foreground truncate">{request.title}</h4>
                            {request.item_count > 1 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                                {request.item_count} items
                              </Badge>
                            )}
                          </div>
                          {/* Item preview for multi-item requests */}
                          {request.item_preview && (
                            <p className="text-xs text-muted-foreground/80 mt-0.5 truncate">
                              {request.item_preview}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" />
                              {request.guest_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {request.room_number}
                            </span>
                            {requestedTime && (
                              <span className="flex items-center gap-1">
                                <Timer className="h-3.5 w-3.5" />
                                {requestedTime === 'ASAP' ? (
                                  <Badge variant="destructive" className="text-[10px] px-1 py-0">
                                    ASAP
                                  </Badge>
                                ) : (
                                  requestedTime
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                      </div>

                      {/* Bottom row: status, dept, time, actions */}
                      <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <RequestStatusPill status={request.status} size="sm" />
                          <Badge variant="outline" className="text-[10px]">
                            {request.department_key}
                          </Badge>
                          {request.assigned_to_name && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <UserPlus className="h-3 w-3" />
                              {request.assigned_to_name}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
                          </span>

                          {/* Quick Actions */}
                          {canManage && request.status === 'NEW' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2"
                              onClick={(e) => handleQuickAcknowledge(e, request)}
                              disabled={isAcknowledging}
                            >
                              {isAcknowledging ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                              <span className="ml-1 hidden sm:inline">Ack</span>
                            </Button>
                          )}
                          {canManage &&
                            (request.status === 'ASSIGNED' || request.status === 'ACKNOWLEDGED') &&
                            request.assigned_to === userId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2"
                                onClick={(e) => handleQuickStart(e, request)}
                                disabled={isStarting}
                              >
                                {isStarting ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <PlayCircle className="h-3.5 w-3.5" />
                                )}
                                <span className="ml-1 hidden sm:inline">Start</span>
                              </Button>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
