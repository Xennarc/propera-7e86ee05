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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { getTierInfo, SubscriptionTier } from '@/lib/tier-features';
import { format, subDays, formatDistanceToNow } from 'date-fns';
import { ActionQueue, ActionQueueItem } from '@/components/superadmin/ActionQueue';
import { ResortDrawer } from '@/components/superadmin/ResortDrawer';
import { RolloutsPanel } from '@/components/superadmin/RolloutsPanel';
import { ErrorExplorer } from '@/components/superadmin/ErrorExplorer';
import { FounderControls } from '@/components/superadmin/FounderControls';
import {
  Building2, Users, Calendar, Utensils, TrendingUp, AlertTriangle, AlertCircle,
  CheckCircle2, ArrowUpRight, ExternalLink, Plane, Activity, Bell, Clock,
  ChevronRight, Sparkles, Zap, Eye, Radio, Settings, Search, BarChart3,
} from 'lucide-react';

// KPI Card Component
function KPICard({ title, value, icon: Icon, onClick, loading, variant = 'default' }: { 
  title: string; value: string | number; icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void; loading?: boolean; variant?: 'default' | 'primary' | 'success' | 'warning';
}) {
  const variantStyles = { default: 'bg-card', primary: 'bg-primary/5 border-primary/20', success: 'bg-success/5 border-success/20', warning: 'bg-warning/5 border-warning/20' };
  const iconStyles = { default: 'text-muted-foreground', primary: 'text-primary', success: 'text-success', warning: 'text-warning' };
  return (
    <Card className={`${variantStyles[variant]} cursor-pointer hover:shadow-md transition-all duration-200 group`} onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
            {loading ? <Skeleton className="h-7 w-16" /> : <p className="text-2xl font-bold tracking-tight">{value}</p>}
          </div>
          <div className={`p-2 rounded-xl bg-muted/50 ${iconStyles[variant]}`}><Icon className="h-4 w-4" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

// Resort Health Card
function ResortHealthCard({ resort, metrics, onClick }: { 
  resort: { id: string; name: string; code: string; subscription_tier: string; is_demo: boolean };
  metrics: { guests: number; prearrivalRate: number; health: 'good' | 'warning' | 'critical'; sessions: number; covers: number };
  onClick: () => void;
}) {
  const tierInfo = getTierInfo((resort.subscription_tier || 'ESSENTIAL') as SubscriptionTier);
  const healthColors = { good: 'bg-success', warning: 'bg-warning', critical: 'bg-destructive' };
  return (
    <Card className="hover:shadow-md transition-all duration-200 cursor-pointer group" onClick={onClick}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm">{resort.name}</h4>
              {resort.is_demo && <Badge variant="outline" className="text-[9px] px-1">DEMO</Badge>}
            </div>
            <Badge className={`${tierInfo.color} text-[10px] px-1.5 mt-1`}>{tierInfo.name}</Badge>
          </div>
          <div className={`h-3 w-3 rounded-full ${healthColors[metrics.health]} ${metrics.health !== 'good' ? 'animate-pulse' : ''}`} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div><p className="text-muted-foreground">Guests</p><p className="font-semibold">{metrics.guests}</p></div>
          <div><p className="text-muted-foreground">Sessions</p><p className="font-semibold">{metrics.sessions}</p></div>
          <div><p className="text-muted-foreground">Pre-arr</p><p className="font-semibold">{metrics.prearrivalRate}%</p></div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CommandCenter() {
  const navigate = useNavigate();
  const { resorts, setCurrentResort } = useResort();
  const [mode, setMode] = useState<'pulse' | 'control' | 'investigate'>('pulse');
  const [includeDemos, setIncludeDemos] = useState(false);
  const [selectedResort, setSelectedResort] = useState<typeof resorts[0] | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  // Platform KPIs
  const { data: kpis, isLoading: loadingKPIs } = useQuery({
    queryKey: ['command-center-kpis', today, includeDemos],
    queryFn: async () => {
      const activeResorts = includeDemos ? resorts : resorts.filter(r => r.status === 'ACTIVE' && !r.is_demo);
      const resortIds = activeResorts.map(r => r.id);
      if (resortIds.length === 0) return { activeResorts: 0, guestsInHouse: 0, upcomingArrivals: 0, activityPax: 0, diningCovers: 0, prearrivalRate: 0, errors24h: 0 };

      const { count: guestsInHouse } = await supabase.from('guests').select('*', { count: 'exact', head: true }).in('resort_id', resortIds).lte('check_in_date', today).gte('check_out_date', today);
      const threeDaysLater = format(new Date(Date.now() + 72 * 60 * 60 * 1000), 'yyyy-MM-dd');
      const { count: upcomingArrivals } = await supabase.from('guests').select('*', { count: 'exact', head: true }).in('resort_id', resortIds).gt('check_in_date', today).lte('check_in_date', threeDaysLater);
      const { count: totalPrearrival } = await supabase.from('prearrival_profiles').select('*', { count: 'exact', head: true }).in('resort_id', resortIds);
      const { count: completedPrearrival } = await supabase.from('prearrival_profiles').select('*', { count: 'exact', head: true }).in('resort_id', resortIds).eq('prearrival_status', 'completed');
      const prearrivalRate = totalPrearrival && totalPrearrival > 0 ? Math.round((completedPrearrival || 0) / totalPrearrival * 100) : 0;

      return { activeResorts: activeResorts.length, guestsInHouse: guestsInHouse || 0, upcomingArrivals: upcomingArrivals || 0, activityPax: 0, diningCovers: 0, prearrivalRate, errors24h: 0 };
    },
  });

  // Action Queue Items
  const { data: actionItems, isLoading: loadingActions } = useQuery({
    queryKey: ['command-center-actions', resorts.map(r => r.id)],
    queryFn: async () => {
      const items: ActionQueueItem[] = [];
      const activeResorts = resorts.filter(r => r.status === 'ACTIVE');
      for (const resort of activeResorts) {
        const { count: activityCount } = await supabase.from('activities').select('*', { count: 'exact', head: true }).eq('resort_id', resort.id).eq('is_active', true);
        const { count: sessionCount } = await supabase.from('activity_sessions').select('*', { count: 'exact', head: true }).eq('resort_id', resort.id).gte('date', today);
        if (activityCount && activityCount > 0 && (!sessionCount || sessionCount === 0)) {
          items.push({ id: `no-sessions-${resort.id}`, severity: 'P1', title: 'No upcoming sessions', description: `${activityCount} activities exist but no sessions scheduled`, resort: resort.name, resortId: resort.id, category: 'config', triggeredAt: new Date(), fixAction: { label: 'Create Sessions', type: 'navigate', target: `/superadmin/resorts/${resort.id}` } });
        }
        const { count: restaurantCount } = await supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('resort_id', resort.id).eq('is_active', true);
        const { count: slotCount } = await supabase.from('restaurant_time_slots').select('*', { count: 'exact', head: true }).eq('resort_id', resort.id).gte('date', today);
        if (restaurantCount && restaurantCount > 0 && (!slotCount || slotCount === 0)) {
          items.push({ id: `no-slots-${resort.id}`, severity: 'P1', title: 'No dining slots', description: `${restaurantCount} restaurants without available slots`, resort: resort.name, resortId: resort.id, category: 'config', triggeredAt: new Date(), fixAction: { label: 'Create Slots', type: 'navigate', target: `/superadmin/resorts/${resort.id}` } });
        }
      }
      return items.sort((a, b) => { const order = { P0: 0, P1: 1, P2: 2, P3: 3 }; return order[a.severity] - order[b.severity]; });
    },
    enabled: resorts.length > 0,
  });

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

  const handleResortClick = (resort: typeof resorts[0]) => { setSelectedResort(resort); setDrawerOpen(true); };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Mode Switch */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" />Command Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform overview and global controls</p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="bg-muted/50 rounded-lg p-1">
            <TabsList className="grid grid-cols-3 gap-1 bg-transparent">
              <TabsTrigger value="pulse" className="text-xs gap-1 data-[state=active]:bg-background"><Radio className="h-3 w-3" />Pulse</TabsTrigger>
              <TabsTrigger value="control" className="text-xs gap-1 data-[state=active]:bg-background"><Settings className="h-3 w-3" />Control</TabsTrigger>
              <TabsTrigger value="investigate" className="text-xs gap-1 data-[state=active]:bg-background"><Search className="h-3 w-3" />Investigate</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Switch id="include-demos" checked={includeDemos} onCheckedChange={setIncludeDemos} />
            <Label htmlFor="include-demos" className="text-xs text-muted-foreground cursor-pointer">Demos</Label>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
        <KPICard title="Resorts" value={kpis?.activeResorts || 0} icon={Building2} loading={loadingKPIs} variant="primary" onClick={() => navigate('/superadmin/resorts')} />
        <KPICard title="In-House" value={kpis?.guestsInHouse || 0} icon={Users} loading={loadingKPIs} />
        <KPICard title="Arrivals 72h" value={kpis?.upcomingArrivals || 0} icon={Plane} loading={loadingKPIs} />
        <KPICard title="Activity Pax" value={kpis?.activityPax || 0} icon={Calendar} loading={loadingKPIs} variant="success" />
        <KPICard title="Covers" value={kpis?.diningCovers || 0} icon={Utensils} loading={loadingKPIs} variant="warning" />
        <KPICard title="Pre-arrival" value={`${kpis?.prearrivalRate || 0}%`} icon={CheckCircle2} loading={loadingKPIs} />
        <KPICard title="Errors 24h" value={kpis?.errors24h || 0} icon={AlertCircle} loading={loadingKPIs} onClick={() => navigate('/superadmin/health')} />
      </div>

      {/* Mode Content */}
      {mode === 'pulse' && (
        <div className="grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3 space-y-6">
            <ActionQueue items={actionItems || []} loading={loadingActions} />
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" />Activity Feed</CardTitle></CardHeader>
              <CardContent><div className="flex flex-col items-center justify-center py-8"><Clock className="h-10 w-10 text-muted-foreground/30 mb-2" /><p className="text-sm text-muted-foreground">Recent activity will appear here</p></div></CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <FounderControls />
          </div>
        </div>
      )}

      {mode === 'control' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <RolloutsPanel />
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Quick Actions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/superadmin/feature-flags')}><Settings className="h-4 w-4 mr-2" />Manage Feature Flags</Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/superadmin/users')}><Users className="h-4 w-4 mr-2" />Invite Staff</Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/superadmin/support')}><Eye className="h-4 w-4 mr-2" />Support Mode</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {mode === 'investigate' && (
        <ErrorExplorer />
      )}

      {/* Resort Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Building2 className="h-5 w-5" />Resort Portfolio</h2>
          <Button variant="outline" size="sm" onClick={() => navigate('/superadmin/resorts')}>View all<ChevronRight className="h-4 w-4 ml-1" /></Button>
        </div>
        {loadingResorts ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)}</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {resorts.slice(0, 8).map((resort) => {
              const metrics = resortMetrics?.[resort.id] || { guests: 0, prearrivalRate: 0, health: 'good' as const, sessions: 0, covers: 0 };
              return <ResortHealthCard key={resort.id} resort={resort} metrics={metrics} onClick={() => handleResortClick(resort)} />;
            })}
          </div>
        )}
      </div>

      <ResortDrawer resort={selectedResort} open={drawerOpen} onOpenChange={setDrawerOpen} />
    </div>
  );
}
