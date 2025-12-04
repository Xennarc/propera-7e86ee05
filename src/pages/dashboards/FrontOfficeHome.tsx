import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Link } from 'react-router-dom';
import { Users, UserPlus, UserMinus, Calendar, Utensils, Search, ArrowRight, Eye, Plus } from 'lucide-react';
import { StatCardGridSkeleton, TableSkeleton, CardTableSkeleton } from '@/components/ui/dashboard-skeletons';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function FrontOfficeHome() {
  const { currentResort } = useResort();
  const today = new Date().toISOString().split('T')[0];

  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['front-office-stats', currentResort?.id, today],
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

      // Guests with activities today
      const { data: sessions } = await supabase
        .from('activity_sessions')
        .select('id')
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('status', 'SCHEDULED');

      let guestsWithActivities = 0;
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        const { data: bookings } = await supabase
          .from('activity_bookings')
          .select('guest_id')
          .in('session_id', sessionIds)
          .eq('status', 'CONFIRMED');
        const uniqueGuests = new Set(bookings?.map(b => b.guest_id));
        guestsWithActivities = uniqueGuests.size;
      }

      // Guests with dinner tonight
      const { data: dinnerSlots } = await supabase
        .from('restaurant_time_slots')
        .select('id')
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('meal_period', 'DINNER');

      let guestsWithDinner = 0;
      if (dinnerSlots && dinnerSlots.length > 0) {
        const slotIds = dinnerSlots.map(s => s.id);
        const { data: reservations } = await supabase
          .from('restaurant_reservations')
          .select('guest_id')
          .in('restaurant_slot_id', slotIds)
          .eq('status', 'CONFIRMED');
        const uniqueGuests = new Set(reservations?.map(r => r.guest_id));
        guestsWithDinner = uniqueGuests.size;
      }

      return {
        guestsInHouse: guestsInHouse || 0,
        arrivalsToday: arrivalsToday || 0,
        departuresToday: departuresToday || 0,
        guestsWithActivities,
        guestsWithDinner,
      };
    },
    enabled: !!currentResort,
  });

  // Fetch arrivals today
  const { data: arrivals, isLoading: loadingArrivals } = useQuery({
    queryKey: ['arrivals-today', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data } = await supabase
        .from('guests')
        .select('id, full_name, room_number, channel, nationality')
        .eq('resort_id', currentResort.id)
        .eq('check_in_date', today)
        .order('full_name', { ascending: true });

      return data || [];
    },
    enabled: !!currentResort,
  });

  // Fetch in-house guests with their next activity/dinner
  const { data: inHouseGuests, isLoading: loadingInHouse } = useQuery({
    queryKey: ['in-house-guests', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data: guests } = await supabase
        .from('guests')
        .select('id, full_name, room_number, nationality')
        .eq('resort_id', currentResort.id)
        .lte('check_in_date', today)
        .gte('check_out_date', today)
        .order('room_number', { ascending: true })
        .limit(15);

      if (!guests) return [];

      // Get today's sessions
      const { data: sessions } = await supabase
        .from('activity_sessions')
        .select('id, start_time, activities!inner(name)')
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('status', 'SCHEDULED');

      // Get dinner slots
      const { data: dinnerSlots } = await supabase
        .from('restaurant_time_slots')
        .select('id, start_time, restaurants!inner(name)')
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('meal_period', 'DINNER');

      const guestsWithInfo = await Promise.all(
        guests.map(async (guest) => {
          // Next activity
          let nextActivity = null;
          if (sessions && sessions.length > 0) {
            const sessionIds = sessions.map(s => s.id);
            const { data: bookings } = await supabase
              .from('activity_bookings')
              .select('session_id')
              .eq('guest_id', guest.id)
              .in('session_id', sessionIds)
              .eq('status', 'CONFIRMED');

            if (bookings && bookings.length > 0) {
              const session = sessions.find((s: any) => s.id === bookings[0].session_id) as any;
              if (session) {
                nextActivity = `${session.activities?.name} @ ${session.start_time.slice(0, 5)}`;
              }
            }
          }

          // Dinner reservation
          let dinnerReservation = null;
          if (dinnerSlots && dinnerSlots.length > 0) {
            const slotIds = dinnerSlots.map(s => s.id);
            const { data: reservations } = await supabase
              .from('restaurant_reservations')
              .select('restaurant_slot_id')
              .eq('guest_id', guest.id)
              .in('restaurant_slot_id', slotIds)
              .eq('status', 'CONFIRMED');

            if (reservations && reservations.length > 0) {
              const slot = dinnerSlots.find((s: any) => s.id === reservations[0].restaurant_slot_id) as any;
              if (slot) {
                dinnerReservation = `${slot.restaurants?.name} @ ${slot.start_time.slice(0, 5)}`;
              }
            }
          }

          return {
            ...guest,
            nextActivity,
            dinnerReservation,
          };
        })
      );

      return guestsWithInfo;
    },
    enabled: !!currentResort,
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Front Office – Today"
        description="Arrivals, departures, and quick guest actions."
      />

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/staff/guests">
            <Search className="mr-2 h-4 w-4" />
            Search Guest
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/staff/activities/sessions">
            <Plus className="mr-2 h-4 w-4" />
            Book Activity
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/staff/restaurants/slots">
            <Plus className="mr-2 h-4 w-4" />
            Book Restaurant
          </Link>
        </Button>
      </div>

      {/* Stats */}
      {isLoading ? (
        <StatCardGridSkeleton count={5} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="In-House Guests"
            value={stats?.guestsInHouse || 0}
            icon={Users}
            variant="primary"
          />
          <StatCard
            title="Arrivals Today"
            value={stats?.arrivalsToday || 0}
            icon={UserPlus}
            variant="success"
          />
          <StatCard
            title="Departures Today"
            value={stats?.departuresToday || 0}
            icon={UserMinus}
            variant="warning"
          />
          <StatCard
            title="With Activities"
            value={stats?.guestsWithActivities || 0}
            icon={Calendar}
          />
          <StatCard
            title="Dinner Tonight"
            value={stats?.guestsWithDinner || 0}
            icon={Utensils}
          />
        </div>
      )}

      {/* Arrivals Today */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">Arrivals Today</CardTitle>
            <CardDescription>Guests checking in today</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/staff/guests" className="text-primary">
              View all guests <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loadingArrivals ? (
            <TableSkeleton rows={3} columns={5} />
          ) : arrivals && arrivals.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest Name</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrivals.map((guest: any) => (
                  <TableRow key={guest.id} className="group">
                    <TableCell className="font-medium">{guest.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{guest.room_number}</Badge>
                    </TableCell>
                    <TableCell>{guest.nationality || '—'}</TableCell>
                    <TableCell>{guest.channel || '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/staff/guests/${guest.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/staff/activities/sessions">
                            <Calendar className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to="/staff/restaurants/slots">
                            <Utensils className="h-4 w-4" />
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

      {/* In-House Guests */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">In-House Guests</CardTitle>
            <CardDescription>Current guests with today's schedule</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/staff/guests" className="text-primary">
              View all <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loadingInHouse ? (
            <TableSkeleton rows={3} columns={6} />
          ) : inHouseGuests && inHouseGuests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest Name</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Nationality</TableHead>
                  <TableHead>Next Activity</TableHead>
                  <TableHead>Dinner</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inHouseGuests.map((guest: any) => (
                  <TableRow key={guest.id} className="group">
                    <TableCell className="font-medium">{guest.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{guest.room_number}</Badge>
                    </TableCell>
                    <TableCell>{guest.nationality || '—'}</TableCell>
                    <TableCell>
                      {guest.nextActivity ? (
                        <span className="text-sm text-primary">{guest.nextActivity}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {guest.dinnerReservation ? (
                        <span className="text-sm text-warning">{guest.dinnerReservation}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/staff/guests/${guest.id}`}>
                            <Eye className="h-4 w-4" />
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
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No in-house guests</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
