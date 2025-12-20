import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { getTierInfo, SubscriptionTier } from '@/lib/tier-features';
import { format, subDays, formatDistanceToNow } from 'date-fns';
import {
  Building2,
  Users,
  Calendar,
  Utensils,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  ExternalLink,
  Plane,
  Activity,
  Bell,
  Clock,
  MoreHorizontal,
  ChevronRight,
  Sparkles,
  Zap,
  Eye,
} from 'lucide-react';

// KPI Card Component
function KPICard({ 
  title, 
  value, 
  trend, 
  trendLabel, 
  icon: Icon, 
  onClick,
  loading,
  variant = 'default',
}: { 
  title: string; 
  value: string | number; 
  trend?: number; 
  trendLabel?: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
  loading?: boolean;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}) {
  const variantStyles = {
    default: 'bg-card',
    primary: 'bg-primary/5 border-primary/20',
    success: 'bg-success/5 border-success/20',
    warning: 'bg-warning/5 border-warning/20',
  };

  const iconStyles = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
  };

  return (
    <Card 
      className={`${variantStyles[variant]} cursor-pointer hover:shadow-md transition-all duration-200 group`}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-3xl font-bold tracking-tight">{value}</p>
            )}
            {trend !== undefined && !loading && (
              <div className="flex items-center gap-1 mt-1">
                <span className={`text-xs font-medium ${trend >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {trend >= 0 ? '+' : ''}{trend}%
                </span>
                <span className="text-xs text-muted-foreground">{trendLabel || 'vs last week'}</span>
              </div>
            )}
          </div>
          <div className={`p-2.5 rounded-xl bg-muted/50 group-hover:bg-muted transition-colors ${iconStyles[variant]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        {onClick && (
          <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground group-hover:text-primary transition-colors">
            <span>View details</span>
            <ArrowUpRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Severity Badge Component
function SeverityBadge({ level }: { level: 'P0' | 'P1' | 'P2' | 'info' }) {
  const styles = {
    P0: 'bg-destructive/15 text-destructive border-destructive/30',
    P1: 'bg-warning/15 text-warning border-warning/30',
    P2: 'bg-info/15 text-info border-info/30',
    info: 'bg-muted text-muted-foreground',
  };

  return (
    <Badge variant="outline" className={`text-[10px] font-bold ${styles[level]}`}>
      {level}
    </Badge>
  );
}

// Resort Health Card Component
function ResortHealthCard({ 
  resort,
  metrics,
  onClick,
}: { 
  resort: { id: string; name: string; code: string; subscription_tier: string; is_demo: boolean };
  metrics: { guests: number; prearrivalRate: number; health: 'good' | 'warning' | 'critical' };
  onClick: () => void;
}) {
  const tierInfo = getTierInfo((resort.subscription_tier || 'ESSENTIAL') as SubscriptionTier);
  
  const healthColors = {
    good: 'bg-success',
    warning: 'bg-warning',
    critical: 'bg-destructive',
  };

  return (
    <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">{resort.name}</h4>
              {resort.is_demo && (
                <Badge variant="outline" className="text-[9px] px-1">DEMO</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={`${tierInfo.color} text-[10px] px-1.5`}>
                {tierInfo.name}
              </Badge>
            </div>
          </div>
          <div className={`h-3 w-3 rounded-full ${healthColors[metrics.health]} animate-pulse`} />
        </div>
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Guests</p>
            <p className="font-semibold">{metrics.guests}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pre-arrival</p>
            <p className="font-semibold">{metrics.prearrivalRate}%</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
          <Button variant="ghost" size="sm" className="h-7 text-xs flex-1">
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs flex-1">
            <ExternalLink className="h-3 w-3 mr-1" />
            Staff
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CommandCenter() {
  const navigate = useNavigate();
  const { resorts, setCurrentResort } = useResort();
  const [includeDemos, setIncludeDemos] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  // Platform KPIs
  const { data: kpis, isLoading: loadingKPIs } = useQuery({
    queryKey: ['command-center-kpis', today, includeDemos],
    queryFn: async () => {
      const activeResorts = includeDemos 
        ? resorts 
        : resorts.filter(r => r.status === 'ACTIVE' && !r.is_demo);
      const resortIds = activeResorts.map(r => r.id);

      if (resortIds.length === 0) {
        return {
          activeResorts: 0,
          guestsInHouse: 0,
          upcomingArrivals: 0,
          activityPax: 0,
          diningCovers: 0,
          prearrivalRate: 0,
          errors24h: 0,
        };
      }

      // Guests in house
      const { count: guestsInHouse } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .in('resort_id', resortIds)
        .lte('check_in_date', today)
        .gte('check_out_date', today);

      // Upcoming arrivals (next 72h)
      const threeDaysLater = format(new Date(Date.now() + 72 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const { count: upcomingArrivals } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .in('resort_id', resortIds)
        .gt('check_in_date', today)
        .lte('check_in_date', threeDaysLater);

      // Today's activity pax
      const { data: todaySessions } = await supabase
        .from('activity_sessions')
        .select('id')
        .in('resort_id', resortIds)
        .eq('date', today)
        .eq('status', 'SCHEDULED');

      let activityPax = 0;
      if (todaySessions && todaySessions.length > 0) {
        const sessionIds = todaySessions.map(s => s.id);
        const { data: activityBookings } = await supabase
          .from('activity_bookings')
          .select('num_adults, num_children')
          .in('session_id', sessionIds)
          .eq('status', 'CONFIRMED');
        
        activityPax = activityBookings?.reduce(
          (sum, b) => sum + (b.num_adults || 0) + (b.num_children || 0),
          0
        ) || 0;
      }

      // Today's dining covers
      const { data: todaySlots } = await supabase
        .from('restaurant_time_slots')
        .select('id')
        .in('resort_id', resortIds)
        .eq('date', today);

      let diningCovers = 0;
      if (todaySlots && todaySlots.length > 0) {
        const slotIds = todaySlots.map(s => s.id);
        const { data: reservations } = await supabase
          .from('restaurant_reservations')
          .select('num_adults, num_children')
          .in('restaurant_slot_id', slotIds)
          .eq('status', 'CONFIRMED');
        
        diningCovers = reservations?.reduce(
          (sum, r) => sum + (r.num_adults || 0) + (r.num_children || 0),
          0
        ) || 0;
      }

      // Pre-arrival completion rate
      const { count: totalPrearrival } = await supabase
        .from('prearrival_profiles')
        .select('*', { count: 'exact', head: true })
        .in('resort_id', resortIds);

      const { count: completedPrearrival } = await supabase
        .from('prearrival_profiles')
        .select('*', { count: 'exact', head: true })
        .in('resort_id', resortIds)
        .eq('prearrival_status', 'completed');

      const prearrivalRate = totalPrearrival && totalPrearrival > 0
        ? Math.round((completedPrearrival || 0) / totalPrearrival * 100)
        : 0;

      return {
        activeResorts: activeResorts.length,
        guestsInHouse: guestsInHouse || 0,
        upcomingArrivals: upcomingArrivals || 0,
        activityPax,
        diningCovers,
        prearrivalRate,
        errors24h: 0, // Placeholder - would need error logging table
      };
    },
  });

  // Attention Required Issues
  const { data: attentionItems, isLoading: loadingAttention } = useQuery({
    queryKey: ['command-center-attention', resorts.map(r => r.id)],
    queryFn: async () => {
      const issues: { id: string; severity: 'P0' | 'P1' | 'P2'; title: string; description: string; resort?: string; resortId?: string; action?: string }[] = [];
      const activeResorts = resorts.filter(r => r.status === 'ACTIVE');

      for (const resort of activeResorts) {
        // Check for activities without sessions
        const { count: activityCount } = await supabase
          .from('activities')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id)
          .eq('is_active', true);

        const { count: sessionCount } = await supabase
          .from('activity_sessions')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id)
          .gte('date', today);

        if (activityCount && activityCount > 0 && (!sessionCount || sessionCount === 0)) {
          issues.push({
            id: `no-sessions-${resort.id}`,
            severity: 'P1',
            title: 'No upcoming activity sessions',
            description: `${activityCount} activities exist but no sessions scheduled`,
            resort: resort.name,
            resortId: resort.id,
            action: 'Create sessions',
          });
        }

        // Check for restaurants without slots
        const { count: restaurantCount } = await supabase
          .from('restaurants')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id)
          .eq('is_active', true);

        const { count: slotCount } = await supabase
          .from('restaurant_time_slots')
          .select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id)
          .gte('date', today);

        if (restaurantCount && restaurantCount > 0 && (!slotCount || slotCount === 0)) {
          issues.push({
            id: `no-slots-${resort.id}`,
            severity: 'P1',
            title: 'No upcoming dining slots',
            description: `${restaurantCount} restaurants exist but no slots available`,
            resort: resort.name,
            resortId: resort.id,
            action: 'Create slots',
          });
        }

      }

      return issues.sort((a, b) => {
        const severityOrder = { P0: 0, P1: 1, P2: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });
    },
    enabled: resorts.length > 0,
  });

  // Activity Timeline
  const { data: activityTimeline, isLoading: loadingTimeline } = useQuery({
    queryKey: ['command-center-timeline'],
    queryFn: async () => {
      const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      
      // Get recent admin audit logs
      const { data: auditLogs } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .gte('created_at', yesterday)
        .order('created_at', { ascending: false })
        .limit(20);

      return (auditLogs || []).map(log => ({
        id: log.id,
        action: log.action,
        timestamp: log.created_at,
        resortId: log.resort_id,
        metadata: log.metadata_json,
      }));
    },
  });

  // Resort metrics for grid
  const { data: resortMetrics, isLoading: loadingResorts } = useQuery({
    queryKey: ['command-center-resorts', today],
    queryFn: async () => {
      const metrics = await Promise.all(
        resorts.slice(0, 12).map(async (resort) => {
          const { count: guests } = await supabase
            .from('guests')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .lte('check_in_date', today)
            .gte('check_out_date', today);

          const { count: totalPrearrival } = await supabase
            .from('prearrival_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id);

          const { count: completedPrearrival } = await supabase
            .from('prearrival_profiles')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .eq('prearrival_status', 'completed');

          const prearrivalRate = totalPrearrival && totalPrearrival > 0
            ? Math.round((completedPrearrival || 0) / totalPrearrival * 100)
            : 0;

          // Determine health based on configuration
          const { count: sessionCount } = await supabase
            .from('activity_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .gte('date', today);

          const { count: slotCount } = await supabase
            .from('restaurant_time_slots')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .gte('date', today);

          let health: 'good' | 'warning' | 'critical' = 'good';
          if (!sessionCount && !slotCount) health = 'critical';
          else if (!sessionCount || !slotCount) health = 'warning';

          return {
            resortId: resort.id,
            guests: guests || 0,
            prearrivalRate,
            health,
          };
        })
      );

      return metrics.reduce((acc, m) => {
        acc[m.resortId] = { guests: m.guests, prearrivalRate: m.prearrivalRate, health: m.health };
        return acc;
      }, {} as Record<string, { guests: number; prearrivalRate: number; health: 'good' | 'warning' | 'critical' }>);
    },
    enabled: resorts.length > 0,
  });

  const handleResortClick = (resortId: string) => {
    navigate(`/superadmin/resorts/${resortId}`);
  };

  const handleSwitchToResort = (resortId: string) => {
    const resort = resorts.find(r => r.id === resortId);
    if (resort) {
      setCurrentResort(resort);
      navigate('/staff/dashboard');
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      update_resort_plan: 'Plan updated',
      remove_staff_access: 'Staff removed',
      create_resort: 'Resort created',
      update_branding: 'Branding updated',
      create_activity: 'Activity created',
      create_session: 'Session created',
    };
    return labels[action] || action.replace(/_/g, ' ');
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Command Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Platform overview and global controls
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch 
              id="include-demos" 
              checked={includeDemos} 
              onCheckedChange={setIncludeDemos} 
            />
            <Label htmlFor="include-demos" className="text-sm text-muted-foreground cursor-pointer">
              Include demos
            </Label>
          </div>
          <Button onClick={() => navigate('/superadmin/resorts')}>
            <Building2 className="h-4 w-4 mr-2" />
            All Resorts
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <KPICard
          title="Active Resorts"
          value={kpis?.activeResorts || 0}
          icon={Building2}
          loading={loadingKPIs}
          variant="primary"
          onClick={() => navigate('/superadmin/resorts')}
        />
        <KPICard
          title="Guests In-House"
          value={kpis?.guestsInHouse || 0}
          icon={Users}
          loading={loadingKPIs}
          onClick={() => navigate('/superadmin/resorts')}
        />
        <KPICard
          title="Arrivals (72h)"
          value={kpis?.upcomingArrivals || 0}
          icon={Plane}
          loading={loadingKPIs}
        />
        <KPICard
          title="Activity Pax"
          value={kpis?.activityPax || 0}
          icon={Calendar}
          loading={loadingKPIs}
          variant="success"
        />
        <KPICard
          title="Dining Covers"
          value={kpis?.diningCovers || 0}
          icon={Utensils}
          loading={loadingKPIs}
          variant="warning"
        />
        <KPICard
          title="Pre-arrival %"
          value={`${kpis?.prearrivalRate || 0}%`}
          icon={CheckCircle2}
          loading={loadingKPIs}
        />
        <KPICard
          title="Errors (24h)"
          value={kpis?.errors24h || 0}
          icon={AlertCircle}
          loading={loadingKPIs}
          onClick={() => navigate('/superadmin/health')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Attention Required Panel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <CardTitle>Attention Required</CardTitle>
              </div>
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                {attentionItems?.length || 0} issues
              </Badge>
            </div>
            <CardDescription>Issues that need your attention</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAttention ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : attentionItems && attentionItems.length > 0 ? (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {attentionItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <SeverityBadge level={item.severity} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        {item.resort && (
                          <Badge variant="outline" className="mt-2 text-[10px]">
                            {item.resort}
                          </Badge>
                        )}
                      </div>
                      {item.action && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="shrink-0"
                          onClick={() => item.resortId && handleResortClick(item.resortId)}
                        >
                          {item.action}
                          <ChevronRight className="h-3 w-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-success/50 mb-3" />
                <p className="font-medium">All clear!</p>
                <p className="text-sm text-muted-foreground">No issues requiring attention</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Timeline */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Activity Feed</CardTitle>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/superadmin/audit')}>
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTimeline ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : activityTimeline && activityTimeline.length > 0 ? (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {activityTimeline.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 text-sm"
                    >
                      <div className="h-2 w-2 rounded-full bg-primary mt-2 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{getActionLabel(item.action)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Resort Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Resort Portfolio</h2>
          </div>
          <Button variant="outline" onClick={() => navigate('/superadmin/resorts')}>
            View all
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {loadingResorts ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40 w-full" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {resorts.slice(0, 8).map((resort) => {
              const metrics = resortMetrics?.[resort.id] || { guests: 0, prearrivalRate: 0, health: 'good' as const };
              return (
                <ResortHealthCard
                  key={resort.id}
                  resort={resort}
                  metrics={metrics}
                  onClick={() => handleResortClick(resort.id)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
