import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { getTierInfo, SubscriptionTier } from '@/lib/tier-features';
import { format, formatDistanceToNow } from 'date-fns';
import { ActionQueue } from '@/components/superadmin/ActionQueue';
import { ResortDrawer } from '@/components/superadmin/ResortDrawer';
import { RolloutsPanel } from '@/components/superadmin/RolloutsPanel';
import { ErrorExplorer } from '@/components/superadmin/ErrorExplorer';
import { FounderControls } from '@/components/superadmin/FounderControls';
import { SecurityAuditPanel } from '@/components/superadmin/SecurityAuditPanel';
import { SystemHeartbeat } from '@/components/superadmin/SystemHeartbeat';
import { BentoKPICard } from '@/components/superadmin/BentoKPICard';
import { BentoGrid } from '@/components/superadmin/BentoGrid';
import { MissionControlHeader } from '@/components/superadmin/MissionControlHeader';
import { usePlatformActivityRealtime, EVENT_TYPE_CONFIG } from '@/hooks/usePlatformActivity';
import { useErrorCount24h } from '@/hooks/usePlatformErrors';
import { useActionQueueDetectors } from '@/hooks/useActionQueueDetectors';
import { toast } from 'sonner';
import {
  Building2, Users, Calendar, Utensils, AlertCircle,
  CheckCircle2, Plane, Activity, Clock, ChevronRight, Zap, Eye, Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Write Mode Context
export interface WriteModeState {
  enabled: boolean;
  expiresAt: Date | null;
}

// Resort Health Card - Glassmorphism style
function ResortHealthCard({ resort, metrics, onClick }: { 
  resort: { id: string; name: string; code: string; subscription_tier: string; is_demo: boolean };
  metrics: { guests: number; prearrivalRate: number; health: 'good' | 'warning' | 'critical'; sessions: number; covers: number };
  onClick: () => void;
}) {
  const tierInfo = getTierInfo((resort.subscription_tier || 'ESSENTIAL') as SubscriptionTier);
  const healthColors = { 
    good: 'bg-success', 
    warning: 'bg-warning', 
    critical: 'bg-destructive' 
  };
  
  return (
    <Card 
      className={cn(
        'group relative overflow-hidden cursor-pointer',
        'bg-card/60 backdrop-blur-sm border-border/30',
        'hover:bg-card/80 hover:shadow-lg hover:scale-[1.02]',
        'transition-all duration-300 ease-out',
        'active:scale-[0.98]'
      )} 
      onClick={onClick}
    >
      {/* Subtle gradient overlay on hover */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'radial-gradient(circle at 50% 0%, hsl(var(--primary)/0.05), transparent 70%)',
        }}
      />
      
      <CardContent className="p-4 relative">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm tracking-[-0.01em]">{resort.name}</h4>
              {resort.is_demo && (
                <Badge variant="outline" className="text-[9px] px-1.5 bg-muted/50">
                  DEMO
                </Badge>
              )}
            </div>
            <Badge className={`${tierInfo.color} text-[10px] px-1.5 mt-1.5`}>
              {tierInfo.name}
            </Badge>
          </div>
          <div className="relative flex h-3 w-3">
            {metrics.health !== 'good' && (
              <span className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                healthColors[metrics.health]
              )} />
            )}
            <span className={cn(
              'relative inline-flex h-3 w-3 rounded-full',
              healthColors[metrics.health]
            )} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Guests</p>
            <p className="font-semibold">{metrics.guests}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Sessions</p>
            <p className="font-semibold">{metrics.sessions}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Pre-arr</p>
            <p className="font-semibold">{metrics.prearrivalRate}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Generate mock sparkline data for demo purposes
function generateSparklineData(baseValue: number, variance: number = 0.2): number[] {
  const data: number[] = [];
  let current = baseValue;
  for (let i = 0; i < 24; i++) {
    const change = (Math.random() - 0.5) * variance * baseValue;
    current = Math.max(0, current + change);
    data.push(Math.round(current));
  }
  return data;
}

