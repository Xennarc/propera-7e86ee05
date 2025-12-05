import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Activity, ActivitySession, ActivityRecurringRule, ActivityClosure } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, List, CalendarDays, Users, TrendingUp, Clock, RepeatIcon, CalendarX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, addDays } from 'date-fns';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { ActivitySessionDialog } from './ActivitySessionDialog';
import { ActivityRecurringRuleDialog } from '@/components/recurring/ActivityRecurringRuleDialog';
import { RecurringRulesList } from '@/components/recurring/RecurringRulesList';
import { ClosureDialog } from '@/components/closures/ClosureDialog';
import { ClosuresList } from '@/components/closures/ClosuresList';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { FilterBar, FilterBarGroup, FilterBarSeparator } from '@/components/ui/filter-bar';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { LoadingPage } from '@/components/ui/loading-spinner';
import { StatCardGridSkeleton, TableSkeleton } from '@/components/ui/dashboard-skeletons';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ErrorBoundary } from '@/components/ui/error-boundary';

interface SessionWithBookings extends ActivitySession {
  activity?: Activity;
  confirmedPax: number;
  pendingPax: number;
}

export default function ActivitySessionsPage() {
  const [sessions, setSessions] = useState<SessionWithBookings[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [recurringRules, setRecurringRules] = useState<ActivityRecurringRule[]>([]);
  const [closures, setClosures] = useState<ActivityClosure[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [closureDialogOpen, setClosureDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<ActivityRecurringRule | null>(null);
  const [recurringOpen, setRecurringOpen] = useState(false);
  const [closuresOpen, setClosuresOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'agenda'>('table');

  const { currentResort } = useResort();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get selected activity for recurring dialog
  const selectedActivityForRecurring = activityFilter !== 'all' 
    ? activities.find(a => a.id === activityFilter) 
    : activities[0];

  const fetchActivities = async () => {
    if (!currentResort) return;
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('resort_id', currentResort.id)
      .eq('is_active', true)
      .order('name');
    if (data) setActivities(data as Activity[]);
  };

  const fetchRecurringRules = async () => {
    if (!currentResort) return;
    let query = supabase
      .from('activity_recurring_rules')
      .select('*, activity:activities(*)')
      .eq('resort_id', currentResort.id)
      .order('created_at', { ascending: false });
    
    if (activityFilter !== 'all') {
      query = query.eq('activity_id', activityFilter);
    }
    
    const { data } = await query;
    if (data) setRecurringRules(data as ActivityRecurringRule[]);
  };

  const fetchClosures = async () => {
    if (!currentResort) return;
    let query = supabase
      .from('activity_closures')
      .select('*, activity:activities(*)')
      .eq('resort_id', currentResort.id)
      .order('closure_date', { ascending: true });
    
    if (activityFilter !== 'all') {
      query = query.eq('activity_id', activityFilter);
    }
    
    const { data } = await query;
    if (data) setClosures(data as ActivityClosure[]);
  };

  const fetchSessions = async () => {
    if (!currentResort) return;

    setLoading(true);
    
    let query = supabase
      .from('activity_sessions')
      .select(`*, activity:activities(*)`)
      .eq('resort_id', currentResort.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .order('start_time');

    if (activityFilter !== 'all') {
      query = query.eq('activity_id', activityFilter);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter as 'SCHEDULED' | 'CANCELLED' | 'COMPLETED');
    }

    const { data: sessionsData, error } = await query;

    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setLoading(false);
      return;
    }

    const sessionIds = sessionsData?.map(s => s.id) || [];
    
    const { data: bookingsData } = await supabase
      .from('activity_bookings')
      .select('session_id, status, num_adults, num_children')
      .in('session_id', sessionIds)
      .in('status', ['CONFIRMED', 'PENDING']);

    const sessionsWithPax = sessionsData?.map(session => {
      const sessionBookings = bookingsData?.filter(b => b.session_id === session.id) || [];
      const confirmedPax = sessionBookings
        .filter(b => b.status === 'CONFIRMED')
        .reduce((sum, b) => sum + b.num_adults + b.num_children, 0);
      const pendingPax = sessionBookings
        .filter(b => b.status === 'PENDING')
        .reduce((sum, b) => sum + b.num_adults + b.num_children, 0);

      return { ...session, confirmedPax, pendingPax };
    }) || [];

    setSessions(sessionsWithPax as SessionWithBookings[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, [currentResort]);

  useEffect(() => {
    fetchSessions();
    fetchRecurringRules();
    fetchClosures();
  }, [currentResort, startDate, endDate, activityFilter, statusFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalSessions = sessions.filter(s => s.status === 'SCHEDULED').length;
    const totalPax = sessions.reduce((sum, s) => sum + s.confirmedPax, 0);
    const totalCapacity = sessions.filter(s => s.status === 'SCHEDULED').reduce((sum, s) => sum + s.capacity, 0);
    const avgOccupancy = totalCapacity > 0 ? Math.round((totalPax / totalCapacity) * 100) : 0;
    return { totalSessions, totalPax, avgOccupancy };
  }, [sessions]);

  // Group sessions by date for agenda view
  const sessionsByDate = useMemo(() => {
    const grouped: Record<string, SessionWithBookings[]> = {};
    sessions.forEach(session => {
      if (!grouped[session.date]) {
        grouped[session.date] = [];
      }
      grouped[session.date].push(session);
    });
    return grouped;
  }, [sessions]);

  if (!currentResort) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Please select a resort first</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ErrorBoundary onReset={() => window.location.reload()}>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Activity Sessions"
          description="Manage scheduled activity sessions"
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Session
            </Button>
          }
      />

      {/* Stats */}
      {loading ? (
        <StatCardGridSkeleton count={3} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            title="Total Sessions"
            value={stats.totalSessions}
            icon={Calendar}
            variant="default"
            description="In selected period"
          />
          <StatCard
            title="Total Guests"
            value={stats.totalPax}
            icon={Users}
            variant="success"
            description="Confirmed pax"
          />
          <StatCard
            title="Average Occupancy"
            value={`${stats.avgOccupancy}%`}
            icon={TrendingUp}
            variant="primary"
          />
        </div>
      )}

      {/* Filters and Table */}
      <Card>
        <CardContent className="p-0">
          <div className="p-4 border-b border-border/50">
            <FilterBar>
              <FilterBarGroup>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-36 bg-background"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-36 bg-background"
                />
              </FilterBarGroup>
              <FilterBarSeparator />
              <FilterBarGroup>
                <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger className="w-44 bg-background">
                    <SelectValue placeholder="All activities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    {activities.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 bg-background">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </FilterBarGroup>
              <div className="ml-auto">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'agenda')}>
                  <TabsList className="bg-background">
                    <TabsTrigger value="table" className="gap-1.5">
                      <List className="h-4 w-4" />
                      Table
                    </TabsTrigger>
                    <TabsTrigger value="agenda" className="gap-1.5">
                      <CalendarDays className="h-4 w-4" />
                      Agenda
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </FilterBar>
          </div>

          {loading ? (
            <LoadingPage />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No sessions found"
              description={activities.length === 0 
                ? "You need to create activities first before scheduling sessions."
                : "No sessions found for the selected period. Create sessions to make activities available for booking."}
              action={
                activities.length === 0 ? (
                  <Button variant="outline" onClick={() => window.location.href = '/staff/activities'}>
                    Go to Activities
                  </Button>
                ) : (
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Session
                  </Button>
                )
              }
            />
          ) : viewMode === 'table' ? (
            <DataTable
              data={sessions}
              onRowClick={(session) => navigate(`/staff/activities/sessions/${session.id}`)}
              columns={[
                {
                  header: 'Date',
                  accessor: (session) => (
                    <span className="font-medium">
                      {format(parseISO(session.date), 'EEE, MMM d')}
                    </span>
                  ),
                },
                {
                  header: 'Time',
                  accessor: (session) => (
                    <span className="text-muted-foreground">
                      {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                    </span>
                  ),
                },
                {
                  header: 'Activity',
                  accessor: (session) => session.activity?.name,
                },
                {
                  header: 'Capacity',
                  accessor: (session) => session.capacity,
                },
                {
                  header: 'Booked',
                  accessor: (session) => (
                    <div className="flex items-center gap-1">
                      <span className="text-success font-medium">{session.confirmedPax}</span>
                      {session.pendingPax > 0 && (
                        <span className="text-warning text-sm">(+{session.pendingPax})</span>
                      )}
                    </div>
                  ),
                },
                {
                  header: 'Remaining',
                  accessor: (session) => {
                    const remaining = session.capacity - session.confirmedPax;
                    return (
                      <span className={
                        remaining <= 0 ? 'text-destructive font-medium' : 
                        remaining <= 3 ? 'text-warning font-medium' : ''
                      }>
                        {remaining}
                      </span>
                    );
                  },
                },
                {
                  header: 'Status',
                  accessor: (session) => <StatusBadge status={session.status} />,
                },
              ]}
            />
          ) : (
            <div className="p-4 space-y-6">
              {Object.entries(sessionsByDate).map(([date, dateSessions]) => (
                <div key={date}>
                  <h3 className="font-semibold text-lg mb-3 text-foreground">
                    {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {dateSessions.map((session) => {
                      const remaining = session.capacity - session.confirmedPax;
                      return (
                        <Card 
                          key={session.id} 
                          className="cursor-pointer hover:shadow-card-hover hover:border-primary/30 transition-all"
                          onClick={() => navigate(`/staff/activities/sessions/${session.id}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-mono font-medium">
                                  {session.start_time.slice(0, 5)}
                                </span>
                              </div>
                              <StatusBadge status={session.status} />
                            </div>
                            <h4 className="font-semibold text-foreground mb-2">{session.activity?.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" />
                                <span className="text-success font-medium">{session.confirmedPax}</span>
                                /{session.capacity}
                              </span>
                              {remaining > 0 ? (
                                <span className={remaining <= 3 ? 'text-warning' : ''}>
                                  {remaining} spots left
                                </span>
                              ) : (
                                <span className="text-destructive font-medium">Full</span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recurring Schedules */}
      {activities.length > 0 && (
        <Collapsible open={recurringOpen} onOpenChange={setRecurringOpen}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                    <CardTitle className="text-base flex items-center gap-2">
                      <RepeatIcon className="h-4 w-4" />
                      Recurring Schedules
                      <span className="text-muted-foreground font-normal">({recurringRules.length})</span>
                    </CardTitle>
                  </Button>
                </CollapsibleTrigger>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingRule(null);
                    setRecurringDialogOpen(true);
                  }}
                  disabled={!selectedActivityForRecurring}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Schedule
                </Button>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <RecurringRulesList
                  rules={recurringRules}
                  type="activity"
                  onEdit={(rule) => {
                    setEditingRule(rule as ActivityRecurringRule);
                    setRecurringDialogOpen(true);
                  }}
                  onRefresh={fetchRecurringRules}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Closures */}
      {activities.length > 0 && (
        <Collapsible open={closuresOpen} onOpenChange={setClosuresOpen}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="p-0 h-auto hover:bg-transparent">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CalendarX className="h-4 w-4" />
                      Closure Dates
                      <span className="text-muted-foreground font-normal">({closures.length})</span>
                    </CardTitle>
                  </Button>
                </CollapsibleTrigger>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setClosureDialogOpen(true)}
                  disabled={!selectedActivityForRecurring}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Closure
                </Button>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <ClosuresList
                  closures={closures}
                  type="activity"
                  onRefresh={fetchClosures}
                  showEntityName={activityFilter === 'all'}
                />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {currentResort && (
        <ActivitySessionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          session={null}
          resortId={currentResort.id}
          activities={activities}
          onSuccess={() => {
            fetchSessions();
            fetchRecurringRules();
          }}
        />
      )}

      {selectedActivityForRecurring && (
        <>
          <ActivityRecurringRuleDialog
            open={recurringDialogOpen}
            onOpenChange={setRecurringDialogOpen}
            rule={editingRule}
            activity={selectedActivityForRecurring}
            resortId={currentResort.id}
            onSuccess={() => {
              fetchRecurringRules();
              fetchSessions();
            }}
          />
          <ClosureDialog
            open={closureDialogOpen}
            onOpenChange={setClosureDialogOpen}
            type="activity"
            entityId={selectedActivityForRecurring.id}
            entityName={selectedActivityForRecurring.name}
            resortId={currentResort.id}
            onSuccess={fetchClosures}
          />
        </>
      )}
    </div>
    </ErrorBoundary>
  );
}
