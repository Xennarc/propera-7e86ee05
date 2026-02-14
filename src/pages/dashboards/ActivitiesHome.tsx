import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { KpiGrid, KpiCard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Link } from 'react-router-dom';
import { Calendar, Users, Clock, AlertCircle, Search, Plus, Check, X, ArrowRight } from 'lucide-react';
import { StatCardGridSkeleton, TableSkeleton, RequestCardSkeleton } from '@/components/ui/dashboard-skeletons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';

type DateFilter = 'today' | 'tomorrow';

export default function ActivitiesHome() {
  const { currentResort } = useResort();
  const queryClient = useQueryClient();
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');

  const selectedDate = dateFilter === 'today'
    ? new Date().toISOString().split('T')[0]
    : addDays(new Date(), 1).toISOString().split('T')[0];

  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['activities-stats', currentResort?.id, selectedDate],
    queryFn: async () => {
      if (!currentResort) return null;

      // Total sessions
      const { count: totalSessions } = await supabase
        .from('activity_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', currentResort.id)
        .eq('date', selectedDate)
        .eq('status', 'SCHEDULED');

      // Get sessions for pax calculation
      const { data: sessions } = await supabase
        .from('activity_sessions')
        .select('id, capacity')
        .eq('resort_id', currentResort.id)
        .eq('date', selectedDate)
        .eq('status', 'SCHEDULED');

      let totalPax = 0;
      let totalCapacity = 0;
      if (sessions && sessions.length > 0) {
        totalCapacity = sessions.reduce((sum, s) => sum + s.capacity, 0);
        const sessionIds = sessions.map(s => s.id);
        const { data: bookings } = await supabase
          .from('activity_bookings')
          .select('num_adults, num_children')
          .in('session_id', sessionIds)
          .eq('status', 'CONFIRMED');
        totalPax = bookings?.reduce(
          (sum, b) => sum + (b.num_adults || 0) + (b.num_children || 0),
          0
        ) || 0;
      }

      const avgOccupancy = totalCapacity > 0 ? Math.round((totalPax / totalCapacity) * 100) : 0;

      // Pending requests
      const { data: pendingSessions } = await supabase
        .from('activity_sessions')
        .select('id')
        .eq('resort_id', currentResort.id)
        .eq('date', selectedDate);

      let pendingRequests = 0;
      if (pendingSessions && pendingSessions.length > 0) {
        const sessionIds = pendingSessions.map(s => s.id);
        const { count } = await supabase
          .from('activity_bookings')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
          .eq('status', 'PENDING')
          .eq('source', 'GUEST_PORTAL');
        pendingRequests = count || 0;
      }

      return {
        totalSessions: totalSessions || 0,
        totalPax,
        avgOccupancy,
        pendingRequests,
      };
    },
    enabled: !!currentResort,
  });

  // Fetch sessions
  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['activities-sessions', currentResort?.id, selectedDate],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data: sessionData } = await supabase
        .from('activity_sessions')
        .select(`
          id,
          start_time,
          end_time,
          capacity,
          status,
          activities!inner(name),
          resources(name)
        `)
        .eq('resort_id', currentResort.id)
        .eq('date', selectedDate)
        .eq('status', 'SCHEDULED')
        .order('start_time', { ascending: true });

      if (!sessionData) return [];

      const sessionsWithPax = await Promise.all(
        sessionData.map(async (session) => {
          const { data: bookings } = await supabase
            .from('activity_bookings')
            .select('num_adults, num_children')
            .eq('session_id', session.id)
            .eq('status', 'CONFIRMED');

          const confirmedPax = bookings?.reduce(
            (sum, b) => sum + (b.num_adults || 0) + (b.num_children || 0),
            0
          ) || 0;

          return {
            ...session,
            confirmedPax,
            remainingSpots: session.capacity - confirmedPax,
          };
        })
      );

      return sessionsWithPax;
    },
    enabled: !!currentResort,
  });

  // Fetch pending requests
  const { data: pendingRequests, isLoading: loadingRequests } = useQuery({
    queryKey: ['activities-pending-requests', currentResort?.id, selectedDate],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data: sessionIds } = await supabase
        .from('activity_sessions')
        .select('id')
        .eq('resort_id', currentResort.id)
        .eq('date', selectedDate);

      if (!sessionIds || sessionIds.length === 0) return [];

      const ids = sessionIds.map(s => s.id);
      const { data: requests } = await supabase
        .from('activity_bookings')
        .select(`
          id,
          num_adults,
          num_children,
          guests!inner(full_name, room_number),
          activity_sessions!inner(
            start_time,
            activities!inner(name)
          )
        `)
        .in('session_id', ids)
        .eq('status', 'PENDING')
        .eq('source', 'GUEST_PORTAL')
        .order('created_at', { ascending: true });

      return requests || [];
    },
    enabled: !!currentResort,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('activity_bookings')
        .update({ status: 'CONFIRMED' })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities-pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['activities-stats'] });
      queryClient.invalidateQueries({ queryKey: ['activities-sessions'] });
      toast.success('Booking approved');
    },
    onError: () => {
      toast.error('Failed to approve booking');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('activity_bookings')
        .update({ status: 'CANCELLED' })
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities-pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['activities-stats'] });
      toast.success('Booking rejected');
    },
    onError: () => {
      toast.error('Failed to reject booking');
    },
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Activities – Schedule"
        description={`${dateFilter === 'today' ? "Today's" : "Tomorrow's"} trips at a glance.`}
        action={
          <div className="flex gap-2">
            <Button
              variant={dateFilter === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('today')}
            >
              Today
            </Button>
            <Button
              variant={dateFilter === 'tomorrow' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateFilter('tomorrow')}
            >
              Tomorrow
            </Button>
          </div>
        }
      />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/staff/activities/sessions">
            <Plus className="mr-2 h-4 w-4" />
            Create Session
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/staff/guests">
            <Search className="mr-2 h-4 w-4" />
            Search Guest
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <KpiGrid>
        <KpiCard label="Total Sessions" value={stats?.totalSessions || 0} icon={Calendar} variant="primary" loading={isLoading} />
        <KpiCard label="Confirmed Pax" value={stats?.totalPax || 0} icon={Users} variant="success" loading={isLoading} />
        <KpiCard label="Avg Occupancy" value={`${stats?.avgOccupancy || 0}%`} icon={Clock} loading={isLoading} />
        <KpiCard label="Pending Requests" value={stats?.pendingRequests || 0} icon={AlertCircle} variant={stats?.pendingRequests && stats.pendingRequests > 0 ? 'warning' : 'default'} loading={isLoading} />
      </KpiGrid>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Sessions Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Activity Sessions</CardTitle>
              <CardDescription>{format(new Date(selectedDate), 'EEEE, MMMM d')}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/staff/activities/sessions" className="text-primary">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingSessions ? (
              <TableSkeleton rows={4} columns={6} />
            ) : sessions && sessions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Activity</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead className="text-center">Capacity</TableHead>
                    <TableHead className="text-center">Pax</TableHead>
                    <TableHead className="text-center">Available</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session: any) => (
                    <TableRow
                      key={session.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => window.location.href = `/staff/activities/sessions/${session.id}`}
                    >
                      <TableCell className="font-medium">
                        {session.start_time.slice(0, 5)}
                      </TableCell>
                      <TableCell>{session.activities?.name}</TableCell>
                      <TableCell>{session.resources?.name || '—'}</TableCell>
                      <TableCell className="text-center">{session.capacity}</TableCell>
                      <TableCell className="text-center">{session.confirmedPax}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={session.remainingSpots <= 0 ? 'destructive' : session.remainingSpots <= 2 ? 'default' : 'secondary'}>
                          {session.remainingSpots}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No sessions scheduled</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Requests */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Guest Requests
            </CardTitle>
            <CardDescription>Pending approvals for {dateFilter}</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <div className="space-y-3">
                {[1, 2].map(i => <RequestCardSkeleton key={i} />)}
              </div>
            ) : pendingRequests && pendingRequests.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-auto">
                {pendingRequests.map((request: any) => (
                  <div key={request.id} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{request.activity_sessions?.activities?.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {request.activity_sessions?.start_time.slice(0, 5)}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {request.num_adults + request.num_children} pax
                      </Badge>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{request.guests?.full_name}</span>
                      <span className="text-muted-foreground"> • Room {request.guests?.room_number}</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => approveMutation.mutate(request.id)}
                        disabled={approveMutation.isPending}
                      >
                        <Check className="mr-1 h-4 w-4" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => rejectMutation.mutate(request.id)}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Check className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No pending requests</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
