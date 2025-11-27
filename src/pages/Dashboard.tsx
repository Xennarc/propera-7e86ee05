import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useResort } from '@/contexts/ResortContext';
import { supabase } from '@/integrations/supabase/client';
import { Users, Calendar, Utensils, TrendingUp, ArrowRight, Clock, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { profile, roles } = useAuth();
  const { currentResort } = useResort();

  const today = new Date().toISOString().split('T')[0];

  // Fetch dashboard stats
  const { data: stats, isLoading: loadingStats } = useQuery({
    queryKey: ['dashboard-stats', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return null;

      // Get active guests (checked in today or before, checkout today or after)
      const { count: activeGuests } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', currentResort.id)
        .lte('check_in_date', today)
        .gte('check_out_date', today);

      // Get today's activity sessions
      const { count: todaySessions } = await supabase
        .from('activity_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('status', 'SCHEDULED');

      // Get today's restaurant reservations
      const { data: todaySlots } = await supabase
        .from('restaurant_time_slots')
        .select('id')
        .eq('resort_id', currentResort.id)
        .eq('date', today);

      const slotIds = todaySlots?.map(s => s.id) || [];
      
      let totalCovers = 0;
      if (slotIds.length > 0) {
        const { data: todayReservations } = await supabase
          .from('restaurant_reservations')
          .select('num_adults, num_children')
          .eq('resort_id', currentResort.id)
          .in('status', ['CONFIRMED', 'PENDING'])
          .in('restaurant_slot_id', slotIds);

        totalCovers = todayReservations?.reduce(
          (sum, r) => sum + (r.num_adults || 0) + (r.num_children || 0),
          0
        ) || 0;
      }

      // Get pending requests count
      const { count: pendingActivities } = await supabase
        .from('activity_bookings')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', currentResort.id)
        .eq('status', 'PENDING')
        .eq('source', 'GUEST_PORTAL');

      const { count: pendingRestaurants } = await supabase
        .from('restaurant_reservations')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', currentResort.id)
        .eq('status', 'PENDING')
        .eq('source', 'GUEST_PORTAL');

      return {
        activeGuests: activeGuests || 0,
        todaySessions: todaySessions || 0,
        todayCovers: totalCovers,
        pendingRequests: (pendingActivities || 0) + (pendingRestaurants || 0),
      };
    },
    enabled: !!currentResort,
  });

  // Fetch upcoming sessions
  const { data: upcomingSessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['upcoming-sessions', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return [];
      const { data, error } = await supabase
        .from('activity_sessions')
        .select(`
          id,
          date,
          start_time,
          end_time,
          capacity,
          activities!inner(name)
        `)
        .eq('resort_id', currentResort.id)
        .eq('status', 'SCHEDULED')
        .gte('date', today)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentResort,
  });

  const statCards = [
    {
      title: 'Active Guests',
      value: stats?.activeGuests ?? '—',
      description: 'Currently in-house',
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      href: '/guests',
    },
    {
      title: "Today's Sessions",
      value: stats?.todaySessions ?? '—',
      description: 'Scheduled activities',
      icon: Calendar,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
      href: '/activities/sessions',
    },
    {
      title: 'Dining Covers',
      value: stats?.todayCovers ?? '—',
      description: 'Expected today',
      icon: Utensils,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      href: '/restaurants/slots',
    },
    {
      title: 'Pending Requests',
      value: stats?.pendingRequests ?? '—',
      description: 'Guest portal requests',
      icon: TrendingUp,
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/10',
      href: '/guest-requests',
    },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Staff'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {currentResort ? (
              <>Here's what's happening at <span className="font-medium text-foreground">{currentResort.name}</span> today.</>
            ) : (
              'Select a resort to get started'
            )}
          </p>
        </div>
        {roles.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {roles.map((role) => (
              <Badge
                key={role}
                variant="secondary"
                className="font-medium"
              >
                {role.replace('_', ' ')}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {!currentResort ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-center max-w-sm">
              No resort selected. Please select a resort from the sidebar or create one in Settings → Resorts.
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link to="/settings/resorts">Go to Settings</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat) => (
              <Link key={stat.title} to={stat.href}>
                <Card className="hover:shadow-card-hover hover:border-border transition-all duration-200 group cursor-pointer h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                          {stat.title}
                        </p>
                        {loadingStats ? (
                          <Skeleton className="h-8 w-16" />
                        ) : (
                          <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                        )}
                        <p className="text-xs text-muted-foreground">{stat.description}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${stat.bgColor} group-hover:scale-110 transition-transform duration-200`}>
                        <stat.icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Content Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Upcoming Sessions */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg">Upcoming Sessions</CardTitle>
                  <CardDescription>Activities starting soon</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/activities/sessions" className="text-primary">
                    View all <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {loadingSessions ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-12 w-12 rounded-lg" />
                        <div className="space-y-2 flex-1">
                          <Skeleton className="h-4 w-3/4" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : upcomingSessions?.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Calendar className="h-10 w-10 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">No upcoming sessions</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingSessions?.map((session: any) => (
                      <Link
                        key={session.id}
                        to={`/activities/sessions/${session.id}`}
                        className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                            {session.activities?.name}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            {format(new Date(session.date), 'MMM d')} at {session.start_time.slice(0, 5)}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Quick Actions</CardTitle>
                <CardDescription>Frequently used operations</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                  <Link to="/guests">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Manage Guests</p>
                        <p className="text-xs text-muted-foreground">View and edit guest information</p>
                      </div>
                    </div>
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                  <Link to="/activities/sessions">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-chart-3/10 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-chart-3" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Activity Sessions</p>
                        <p className="text-xs text-muted-foreground">View and manage bookings</p>
                      </div>
                    </div>
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                  <Link to="/restaurants/slots">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-warning/10 flex items-center justify-center">
                        <Utensils className="h-4 w-4 text-warning" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Restaurant Slots</p>
                        <p className="text-xs text-muted-foreground">Manage dining reservations</p>
                      </div>
                    </div>
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start h-auto py-3" asChild>
                  <Link to="/guest-requests">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-chart-4/10 flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-chart-4" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Guest Requests</p>
                        <p className="text-xs text-muted-foreground">Review pending approvals</p>
                      </div>
                    </div>
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
