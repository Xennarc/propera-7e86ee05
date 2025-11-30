import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Calendar, Utensils, Star, ArrowRight, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SuperAdminHome() {
  const { resorts, setCurrentResort } = useResort();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [includeDemos, setIncludeDemos] = useState(false);

  // Filter resorts based on includeDemos toggle
  const activeResorts = includeDemos 
    ? resorts 
    : resorts.filter(r => r.status === 'ACTIVE');

  // Fetch platform-wide stats
  const { data: platformStats, isLoading } = useQuery({
    queryKey: ['super-admin-stats', today, includeDemos],
    queryFn: async () => {
      // Get resort IDs to filter by
      const resortIds = activeResorts.map(r => r.id);
      
      if (resortIds.length === 0) {
        return {
          totalResorts: 0,
          totalGuests: 0,
          totalActivityPax: 0,
          totalCovers: 0,
        };
      }

      // Get total active guests across filtered resorts
      const { count: totalGuests } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .in('resort_id', resortIds)
        .lte('check_in_date', today)
        .gte('check_out_date', today);

      // Get today's activity pax across filtered resorts
      const { data: todaySessions } = await supabase
        .from('activity_sessions')
        .select('id')
        .in('resort_id', resortIds)
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

      // Get today's restaurant covers across filtered resorts
      const { data: todaySlots } = await supabase
        .from('restaurant_time_slots')
        .select('id')
        .in('resort_id', resortIds)
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
        totalResorts: activeResorts.length,
        totalGuests: totalGuests || 0,
        totalActivityPax,
        totalCovers,
      };
    },
  });

  // Fetch per-resort breakdown
  const { data: resortBreakdown, isLoading: loadingBreakdown } = useQuery({
    queryKey: ['resort-breakdown', today, activeResorts.map(r => r.id)],
    queryFn: async () => {
      const breakdown = await Promise.all(
        activeResorts.map(async (resort) => {
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
            status: resort.status,
            is_demo: resort.is_demo,
            guestsInHouse: guestsInHouse || 0,
            activityPax,
            covers,
            avgRating,
          };
        })
      );
      return breakdown;
    },
    enabled: activeResorts.length > 0,
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

      {/* Demo toggle */}
      <div className="flex items-center gap-3">
        <Switch 
          id="include-demos" 
          checked={includeDemos} 
          onCheckedChange={setIncludeDemos} 
        />
        <Label htmlFor="include-demos" className="text-sm text-muted-foreground cursor-pointer">
          Include demo resorts in metrics
        </Label>
        {resorts.filter(r => r.status === 'DEMO').length > 0 && (
          <Badge variant="secondary" className="ml-2">
            <Sparkles className="h-3 w-3 mr-1" />
            {resorts.filter(r => r.status === 'DEMO').length} demo{resorts.filter(r => r.status === 'DEMO').length !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Platform Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={includeDemos ? "All Resorts" : "Active Resorts"}
          value={isLoading ? '—' : platformStats?.totalResorts || 0}
          icon={Building2}
          variant="primary"
          description={includeDemos ? "Including demos" : "Production resorts"}
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
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{resort.name}</span>
                        {resort.is_demo && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            DEMO
                          </Badge>
                        )}
                      </div>
                    </TableCell>
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