export default function CommandCenter() {
  const navigate = useNavigate();
  const { resorts, setCurrentResort } = useResort();
  const [mode, setMode] = useState<'pulse' | 'control' | 'investigate' | 'security'>('pulse');
  const [includeDemos, setIncludeDemos] = useState(false);
  const [selectedResort, setSelectedResort] = useState<typeof resorts[0] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [actionQueueFilter, setActionQueueFilter] = useState<'all' | 'P0'>('all');
  const today = new Date().toISOString().split('T')[0];

  // Write Mode State
  const [writeMode, setWriteMode] = useState(false);
  const [writeModeExpiry, setWriteModeExpiry] = useState<Date | null>(null);
  const [showWriteModeConfirm, setShowWriteModeConfirm] = useState(false);

  // Auto-disable write mode after 10 minutes
  useEffect(() => {
    if (writeMode) {
      const expiry = new Date(Date.now() + 10 * 60 * 1000);
      setWriteModeExpiry(expiry);
      const timer = setTimeout(() => {
        setWriteMode(false);
        setWriteModeExpiry(null);
        toast.info('Write Mode automatically disabled after 10 minutes');
      }, 10 * 60 * 1000);
      return () => clearTimeout(timer);
    } else {
      setWriteModeExpiry(null);
    }
  }, [writeMode]);

  const handleEnableWriteMode = () => {
    setWriteMode(true);
    setShowWriteModeConfirm(false);
    toast.success('Write Mode enabled for 10 minutes');
  };

  const handleDisableWriteMode = () => {
    setWriteMode(false);
    toast.info('Write Mode disabled');
  };

  // Get resort IDs for queries
  const activeResorts = includeDemos ? resorts : resorts.filter(r => r.status === 'ACTIVE' && !r.is_demo);
  const resortIds = activeResorts.map(r => r.id);

  // Real-time activity feed
  const { events: activityEvents, isLoading: loadingActivity } = usePlatformActivityRealtime(undefined, resorts);

  // Real error count
  const { data: errorCount24h } = useErrorCount24h(resortIds);

  // Expanded Action Queue Detectors
  const { data: detectedItems, isLoading: loadingDetectors } = useActionQueueDetectors(resorts);

  // Platform KPIs
  const { data: kpis, isLoading: loadingKPIs } = useQuery({
    queryKey: ['command-center-kpis', today, includeDemos],
    queryFn: async () => {
      if (resortIds.length === 0) return { activeResorts: 0, guestsInHouse: 0, upcomingArrivals: 0, activityPax: 0, diningCovers: 0, prearrivalRate: 0 };

      const { count: guestsInHouse } = await supabase.from('guests').select('*', { count: 'exact', head: true }).in('resort_id', resortIds).lte('check_in_date', today).gte('check_out_date', today);
      const threeDaysLater = format(new Date(Date.now() + 72 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const { count: upcomingArrivals } = await supabase.from('guests').select('*', { count: 'exact', head: true }).in('resort_id', resortIds).gt('check_in_date', today).lte('check_in_date', threeDaysLater);
      const { count: totalPrearrival } = await supabase.from('prearrival_profiles').select('*', { count: 'exact', head: true }).in('resort_id', resortIds);
      const { count: completedPrearrival } = await supabase.from('prearrival_profiles').select('*', { count: 'exact', head: true }).in('resort_id', resortIds).eq('prearrival_status', 'completed');
      const prearrivalRate = totalPrearrival && totalPrearrival > 0 ? Math.round((completedPrearrival || 0) / totalPrearrival * 100) : 0;

      // Real activity pax for today
      const { data: activityBookings } = await supabase
        .from('activity_bookings')
        .select('num_adults, num_children, session:activity_sessions!inner(date)')
        .in('resort_id', resortIds)
        .eq('status', 'CONFIRMED');
      
      const activityPax = activityBookings?.filter((b: any) => b.session?.date === today)
        .reduce((sum: number, b: any) => sum + (b.num_adults || 0) + (b.num_children || 0), 0) || 0;

      // Real dining covers for today
      const { data: diningReservations } = await supabase
        .from('restaurant_reservations')
        .select('num_adults, num_children, slot:restaurant_time_slots!inner(date)')
        .in('resort_id', resortIds)
        .eq('status', 'CONFIRMED');
      
      const diningCovers = diningReservations?.filter((r: any) => r.slot?.date === today)
        .reduce((sum: number, r: any) => sum + (r.num_adults || 0) + (r.num_children || 0), 0) || 0;

      return { activeResorts: activeResorts.length, guestsInHouse: guestsInHouse || 0, upcomingArrivals: upcomingArrivals || 0, activityPax, diningCovers, prearrivalRate };
    },
  });

  // Generate sparkline data (memoized to prevent re-renders)
  const sparklines = useMemo(() => ({
    resorts: generateSparklineData(kpis?.activeResorts || 3, 0.1),
    guests: generateSparklineData(kpis?.guestsInHouse || 50, 0.15),
    arrivals: generateSparklineData(kpis?.upcomingArrivals || 20, 0.25),
    activities: generateSparklineData(kpis?.activityPax || 30, 0.2),
    covers: generateSparklineData(kpis?.diningCovers || 40, 0.2),
    prearrival: generateSparklineData(kpis?.prearrivalRate || 65, 0.1),
    errors: generateSparklineData(errorCount24h || 2, 0.5),
  }), [kpis, errorCount24h]);

  // Use detected items from hook, with filter support
  const actionItems = (detectedItems || []).filter(item => 
    actionQueueFilter === 'all' || item.severity === actionQueueFilter
  );

  // Resort metrics
  const { data: resortMetrics, isLoading: loadingResorts } = useQuery({
    queryKey: ['command-center-resorts', today],
    queryFn: async () => {
      const metrics = await Promise.all(resorts.slice(0, 12).map(async (resort) => {
        const { count: guests } = await supabase.from('guests').select('*', { count: 'exact', head: true }).eq('resort_id', resort.id).lte('check_in_date', today).gte('check_out_date', today);
        const { count: sessions } = await supabase.from('activity_sessions').select('*', { count: 'exact', head: true }).eq('resort_id', resort.id).eq('date', today);
        const { count: totalPrearrival } = await supabase.from('prearrival_profiles').select('*', { count: 'exact', head: true }).eq('resort_id', resort.id);
        const { count: completedPrearrival } = await supabase.from('prearrival_profiles').select('*', { count: 'exact', head: true }).eq('resort_id', resort.id).eq('prearrival_status', 'completed');
        const prearrivalRate = totalPrearrival && totalPrearrival > 0 ? Math.round((completedPrearrival || 0) / totalPrearrival * 100) : 0;
        const { count: slotCount } = await supabase.from('restaurant_time_slots').select('*', { count: 'exact', head: true }).eq('resort_id', resort.id).gte('date', today);
        let health: 'good' | 'warning' | 'critical' = 'good';
        if (!sessions && !slotCount) health = 'critical';
        else if (!sessions || !slotCount) health = 'warning';
        return { resortId: resort.id, guests: guests || 0, sessions: sessions || 0, covers: 0, prearrivalRate, health };
      }));
      return metrics.reduce((acc, m) => { acc[m.resortId] = m; return acc; }, {} as Record<string, typeof metrics[0]>);
    },
    enabled: resorts.length > 0,
  });

  const handleResortClick = (resort: typeof resorts[0]) => { 
    setSelectedResort(resort); 
    setDrawerOpen(true); 
  };

  // Handle saved view navigation from FounderControls
  const handleSavedViewChange = (viewId: string) => {
    if (viewId === 'p0-incidents') {
      setMode('pulse');
      setActionQueueFilter('P0');
    } else if (viewId === 'top-resorts') {
      navigate('/superadmin/resorts?sort=health');
    } else if (viewId === 'arrivals-72h') {
      navigate('/superadmin/guests?filter=arrivals-72h');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* System Heartbeat - Platform Health */}
      <SystemHeartbeat />

      {/* Mission Control Header */}
      <MissionControlHeader
        mode={mode}
        onModeChange={setMode}
        includeDemos={includeDemos}
        onIncludeDemosChange={setIncludeDemos}
        writeMode={writeMode}
        writeModeExpiry={writeModeExpiry}
        onEnableWriteMode={handleEnableWriteMode}
        onDisableWriteMode={handleDisableWriteMode}
        showWriteModeConfirm={showWriteModeConfirm}
        onShowWriteModeConfirmChange={setShowWriteModeConfirm}
      />

      {/* Bento KPI Grid */}
      <BentoGrid>
        <BentoKPICard 
          title="Resorts" 
          value={kpis?.activeResorts || 0} 
          icon={Building2} 
          loading={loadingKPIs} 
          variant="primary"
          trend={{ value: 12, label: 'vs last month' }}
          sparklineData={sparklines.resorts}
          onClick={() => navigate('/superadmin/resorts')} 
        />
        <BentoKPICard 
          title="In-House" 
          value={kpis?.guestsInHouse || 0} 
          icon={Users} 
          loading={loadingKPIs}
          trend={{ value: 8, label: 'vs yesterday' }}
          sparklineData={sparklines.guests}
        />
        <BentoKPICard 
          title="Arrivals 72h" 
          value={kpis?.upcomingArrivals || 0} 
          icon={Plane} 
          loading={loadingKPIs}
          trend={{ value: -3, label: 'vs last week' }}
          sparklineData={sparklines.arrivals}
        />
        <BentoKPICard 
          title="Activity Pax" 
          value={kpis?.activityPax || 0} 
          icon={Calendar} 
          loading={loadingKPIs} 
          variant="success"
          trend={{ value: 15, label: 'vs yesterday' }}
          sparklineData={sparklines.activities}
        />
        <BentoKPICard 
          title="Covers" 
          value={kpis?.diningCovers || 0} 
          icon={Utensils} 
          loading={loadingKPIs} 
          variant="warning"
          trend={{ value: 5, label: 'vs yesterday' }}
          sparklineData={sparklines.covers}
        />
        <BentoKPICard 
          title="Pre-arrival" 
          value={`${kpis?.prearrivalRate || 0}%`} 
          icon={CheckCircle2} 
          loading={loadingKPIs}
          trend={{ value: 2, label: 'completion rate' }}
          sparklineData={sparklines.prearrival}
        />
        <BentoKPICard 
          title="Errors 24h" 
          value={errorCount24h || 0} 
          icon={AlertCircle} 
          loading={false}
          variant={errorCount24h && errorCount24h > 5 ? 'warning' : 'default'}
          trend={{ value: errorCount24h && errorCount24h > 0 ? -20 : 0, label: 'vs yesterday' }}
          sparklineData={sparklines.errors}
          onClick={() => setMode('investigate')} 
        />
      </BentoGrid>

      {/* Mode Content */}
      {mode === 'pulse' && (
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-6">
            <ActionQueue 
              items={actionItems} 
              loading={loadingDetectors} 
              filter={actionQueueFilter}
              onFilterChange={setActionQueueFilter}
            />
            
            {/* Real Activity Feed - Glassmorphism */}
            <Card className="bg-card/60 backdrop-blur-sm border-border/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-muted/50">
                    <Activity className="h-4 w-4" />
                  </div>
                  Activity Feed
                  {activityEvents.length > 0 && (
                    <Badge variant="outline" className="ml-auto text-xs bg-muted/50">
                      {activityEvents.length} events
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingActivity ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : activityEvents.length > 0 ? (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {activityEvents.slice(0, 20).map((event) => {
                        const config = EVENT_TYPE_CONFIG[event.event_type] || { label: event.event_type, icon: Activity, color: 'text-muted-foreground' };
                        const EventIcon = config.icon;
                        return (
                          <div 
                            key={event.id} 
                            className="flex items-start gap-3 p-3 bg-muted/20 rounded-xl border border-border/20 hover:bg-muted/30 transition-colors"
                          >
                            <div className={`p-1.5 rounded-lg bg-muted/50 ${config.color}`}>
                              <EventIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium tracking-[-0.01em]">{config.label}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {event.actor_name && <span>{event.actor_name}</span>}
                                {event.target_name && <span> → {event.target_name}</span>}
                              </p>
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                                {event.resort_name && (
                                  <>
                                    <span>•</span>
                                    <Building2 className="h-3 w-3" />
                                    <span>{event.resort_name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <Clock className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">Recent activity will appear here</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <FounderControls resortIds={resortIds} onViewChange={handleSavedViewChange} />
          </div>
        </div>
      )}

      {mode === 'control' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <RolloutsPanel writeMode={writeMode} />
          <Card className="bg-card/60 backdrop-blur-sm border-border/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                  <Zap className="h-4 w-4" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/superadmin/feature-flags')}>
                <Settings className="h-4 w-4 mr-2" />
                Manage Feature Flags
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/superadmin/users')}>
                <Users className="h-4 w-4 mr-2" />
                Invite Staff
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/superadmin/support')}>
                <Eye className="h-4 w-4 mr-2" />
                Support Mode
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {mode === 'investigate' && (
        <ErrorExplorer onResortClick={(resortId) => {
          const resort = resorts.find(r => r.id === resortId);
          if (resort) handleResortClick(resort);
        }} />
      )}

      {mode === 'security' && (
        <SecurityAuditPanel />
      )}

      {/* Resort Grid - Glassmorphism */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold tracking-[-0.01em] flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-muted/50">
              <Building2 className="h-4 w-4" />
            </div>
            Resort Portfolio
          </h2>
          <Button variant="outline" size="sm" onClick={() => navigate('/superadmin/resorts')}>
            View all
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
        {loadingResorts ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {resorts.slice(0, 8).map((resort) => {
              const metrics = resortMetrics?.[resort.id] || { guests: 0, prearrivalRate: 0, health: 'good' as const, sessions: 0, covers: 0 };
              return (
                <ResortHealthCard 
                  key={resort.id} 
                  resort={resort} 
                  metrics={metrics} 
                  onClick={() => handleResortClick(resort)} 
                />
              );
            })}
          </div>
        )}
      </div>

      <ResortDrawer 
        resort={selectedResort} 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen}
        writeMode={writeMode}
      />
    </div>
  );
}
