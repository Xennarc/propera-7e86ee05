import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { KpiGrid, KpiCard } from '@/components/ui/kpi-card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Link } from 'react-router-dom';
import { Users, Calendar, Utensils, Star, ThumbsUp, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays, eachDayOfInterval } from 'date-fns';

type DateRange = '7' | '30';

export default function ResortManagerHome() {
  const { currentResort } = useResort();
  const [dateRange, setDateRange] = useState<DateRange>('7');
  const days = parseInt(dateRange);

  const startDate = subDays(new Date(), days - 1);
  const endDate = new Date();
  const dateInterval = eachDayOfInterval({ start: startDate, end: endDate });

  // Fetch stats for the period
  const { data: stats, isLoading } = useQuery({
    queryKey: ['manager-stats', currentResort?.id, dateRange],
    queryFn: async () => {
      if (!currentResort) return null;

      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      // Total distinct guests in period
      const { data: guests } = await supabase
        .from('guests')
        .select('id')
        .eq('resort_id', currentResort.id)
        .lte('check_in_date', endStr)
        .gte('check_out_date', startStr);

      // Total activity pax
      const { data: sessions } = await supabase
        .from('activity_sessions')
        .select('id')
        .eq('resort_id', currentResort.id)
        .gte('date', startStr)
        .lte('date', endStr);

      let totalActivityPax = 0;
      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        const { data: bookings } = await supabase
          .from('activity_bookings')
          .select('num_adults, num_children')
          .in('session_id', sessionIds)
          .eq('status', 'CONFIRMED');
        totalActivityPax = bookings?.reduce(
          (sum, b) => sum + (b.num_adults || 0) + (b.num_children || 0),
          0
        ) || 0;
      }

      // Total restaurant covers
      const { data: slots } = await supabase
        .from('restaurant_time_slots')
        .select('id')
        .eq('resort_id', currentResort.id)
        .gte('date', startStr)
        .lte('date', endStr);

      let totalCovers = 0;
      if (slots && slots.length > 0) {
        const slotIds = slots.map(s => s.id);
        const { data: reservations } = await supabase
          .from('restaurant_reservations')
          .select('num_adults, num_children')
          .in('restaurant_slot_id', slotIds)
          .eq('status', 'CONFIRMED');
        totalCovers = reservations?.reduce(
          (sum, r) => sum + (r.num_adults || 0) + (r.num_children || 0),
          0
        ) || 0;
      }

      // Feedback stats
      const { data: feedback } = await supabase
        .from('stay_feedback')
        .select('overall_rating, would_recommend')
        .eq('resort_id', currentResort.id)
        .gte('created_at', startDate.toISOString());

      const avgRating = feedback && feedback.length > 0
        ? (feedback.reduce((sum, f) => sum + f.overall_rating, 0) / feedback.length).toFixed(1)
        : null;

      const recommendYes = feedback?.filter(f => f.would_recommend === 'YES').length || 0;
      const recommendPercent = feedback && feedback.length > 0
        ? Math.round((recommendYes / feedback.length) * 100)
        : null;

      return {
        totalGuests: guests?.length || 0,
        totalActivityPax,
        totalCovers,
        avgRating,
        recommendPercent,
      };
    },
    enabled: !!currentResort,
  });

  // Fetch daily chart data
  const { data: chartData, isLoading: loadingChart } = useQuery({
    queryKey: ['manager-chart', currentResort?.id, dateRange],
    queryFn: async () => {
      if (!currentResort) return [];

      const data = await Promise.all(
        dateInterval.map(async (date) => {
          const dateStr = format(date, 'yyyy-MM-dd');

          // Activity pax for this day
          const { data: sessions } = await supabase
            .from('activity_sessions')
            .select('id')
            .eq('resort_id', currentResort.id)
            .eq('date', dateStr);

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

          // Covers for this day
          const { data: slots } = await supabase
            .from('restaurant_time_slots')
            .select('id')
            .eq('resort_id', currentResort.id)
            .eq('date', dateStr);

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

          return {
            date: format(date, 'MMM d'),
            activities: activityPax,
            dining: covers,
          };
        })
      );

      return data;
    },
    enabled: !!currentResort,
  });

  // Fetch top activities
  const { data: topActivities, isLoading: loadingTopActivities } = useQuery({
    queryKey: ['top-activities', currentResort?.id, dateRange],
    queryFn: async () => {
      if (!currentResort) return [];

      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const { data: activities } = await supabase
        .from('activities')
        .select('id, name')
        .eq('resort_id', currentResort.id);

      if (!activities) return [];

      const withPax = await Promise.all(
        activities.map(async (activity) => {
          const { data: sessions } = await supabase
            .from('activity_sessions')
            .select('id')
            .eq('activity_id', activity.id)
            .gte('date', startStr)
            .lte('date', endStr);

          let totalPax = 0;
          if (sessions && sessions.length > 0) {
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

          return { ...activity, totalPax };
        })
      );

      return withPax.sort((a, b) => b.totalPax - a.totalPax).slice(0, 5);
    },
    enabled: !!currentResort,
  });

  // Fetch top restaurants
  const { data: topRestaurants, isLoading: loadingTopRestaurants } = useQuery({
    queryKey: ['top-restaurants', currentResort?.id, dateRange],
    queryFn: async () => {
      if (!currentResort) return [];

      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const { data: restaurants } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('resort_id', currentResort.id);

      if (!restaurants) return [];

      const withCovers = await Promise.all(
        restaurants.map(async (restaurant) => {
          const { data: slots } = await supabase
            .from('restaurant_time_slots')
            .select('id')
            .eq('restaurant_id', restaurant.id)
            .gte('date', startStr)
            .lte('date', endStr);

          let totalCovers = 0;
          if (slots && slots.length > 0) {
            const slotIds = slots.map(s => s.id);
            const { data: reservations } = await supabase
              .from('restaurant_reservations')
              .select('num_adults, num_children')
              .in('restaurant_slot_id', slotIds)
              .eq('status', 'CONFIRMED');
            totalCovers = reservations?.reduce(
              (sum, r) => sum + (r.num_adults || 0) + (r.num_children || 0),
              0
            ) || 0;
          }

          return { ...restaurant, totalCovers };
        })
      );

      return withCovers.sort((a, b) => b.totalCovers - a.totalCovers).slice(0, 5);
    },
    enabled: !!currentResort,
  });

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title={`Management Overview – ${currentResort?.name || 'Resort'}`}
        description="Performance snapshot for the selected period."
        action={
          <div className="flex gap-2">
            <Button
              variant={dateRange === '7' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange('7')}
            >
              Last 7 days
            </Button>
            <Button
              variant={dateRange === '30' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDateRange('30')}
            >
              Last 30 days
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <KpiGrid columns="grid-cols-1 xs:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Total Guests"
          value={isLoading ? '—' : stats?.totalGuests || 0}
          icon={Users}
          variant="primary"
          loading={isLoading}
        />
        <KpiCard
          label="Activity Pax"
          value={isLoading ? '—' : stats?.totalActivityPax || 0}
          icon={Calendar}
          variant="success"
          loading={isLoading}
        />
        <KpiCard
          label="Restaurant Covers"
          value={isLoading ? '—' : stats?.totalCovers || 0}
          icon={Utensils}
          variant="warning"
          loading={isLoading}
        />
        <KpiCard
          label="Avg Rating"
          value={isLoading ? '—' : stats?.avgRating || '—'}
          icon={Star}
          loading={isLoading}
        />
        <KpiCard
          label="Would Recommend"
          value={isLoading ? '—' : stats?.recommendPercent ? `${stats.recommendPercent}%` : '—'}
          icon={ThumbsUp}
          variant={stats?.recommendPercent && stats.recommendPercent >= 80 ? 'success' : 'default'}
          loading={isLoading}
        />
      </KpiGrid>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Activity Pax</CardTitle>
            <CardDescription>Confirmed guests per day</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingChart ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="activities"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Daily Restaurant Covers</CardTitle>
            <CardDescription>Confirmed covers per day</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingChart ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="dining"
                    stroke="hsl(var(--warning))"
                    fill="hsl(var(--warning) / 0.2)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Top Activities</CardTitle>
              <CardDescription>By total pax in period</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/staff/reports/activities" className="text-primary">
                Full report <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingTopActivities ? (
              <Skeleton className="h-40 w-full" />
            ) : topActivities && topActivities.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Pax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topActivities.map((activity: any) => (
                    <TableRow key={activity.id}>
                      <TableCell className="font-medium">{activity.name}</TableCell>
                      <TableCell className="text-right">{activity.totalPax}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No activity data</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="text-lg">Top Restaurants</CardTitle>
              <CardDescription>By total covers in period</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/staff/reports/restaurants" className="text-primary">
                Full report <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingTopRestaurants ? (
              <Skeleton className="h-40 w-full" />
            ) : topRestaurants && topRestaurants.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restaurant</TableHead>
                    <TableHead className="text-right">Covers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topRestaurants.map((restaurant: any) => (
                    <TableRow key={restaurant.id}>
                      <TableCell className="font-medium">{restaurant.name}</TableCell>
                      <TableCell className="text-right">{restaurant.totalCovers}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No restaurant data</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
