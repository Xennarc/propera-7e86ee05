import { useState, useEffect } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { getTierInfo, SubscriptionTier } from '@/lib/tier-features';
import { format, formatDistanceToNow } from 'date-fns';
import { ActionQueue, ActionQueueItem } from '@/components/superadmin/ActionQueue';
import { ResortDrawer } from '@/components/superadmin/ResortDrawer';
import { RolloutsPanel } from '@/components/superadmin/RolloutsPanel';
import { ErrorExplorer } from '@/components/superadmin/ErrorExplorer';
import { FounderControls } from '@/components/superadmin/FounderControls';
import { usePlatformActivityRealtime, EVENT_TYPE_CONFIG } from '@/hooks/usePlatformActivity';
import { useErrorCount24h } from '@/hooks/usePlatformErrors';
import { useActionQueueDetectors } from '@/hooks/useActionQueueDetectors';
import { toast } from 'sonner';
import {
  Building2, Users, Calendar, Utensils, TrendingUp, AlertTriangle, AlertCircle,
  CheckCircle2, ArrowUpRight, ExternalLink, Plane, Activity, Bell, Clock,
  ChevronRight, Sparkles, Zap, Eye, Radio, Settings, Search, BarChart3,
  Pencil, Shield,
} from 'lucide-react';

// Write Mode Context
export interface WriteModeState {
  enabled: boolean;
  expiresAt: Date | null;
}

// KPI Card Component
function KPICard({ title, value, icon: Icon, onClick, loading, variant = 'default' }: { 
  title: string; value: string | number; icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void; loading?: boolean; variant?: 'default' | 'primary' | 'success' | 'warning';
}) {
  const variantStyles = { default: 'bg-card', primary: 'bg-primary/5 border-primary/20', success: 'bg-success/5 border-success/20', warning: 'bg-warning/5 border-warning/20' };
  const iconStyles = { default: 'text-muted-foreground', primary: 'text-primary', success: 'text-success', warning: 'text-warning' };
  return (
    <Card className={`${variantStyles[variant]} cursor-pointer hover:shadow-md transition-all duration-200 group relative overflow-hidden`} onClick={onClick}>
      {/* Subtle pulse overlay for live data */}
      <div className="absolute inset-0 bg-primary/5 animate-pulse rounded-xl opacity-30 pointer-events-none" />
      <CardContent className="p-4 relative">
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

  const handleResortClick = (resort: typeof resorts[0]) => { setSelectedResort(resort); setDrawerOpen(true); };

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
      {/* Header with Mode Switch */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" />Command Center</h1>
          <p className="text-muted-foreground text-sm mt-1">Platform overview and global controls</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Write Mode Badge */}
          {writeMode && writeModeExpiry && (
            <Badge 
              variant="destructive" 
              className="animate-pulse cursor-pointer flex items-center gap-1.5"
              onClick={handleDisableWriteMode}
            >
              <Pencil className="h-3 w-3" />
              Write Mode ({formatDistanceToNow(writeModeExpiry)})
            </Badge>
          )}

          {/* Write Mode Toggle */}
          <AlertDialog open={showWriteModeConfirm} onOpenChange={setShowWriteModeConfirm}>
            <AlertDialogTrigger asChild>
              <Button 
                variant={writeMode ? "destructive" : "outline"} 
                size="sm" 
                className="gap-1.5"
                onClick={() => writeMode ? handleDisableWriteMode() : setShowWriteModeConfirm(true)}
              >
                <Shield className="h-4 w-4" />
                {writeMode ? 'Disable Write' : 'Write Mode'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-warning" />
                  Enable Write Mode?
                </AlertDialogTitle>
                <AlertDialogDescription className="space-y-2">
                  <p>Write Mode allows you to make real changes to resort settings and configurations.</p>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                    <li>It will automatically disable after <strong>10 minutes</strong> for safety</li>
                    <li>All actions will be logged to the audit trail</li>
                    <li>Changes take effect immediately</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleEnableWriteMode} className="bg-warning text-warning-foreground hover:bg-warning/90">
                  Enable Write Mode
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

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
        <KPICard title="Errors 24h" value={errorCount24h || 0} icon={AlertCircle} loading={false} onClick={() => setMode('investigate')} />
      </div>

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
            
            {/* Real Activity Feed */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Activity Feed
                  {activityEvents.length > 0 && (
                    <Badge variant="outline" className="ml-auto text-xs">{activityEvents.length} events</Badge>
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
                          <div key={event.id} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                            <div className={`p-1.5 rounded-lg bg-muted ${config.color}`}>
                              <EventIcon className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{config.label}</p>
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
        <ErrorExplorer onResortClick={(resortId) => {
          const resort = resorts.find(r => r.id === resortId);
          if (resort) handleResortClick(resort);
        }} />
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

      <ResortDrawer 
        resort={selectedResort} 
        open={drawerOpen} 
        onOpenChange={setDrawerOpen}
        writeMode={writeMode}
      />
    </div>
  );
}
