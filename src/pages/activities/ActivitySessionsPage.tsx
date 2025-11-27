import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Activity, ActivitySession, SessionStatus } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, List, CalendarDays } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, addDays, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { StatusBadge } from '@/components/bookings/StatusBadge';
import { ActivitySessionDialog } from './ActivitySessionDialog';

interface SessionWithBookings extends ActivitySession {
  activity?: Activity;
  confirmedPax: number;
  pendingPax: number;
}

export default function ActivitySessionsPage() {
  const [sessions, setSessions] = useState<SessionWithBookings[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
  const [activityFilter, setActivityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ActivitySession | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'agenda'>('table');

  const { currentResort } = useResort();
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const fetchSessions = async () => {
    if (!currentResort) return;

    setLoading(true);
    
    // Fetch sessions with activity data
    let query = supabase
      .from('activity_sessions')
      .select(`
        *,
        activity:activities(*)
      `)
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

    // Fetch booking counts for each session
    const sessionIds = sessionsData?.map(s => s.id) || [];
    
    const { data: bookingsData } = await supabase
      .from('activity_bookings')
      .select('session_id, status, num_adults, num_children')
      .in('session_id', sessionIds)
      .in('status', ['CONFIRMED', 'PENDING']);

    // Calculate pax for each session
    const sessionsWithPax = sessionsData?.map(session => {
      const sessionBookings = bookingsData?.filter(b => b.session_id === session.id) || [];
      const confirmedPax = sessionBookings
        .filter(b => b.status === 'CONFIRMED')
        .reduce((sum, b) => sum + b.num_adults + b.num_children, 0);
      const pendingPax = sessionBookings
        .filter(b => b.status === 'PENDING')
        .reduce((sum, b) => sum + b.num_adults + b.num_children, 0);

      return {
        ...session,
        confirmedPax,
        pendingPax,
      };
    }) || [];

    setSessions(sessionsWithPax as SessionWithBookings[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
  }, [currentResort]);

  useEffect(() => {
    fetchSessions();
  }, [currentResort, startDate, endDate, activityFilter, statusFilter]);

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
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activity Sessions</h1>
          <p className="text-muted-foreground">Manage scheduled activity sessions</p>
        </div>
        <Button onClick={() => { setEditingSession(null); setDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Session
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
                <span className="text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>
              <Select value={activityFilter} onValueChange={setActivityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All activities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All activities</SelectItem>
                  {activities.map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'table' | 'agenda')}>
              <TabsList>
                <TabsTrigger value="table">
                  <List className="h-4 w-4 mr-1" />
                  Table
                </TabsTrigger>
                <TabsTrigger value="agenda">
                  <CalendarDays className="h-4 w-4 mr-1" />
                  Agenda
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No sessions found for the selected period</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Booked</TableHead>
                    <TableHead>Remaining</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => {
                    const remaining = session.capacity - session.confirmedPax;
                    return (
                      <TableRow 
                        key={session.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/activities/sessions/${session.id}`)}
                      >
                        <TableCell className="font-medium">
                          {format(parseISO(session.date), 'EEE, MMM d')}
                        </TableCell>
                        <TableCell>
                          {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                        </TableCell>
                        <TableCell>{session.activity?.name}</TableCell>
                        <TableCell>{session.capacity}</TableCell>
                        <TableCell>
                          <span className="text-success font-medium">{session.confirmedPax}</span>
                          {session.pendingPax > 0 && (
                            <span className="text-warning ml-1">(+{session.pendingPax})</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={remaining <= 0 ? 'text-destructive' : remaining <= 3 ? 'text-warning' : ''}>
                            {remaining}
                          </span>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={session.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(sessionsByDate).map(([date, dateSessions]) => (
                <div key={date}>
                  <h3 className="font-semibold text-lg mb-3 sticky top-0 bg-card py-2">
                    {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {dateSessions.map((session) => {
                      const remaining = session.capacity - session.confirmedPax;
                      return (
                        <Card 
                          key={session.id} 
                          className="cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => navigate(`/activities/sessions/${session.id}`)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-lg font-mono">
                                {session.start_time.slice(0, 5)}
                              </span>
                              <StatusBadge status={session.status} />
                            </div>
                            <h4 className="font-medium mb-1">{session.activity?.name}</h4>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>
                                <span className="text-success font-medium">{session.confirmedPax}</span>
                                /{session.capacity} pax
                              </span>
                              {remaining > 0 && (
                                <span className={remaining <= 3 ? 'text-warning' : ''}>
                                  {remaining} spots left
                                </span>
                              )}
                              {remaining <= 0 && (
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

      <ActivitySessionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        session={editingSession}
        resortId={currentResort.id}
        activities={activities}
        onSuccess={fetchSessions}
      />
    </div>
  );
}
