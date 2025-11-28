import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Link } from 'react-router-dom';
import { Users, UserPlus, UserMinus, Calendar, Utensils, Star, ArrowRight, Clock, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

export default function ResortAdminHome() {
  const { currentResort } = useResort();
  const today = new Date().toISOString().split('T')[0];

  // Fetch resort stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['resort-admin-stats', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return null;

      // Guests in house
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

      // Today's activity pax
      const { data: sessions } = await supabase
        .from('activity_sessions')
        .select('id')
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('status', 'SCHEDULED');

      let activityPax = 0;
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        const { data: bookings } = await supabase
          .from('activity_bookings')
          .select('num_adults, num_children')
          .in('session_id', sessionIds)
          .eq('status', 'CONFIRMED');
        activityPax = bookings?.reduce(
          (sum, b) => sum + (b.num_adults || 0) + (b.num_children || 0),
          0
        ) || 0;
      }

      // Today's restaurant covers
      const { data: slots } = await supabase
        .from('restaurant_time_slots')
        .select('id')
        .eq('resort_id', currentResort.id)
        .eq('date', today);

      let covers = 0;
      if (slots && slots.length > 0) {
        const slotIds = slots.map(s => s.id);
        const { data: reservations } = await supabase
          .from('restaurant_reservations')
          .select('num_adults, num_children')
          .in('restaurant_slot_id', slotIds)
          .eq('status', 'CONFIRMED');
        covers = reservations?.reduce(
          (sum, r) => sum + (r.num_adults || 0) + (r.num_children || 0),
          0
        ) || 0;
      }

      // Last 7 days average feedback
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: feedback } = await supabase
        .from('stay_feedback')
        .select('overall_rating')
        .eq('resort_id', currentResort.id)
        .gte('created_at', sevenDaysAgo.toISOString());

      const avgRating = feedback && feedback.length > 0
        ? (feedback.reduce((sum, f) => sum + f.overall_rating, 0) / feedback.length).toFixed(1)
        : null;

      return {
        guestsInHouse: guestsInHouse || 0,
        arrivalsToday: arrivalsToday || 0,
        departuresToday: departuresToday || 0,
        activityPax,
        covers,
        avgRating,
      };
    },
    enabled: !!currentResort,
  });

  // Fetch today's activity sessions
  const { data: todaySessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['today-sessions', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data: sessions } = await supabase
        .from('activity_sessions')
        .select(`
          id,
          start_time,
          end_time,
          capacity,
          status,
          activities!inner(name)
        `)
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('status', 'SCHEDULED')
        .order('start_time', { ascending: true });

      if (!sessions) return [];

      // Get confirmed pax for each session
      const sessionsWithPax = await Promise.all(
        sessions.map(async (session) => {
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
            occupancy: session.capacity > 0 ? Math.round((confirmedPax / session.capacity) * 100) : 0,
          };
        })
      );

      return sessionsWithPax;
    },
    enabled: !!currentResort,
  });

  // Fetch tonight's restaurant slots (dinner)
  const { data: tonightSlots, isLoading: loadingSlots } = useQuery({
    queryKey: ['tonight-slots', currentResort?.id, today],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data: slots } = await supabase
        .from('restaurant_time_slots')
        .select(`
          id,
          start_time,
          end_time,
          capacity,
          meal_period,
          status,
          restaurants!inner(name)
        `)
        .eq('resort_id', currentResort.id)
        .eq('date', today)
        .eq('status', 'OPEN')
        .order('start_time', { ascending: true });

      if (!slots) return [];

      // Get confirmed covers for each slot
      const slotsWithCovers = await Promise.all(
        slots.map(async (slot) => {
          const { data: reservations } = await supabase
            .from('restaurant_reservations')
            .select('num_adults, num_children')
            .eq('restaurant_slot_id', slot.id)
            .eq('status', 'CONFIRMED');

          const confirmedCovers = reservations?.reduce(
            (sum, r) => sum + (r.num_adults || 0) + (r.num_children || 0),
            0
          ) || 0;

          return {
            ...slot,
            confirmedCovers,
            occupancy: slot.capacity > 0 ? Math.round((confirmedCovers / slot.capacity) * 100) : 0,
          };
        })
      );

      return slotsWithCovers;
    },
    enabled: !!currentResort,
  });

  // Fetch recent feedback
  const { data: recentFeedback, isLoading: loadingFeedback } = useQuery({
    queryKey: ['recent-feedback', currentResort?.id],
    queryFn: async () => {
      if (!currentResort) return [];

      const { data } = await supabase
        .from('stay_feedback')
        .select(`
          id,
          overall_rating,
          highlight_comment,
          improvement_comment,
          check_out_date,
          guests!inner(full_name)
        `)
        .eq('resort_id', currentResort.id)
        .order('created_at', { ascending: false })
        .limit(5);

      return data || [];
    },
    enabled: !!currentResort,
  });

  const getMealPeriodBadge = (period: string) => {
    const colors: Record<string, string> = {
      BREAKFAST: 'bg-warning/10 text-warning',
      LUNCH: 'bg-primary/10 text-primary',
      DINNER: 'bg-chart-3/10 text-chart-3',
      EVENT: 'bg-chart-4/10 text-chart-4',
    };
    return colors[period] || 'bg-muted text-muted-foreground';
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={`${currentResort?.name || 'Resort'} – Today`}
        description="Overview of guests, activities, restaurants, and feedback for today."
      />

      {/* Top Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard
          title="Guests In House"
          value={isLoading ? '—' : stats?.guestsInHouse || 0}
          icon={Users}
          variant="primary"
        />
        <StatCard
          title="Arrivals Today"
          value={isLoading ? '—' : stats?.arrivalsToday || 0}
          icon={UserPlus}
          variant="success"
        />
        <StatCard
          title="Departures Today"
          value={isLoading ? '—' : stats?.departuresToday || 0}
          icon={UserMinus}
          variant="warning"
        />
        <StatCard
          title="Activities Pax"
          value={isLoading ? '—' : stats?.activityPax || 0}
          icon={Calendar}
        />
        <StatCard
          title="Restaurant Covers"
          value={isLoading ? '—' : stats?.covers || 0}
          icon={Utensils}
        />
        <StatCard
          title="Avg Rating (7d)"
          value={isLoading ? '—' : stats?.avgRating || '—'}
          icon={Star}
          variant={stats?.avgRating && parseFloat(stats.avgRating) >= 4 ? 'success' : 'default'}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Activities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Today's Activities</CardTitle>
              <CardDescription>Scheduled sessions for today</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/staff/activities/sessions" className="text-primary">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingSessions ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : todaySessions && todaySessions.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-auto">
                {todaySessions.slice(0, 6).map((session: any) => (
                  <Link
                    key={session.id}
                    to={`/staff/activities/sessions/${session.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {session.start_time.slice(0, 5)}
                      </div>
                      <span className="font-medium group-hover:text-primary transition-colors">
                        {session.activities?.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm">
                        {session.confirmedPax}/{session.capacity}
                      </span>
                      <Badge variant={session.occupancy >= 80 ? 'destructive' : session.occupancy >= 50 ? 'default' : 'secondary'}>
                        {session.occupancy}%
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No sessions scheduled today</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tonight's Restaurants */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Today's Restaurants</CardTitle>
              <CardDescription>Time slots and covers</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/staff/restaurants/slots" className="text-primary">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingSlots ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : tonightSlots && tonightSlots.length > 0 ? (
              <div className="space-y-2 max-h-80 overflow-auto">
                {tonightSlots.slice(0, 6).map((slot: any) => (
                  <Link
                    key={slot.id}
                    to={`/staff/restaurants/slots/${slot.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {slot.start_time.slice(0, 5)}
                      </div>
                      <span className="font-medium group-hover:text-primary transition-colors">
                        {slot.restaurants?.name}
                      </span>
                      <Badge className={getMealPeriodBadge(slot.meal_period)}>
                        {slot.meal_period}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm">
                        {slot.confirmedCovers}/{slot.capacity}
                      </span>
                      <Badge variant={slot.occupancy >= 80 ? 'destructive' : slot.occupancy >= 50 ? 'default' : 'secondary'}>
                        {slot.occupancy}%
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Utensils className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No slots scheduled today</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Feedback */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div>
            <CardTitle className="text-lg">Recent Feedback</CardTitle>
            <CardDescription>Latest guest stay feedback</CardDescription>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/staff/reports/stay-feedback" className="text-primary">
              View report <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loadingFeedback ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : recentFeedback && recentFeedback.length > 0 ? (
            <div className="space-y-3">
              {recentFeedback.map((fb: any) => (
                <div key={fb.id} className="flex items-start gap-4 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-warning/10">
                    <Star className="h-4 w-4 text-warning fill-warning" />
                    <span className="font-bold text-warning">{fb.overall_rating}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{fb.guests?.full_name}</span>
                      <span className="text-xs text-muted-foreground">
                        Checkout: {format(new Date(fb.check_out_date), 'MMM d')}
                      </span>
                    </div>
                    {(fb.highlight_comment || fb.improvement_comment) && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        <MessageSquare className="h-3 w-3 inline mr-1" />
                        {fb.highlight_comment || fb.improvement_comment}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No feedback received yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
