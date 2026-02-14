import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { KpiGrid, KpiCard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Link, useNavigate } from 'react-router-dom';
import { Users, UserPlus, UserMinus, Calendar, Utensils, Plus, ArrowRight, Eye, Home } from 'lucide-react';
import { TableSkeleton } from '@/components/ui/dashboard-skeletons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function ReservationsHome() {
  const { currentResort } = useResort();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['reservations-stats', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return null;

      // In-house guests
      const { count: guestsInHouse } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', currentResort.id)
        .lte('check_in_date', today)
        .gte('check_out_date', today);

      // Arrivals today
      const { count: arrivalsToday } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', currentResort.id)
        .eq('check_in_date', today);

      // Departures today
      const { count: departuresToday } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', currentResort.id)
        .eq('check_out_date', today);

      // Total activity bookings today
      const { data: sessions } = await supabase
        .from('activity_sessions')
        .select('id')
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('status', 'SCHEDULED');

      let activityBookingsToday = 0;
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        const { count } = await supabase
          .from('activity_bookings')
          .select('*', { count: 'exact', head: true })
          .in('session_id', sessionIds)
          .eq('status', 'CONFIRMED');
        activityBookingsToday = count || 0;
      }

      // Total restaurant reservations today
      const { data: slots } = await supabase
        .from('restaurant_time_slots')
        .select('id')
        .eq('resort_id', currentResort.id)
        .eq('date', today);

      let diningReservationsToday = 0;
      if (slots && slots.length > 0) {
        const slotIds = slots.map(s => s.id);
        const { count } = await supabase
          .from('restaurant_reservations')
          .select('*', { count: 'exact', head: true })
          .in('restaurant_slot_id', slotIds)
          .eq('status', 'CONFIRMED');
        diningReservationsToday = count || 0;
      }

      return {
        guestsInHouse: guestsInHouse || 0,
        arrivalsToday: arrivalsToday || 0,
        departuresToday: departuresToday || 0,
        activityBookingsToday,
        diningReservationsToday,
      };
    },
    enabled: !!currentResort,
  });

  // Fetch arrivals today
  const { data: arrivals, isLoading: loadingArrivals } = useQuery({
    queryKey: ['reservations-arrivals', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data } = await supabase
        .from('guests')
        .select('id, full_name, room_number, check_in_date, check_out_date, channel, nationality')
        .eq('resort_id', currentResort.id)
        .eq('check_in_date', today)
        .order('full_name', { ascending: true })
        .limit(10);

      return data || [];
    },
    enabled: !!currentResort,
  });

  // Fetch departures today
  const { data: departures, isLoading: loadingDepartures } = useQuery({
    queryKey: ['reservations-departures', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data } = await supabase
        .from('guests')
        .select('id, full_name, room_number, check_in_date, check_out_date')
        .eq('resort_id', currentResort.id)
        .eq('check_out_date', today)
        .order('full_name', { ascending: true })
        .limit(10);

      return data || [];
    },
    enabled: !!currentResort,
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Reservations – Today"
        description="Guest check-ins, check-outs, and booking quick actions."
      />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/staff/guests">
            <UserPlus className="mr-2 h-4 w-4" />
            Add New Guest
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/staff/activities/sessions">
            <Calendar className="mr-2 h-4 w-4" />
            Book Activity
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/staff/restaurants/slots">
            <Utensils className="mr-2 h-4 w-4" />
            Book Restaurant
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <KpiGrid columns="grid-cols-1 xs:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="In-House Guests" value={stats?.guestsInHouse || 0} icon={Users} variant="primary" loading={isLoading} />
        <KpiCard label="Arrivals Today" value={stats?.arrivalsToday || 0} icon={UserPlus} variant="success" loading={isLoading} />
        <KpiCard label="Departures Today" value={stats?.departuresToday || 0} icon={UserMinus} variant="warning" loading={isLoading} />
        <KpiCard label="Activity Bookings" value={stats?.activityBookingsToday || 0} icon={Calendar} loading={isLoading} />
        <KpiCard label="Dining Reservations" value={stats?.diningReservationsToday || 0} icon={Utensils} loading={isLoading} />
      </KpiGrid>

      {/* Two-Column Layout for Arrivals and Departures */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Arrivals Today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-success" />
                Arrivals Today
              </CardTitle>
              <CardDescription>Guests checking in</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/staff/guests" className="text-primary">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingArrivals ? (
              <TableSkeleton rows={3} columns={3} />
            ) : arrivals && arrivals.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {arrivals.map((guest: any) => (
                    <TableRow key={guest.id} className="group">
                      <TableCell>
                        <div>
                          <p className="font-medium">{guest.full_name}</p>
                          <p className="text-xs text-muted-foreground">{guest.nationality || guest.channel || '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{guest.room_number}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" asChild>
                            <Link to={`/staff/guests/${guest.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" asChild>
                            <Link to="/staff/activities/sessions">
                              <Plus className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No arrivals today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Departures Today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <UserMinus className="h-5 w-5 text-warning" />
                Departures Today
              </CardTitle>
              <CardDescription>Guests checking out</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/staff/guests" className="text-primary">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingDepartures ? (
              <TableSkeleton rows={3} columns={3} />
            ) : departures && departures.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Guest</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departures.map((guest: any) => (
                    <TableRow key={guest.id} className="group">
                      <TableCell className="font-medium">{guest.full_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">{guest.room_number}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/staff/guests/${guest.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <UserMinus className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No departures today</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Guests - Quick Access */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              Guest Management
            </CardTitle>
            <CardDescription>Manage guests and their bookings</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/staff/guests">
                <Users className="h-6 w-6" />
                <span>All Guests</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/staff/activities/sessions">
                <Calendar className="h-6 w-6" />
                <span>Activity Sessions</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/staff/restaurants/slots">
                <Utensils className="h-6 w-6" />
                <span>Restaurant Slots</span>
              </Link>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" asChild>
              <Link to="/staff/guest-requests">
                <Plus className="h-6 w-6" />
                <span>Guest Requests</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}