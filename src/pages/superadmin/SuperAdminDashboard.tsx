import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useNavigate } from 'react-router-dom';
import { 
  Building2, Users, Calendar, Utensils, Star, ArrowRight, Sparkles, 
  Search, AlertTriangle, TrendingUp, Shield, Crown, Activity
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getTierInfo, SubscriptionTier } from '@/lib/tier-features';
import { subDays, format } from 'date-fns';

export default function SuperAdminDashboard() {
  const { resorts, setCurrentResort } = useResort();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const [includeDemos, setIncludeDemos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter resorts based on toggles and filters
  const filteredResorts = resorts.filter(r => {
    if (!includeDemos && r.status === 'DEMO') return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (tierFilter !== 'all' && r.subscription_tier !== tierFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(query) || r.code.toLowerCase().includes(query);
    }
    return true;
  });

  // Fetch platform-wide stats
  const { data: platformStats, isLoading } = useQuery({
    queryKey: ['super-admin-stats', today, includeDemos],
    queryFn: async () => {
      const activeResorts = includeDemos 
        ? resorts 
        : resorts.filter(r => r.status === 'ACTIVE');
      const resortIds = activeResorts.map(r => r.id);
      
      if (resortIds.length === 0) {
        return {
          totalResorts: 0,
          totalGuests: 0,
          totalActivityPax: 0,
          totalCovers: 0,
          tierBreakdown: { ESSENTIAL: 0, PROFESSIONAL: 0, ELITE: 0 },
          rolling7DayBookings: 0,
        };
      }

      // Tier breakdown
      const tierBreakdown = activeResorts.reduce((acc, r) => {
        const tier = r.subscription_tier || 'ESSENTIAL';
        acc[tier] = (acc[tier] || 0) + 1;
        return acc;
      }, { ESSENTIAL: 0, PROFESSIONAL: 0, ELITE: 0 } as Record<string, number>);

      // Get total active guests across filtered resorts
      const { count: totalGuests } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .in('resort_id', resortIds)
        .lte('check_in_date', today)
        .gte('check_out_date', today);

      // Get today's activity pax
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

      // Get today's restaurant covers
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

      // Rolling 7-day booking counts
      const sevenDaysAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const { count: activityBookingsCount } = await supabase
        .from('activity_bookings')
        .select('*', { count: 'exact', head: true })
        .in('resort_id', resortIds)
        .gte('created_at', sevenDaysAgo);
      
      const { count: restaurantBookingsCount } = await supabase
        .from('restaurant_reservations')
        .select('*', { count: 'exact', head: true })
        .in('resort_id', resortIds)
        .gte('created_at', sevenDaysAgo);

      return {
        totalResorts: activeResorts.length,
        totalGuests: totalGuests || 0,
        totalActivityPax,
        totalCovers,
        tierBreakdown,
        rolling7DayBookings: (activityBookingsCount || 0) + (restaurantBookingsCount || 0),
      };
    },
  });

  // Fetch per-resort breakdown
  const { data: resortBreakdown, isLoading: loadingBreakdown } = useQuery({
    queryKey: ['resort-breakdown', today, filteredResorts.map(r => r.id)],
    queryFn: async () => {
      const breakdown = await Promise.all(
        filteredResorts.map(async (resort) => {
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

          // Check for loyalty and pre-arrival config
          const { data: loyaltyProgram } = await supabase
            .from('loyalty_programs')
            .select('is_enabled')
            .eq('resort_id', resort.id)
            .maybeSingle();

          const { data: prearrivalSettings } = await supabase
            .from('prearrival_settings')
            .select('is_enabled')
            .eq('resort_id', resort.id)
            .maybeSingle();

          return {
            id: resort.id,
            name: resort.name,
            code: resort.code,
            status: resort.status,
            is_demo: resort.is_demo,
            subscription_tier: resort.subscription_tier || 'ESSENTIAL',
            guestsInHouse: guestsInHouse || 0,
            activityPax,
            covers,
            avgRating,
            loyaltyEnabled: loyaltyProgram?.is_enabled || false,
            prearrivalEnabled: prearrivalSettings?.is_enabled || false,
          };
        })
      );
      return breakdown;
    },
    enabled: filteredResorts.length > 0,
  });

  // Fetch health alerts
  const { data: healthAlerts } = useQuery({
    queryKey: ['super-admin-health-alerts', resorts.map(r => r.id)],
    queryFn: async () => {
      const alerts: { type: 'warning' | 'info'; message: string; count: number }[] = [];
      const activeResorts = resorts.filter(r => r.status === 'ACTIVE');

      // Check resorts without time slots
      for (const resort of activeResorts) {
        const { count: slotCount } = await supabase
          .from('restaurant_time_slots')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id)
          .gte('date', today);
        
        if (slotCount === 0) {
          const existing = alerts.find(a => a.message.includes('no upcoming time slots'));
          if (existing) {
            existing.count++;
          } else {
            alerts.push({ type: 'warning', message: 'resorts have no upcoming time slots configured', count: 1 });
          }
        }
      }

      // Check resorts without activity sessions
      for (const resort of activeResorts) {
        const { count: sessionCount } = await supabase
          .from('activity_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id)
          .gte('date', today);
        
        if (sessionCount === 0) {
          const existing = alerts.find(a => a.message.includes('no upcoming activity sessions'));
          if (existing) {
            existing.count++;
          } else {
            alerts.push({ type: 'warning', message: 'resorts have no upcoming activity sessions', count: 1 });
          }
        }
      }

      return alerts;
    },
    enabled: resorts.length > 0,
  });

  const handleViewResort = (resortId: string) => {
    navigate(`/superadmin/resorts/${resortId}`);
  };

  const handleSwitchToResort = (resortId: string) => {
    const resort = resorts.find(r => r.id === resortId);
    if (resort) {
      setCurrentResort(resort);
      navigate('/staff/dashboard');
    }
  };

  const getTierBadgeColor = (tier: string) => {
    const info = getTierInfo(tier as SubscriptionTier);
    return info.color;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <PageHeader
        title="Super Admin Dashboard"
        description="Central management for all Propera resorts"
      />

      {/* Global Health Alerts */}
      {healthAlerts && healthAlerts.length > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Health Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {healthAlerts.map((alert, idx) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                    {alert.count}
                  </Badge>
                  <span className="text-muted-foreground">{alert.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search resorts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Tiers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="ESSENTIAL">Essential</SelectItem>
            <SelectItem value="PROFESSIONAL">Professional</SelectItem>
            <SelectItem value="ELITE">Elite</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="DEMO">Demo</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch 
            id="include-demos" 
            checked={includeDemos} 
            onCheckedChange={setIncludeDemos} 
          />
          <Label htmlFor="include-demos" className="text-sm text-muted-foreground cursor-pointer">
            Include demos in metrics
          </Label>
        </div>
      </div>

      {/* Platform Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Resorts"
          value={isLoading ? '—' : platformStats?.totalResorts || 0}
          icon={Building2}
          variant="primary"
          description={includeDemos ? "Including demos" : "Active only"}
        />
        <StatCard
          title="Guests In House"
          value={isLoading ? '—' : platformStats?.totalGuests || 0}
          icon={Users}
          description="Across all resorts"
        />
        <StatCard
          title="Activities Pax"
          value={isLoading ? '—' : platformStats?.totalActivityPax || 0}
          icon={Calendar}
          variant="success"
          description="Today"
        />
        <StatCard
          title="Restaurant Covers"
          value={isLoading ? '—' : platformStats?.totalCovers || 0}
          icon={Utensils}
          variant="warning"
          description="Today"
        />
        <StatCard
          title="7-Day Bookings"
          value={isLoading ? '—' : platformStats?.rolling7DayBookings || 0}
          icon={TrendingUp}
          description="Activities + Dining"
        />
      </div>

      {/* Tier Breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        {(['ESSENTIAL', 'PROFESSIONAL', 'ELITE'] as SubscriptionTier[]).map((tier) => {
          const info = getTierInfo(tier);
          const count = platformStats?.tierBreakdown?.[tier] || 0;
          return (
            <Card key={tier} className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${info.color}`} />
                  {info.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '—' : count}</div>
                <p className="text-xs text-muted-foreground">{info.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resorts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Resorts Overview</CardTitle>
          <CardDescription>
            {filteredResorts.length} resort{filteredResorts.length !== 1 ? 's' : ''} 
            {searchQuery && ` matching "${searchQuery}"`}
          </CardDescription>
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
                  <TableHead className="text-center">Tier</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Features</TableHead>
                  <TableHead className="text-center">Guests</TableHead>
                  <TableHead className="text-center">Activity Pax</TableHead>
                  <TableHead className="text-center">Covers</TableHead>
                  <TableHead className="text-center">Rating</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resortBreakdown.map((resort) => (
                  <TableRow key={resort.id} className="group">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{resort.name}</span>
                        <span className="text-xs text-muted-foreground">{resort.code}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={`${getTierBadgeColor(resort.subscription_tier)} text-white`}>
                        {getTierInfo(resort.subscription_tier as SubscriptionTier).name}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge 
                        variant={resort.status === 'ACTIVE' ? 'default' : 'outline'}
                        className={resort.is_demo ? 'bg-primary/10 text-primary border-primary/30' : ''}
                      >
                        {resort.is_demo ? 'DEMO' : resort.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        {resort.loyaltyEnabled && (
                          <Badge variant="outline" className="text-xs px-1.5">
                            <Crown className="h-3 w-3" />
                          </Badge>
                        )}
                        {resort.prearrivalEnabled && (
                          <Badge variant="outline" className="text-xs px-1.5">
                            <Activity className="h-3 w-3" />
                          </Badge>
                        )}
                        {!resort.loyaltyEnabled && !resort.prearrivalEnabled && (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </div>
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
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewResort(resort.id)}
                        >
                          Manage
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSwitchToResort(resort.id)}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No resorts found matching your filters.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
