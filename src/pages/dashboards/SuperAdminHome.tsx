import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Calendar, Utensils, Star, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SuperAdminHome() {
  const { resorts, setCurrentResort } = useResort();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];

  // Fetch platform-wide stats
  const { data: platformStats, isLoading } = useQuery({
    queryKey: ['super-admin-stats', today],
    queryFn: async () => {
      // Get total active guests across all resorts
      const { count: totalGuests } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .lte('check_in_date', today)
        .gte('check_out_date', today);

      // Get today's activity pax across all resorts
      const { data: todaySessions } = await supabase
        .from('activity_sessions')
        .select('id')
        .eq('date', today)
        .eq('status', 'SCHEDULED');

      let totalActivityPax = 0;
      if (todaySessions && todaySessions.length > 0) {
        const sessionIds = todaySessions.map(s => s.id);
        const { data: activityBookings } = await supabase
          .from('activity_bookings')
          .select('num_adults, num_children')
          .in('session_id', sessionIds)
          .eq('status', 'CONFIRMED');
        
        totalActivityPax = activityBookings?.reduce(
          (sum, b) => sum + (b.num_adults || 0) + (b.num_children || 0),
          0
        ) || 0;
      }

      // Get today's restaurant covers across all resorts
      const { data: todaySlots } = await supabase
        .from('restaurant_time_slots')
        .select('id')
        .eq('date', today);

      let totalCovers = 0;
      if (todaySlots && todaySlots.length > 0) {
        const slotIds = todaySlots.map(s => s.id);
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

      return {
        totalResorts: resorts.length,
        totalGuests: totalGuests || 0,
        totalActivityPax,
        totalCovers,
      };
    },
  });

  // Fetch per-resort breakdown
  const { data: resortBreakdown, isLoading: loadingBreakdown } = useQuery({
    queryKey: ['resort-breakdown', today, resorts.map(r => r.id)],
    queryFn: async () => {
      const breakdown = await Promise.all(
        resorts.map(async (resort) => {
          // Guests in house
          const { count: guestsInHouse } = await supabase
            .from('guests')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .lte('check_in_date', today)
            .gte('check_out_date', today);

          // Today's activity pax
          const { data: sessions } = await supabase
            .from('activity_sessions')
            .select('id')
            .eq('resort_id', resort.id)
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
            .eq('resort_id', resort.id)
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
            .eq('resort_id', resort.id)
            .gte('created_at', sevenDaysAgo.toISOString());

          const avgRating = feedback && feedback.length > 0
            ? (feedback.reduce((sum, f) => sum + f.overall_rating, 0) / feedback.length).toFixed(1)
            : null;

          return {
            id: resort.id,
            name: resort.name,
            code: resort.code,
            guestsInHouse: guestsInHouse || 0,
            activityPax,
            covers,
            avgRating,
          };
        })
      );
      return breakdown;
    },
    enabled: resorts.length > 0,
  });

  const handleSwitchResort = (resortId: string) => {
    const resort = resorts.find(r => r.id === resortId);
    if (resort) {
      setCurrentResort(resort);
      navigate('/staff/dashboard');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Platform Overview"
        description="High-level view across all resorts using Propera."
      />

      {/* Platform Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Resorts"
          value={isLoading ? '—' : platformStats?.totalResorts || 0}
          icon={Building2}
          variant="primary"
          description="Total resorts on platform"
        />
        <StatCard
          title="Guests In House"
          value={isLoading ? '—' : platformStats?.totalGuests || 0}
          icon={Users}
          description="Across all resorts today"
        />
        <StatCard
          title="Activities Pax"
          value={isLoading ? '—' : platformStats?.totalActivityPax || 0}
          icon={Calendar}
          variant="success"
          description="Confirmed for today"
        />
        <StatCard
          title="Restaurant Covers"
          value={isLoading ? '—' : platformStats?.totalCovers || 0}
          icon={Utensils}
          variant="warning"
          description="Confirmed for today"
        />
      </div>

      {/* Resorts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resorts Performance</CardTitle>
          <CardDescription>Today's snapshot by resort</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingBreakdown ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : resortBreakdown && resortBreakdown.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resort</TableHead>
                  <TableHead className="text-center">Code</TableHead>
                  <TableHead className="text-center">Guests</TableHead>
                  <TableHead className="text-center">Activities Pax</TableHead>
                  <TableHead className="text-center">Covers</TableHead>
                  <TableHead className="text-center">Avg Rating</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resortBreakdown.map((resort) => (
                  <TableRow key={resort.id} className="group">
                    <TableCell className="font-medium">{resort.name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline">{resort.code}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{resort.guestsInHouse}</TableCell>
                    <TableCell className="text-center">{resort.activityPax}</TableCell>
                    <TableCell className="text-center">{resort.covers}</TableCell>
                    <TableCell className="text-center">
                      {resort.avgRating ? (
                        <span className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 text-warning fill-warning" />
                          {resort.avgRating}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSwitchResort(resort.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        View <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No resorts found. Create your first resort in Settings.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
