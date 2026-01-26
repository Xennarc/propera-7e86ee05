import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { getTierInfo, SubscriptionTier } from '@/lib/tier-features';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { useResortSettings, useUpdateResortSetting, ResortSettings, ResortSettingKey } from '@/hooks/useResortSettings';
import {
  Building2,
  Users,
  Calendar,
  Utensils,
  Eye,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Settings,
  Activity,
  ClipboardList,
  Shield,
  Download,
  Pencil,
} from 'lucide-react';

interface Resort {
  id: string;
  name: string;
  code: string;
  subscription_tier: string;
  status: string;
  is_demo: boolean;
  timezone: string;
  currency: string;
}

interface ResortDrawerProps {
  resort: Resort | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  writeMode?: boolean;
}

// Settings row configuration
const SETTING_ROWS: { key: ResortSettingKey; label: string; description: string }[] = [
  { key: 'activities_enabled', label: 'Activities Module', description: 'Enable activity booking' },
  { key: 'dining_enabled', label: 'Dining Module', description: 'Enable restaurant reservations' },
  { key: 'prearrival_enabled', label: 'Pre-arrival', description: 'Guest pre-arrival forms' },
  { key: 'loyalty_enabled', label: 'Loyalty Program', description: 'Rewards and tiers' },
  { key: 'guest_booking_enabled', label: 'Guest Booking', description: 'Allow guest self-booking' },
];

export function ResortDrawer({ resort, open, onOpenChange, writeMode = false }: ResortDrawerProps) {
  const navigate = useNavigate();
  const { setCurrentResort, resorts } = useResort();
  const [activeTab, setActiveTab] = useState('overview');
  const [confirmDialog, setConfirmDialog] = useState<{
    key: ResortSettingKey;
    label: string;
    newValue: boolean;
    oldValue: boolean;
  } | null>(null);
  const today = new Date().toISOString().split('T')[0];

  // Resort settings hook
  const { data: settings, isLoading: loadingSettings } = useResortSettings(resort?.id);
  const updateSetting = useUpdateResortSetting();

  // Fetch resort metrics
  const { data: metrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['resort-drawer-metrics', resort?.id, today],
    queryFn: async () => {
      if (!resort) return null;

      const [
        { count: guestsInHouse },
        { count: upcomingArrivals },
        { count: todaySessions },
        { count: todaySlots },
        { count: staffCount },
      ] = await Promise.all([
        supabase.from('guests').select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id).lte('check_in_date', today).gte('check_out_date', today),
        supabase.from('guests').select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id).gt('check_in_date', today),
        supabase.from('activity_sessions').select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id).eq('date', today),
        supabase.from('restaurant_time_slots').select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id).eq('date', today),
        supabase.from('resort_memberships').select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id),
      ]);

      // Calculate pre-arrival rate
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

      return {
        guestsInHouse: guestsInHouse || 0,
        upcomingArrivals: upcomingArrivals || 0,
        todaySessions: todaySessions || 0,
        todaySlots: todaySlots || 0,
        staffCount: staffCount || 0,
        prearrivalRate,
      };
    },
    enabled: !!resort && open,
  });

  // Fetch recent audit logs
  const { data: auditLogs, isLoading: loadingAudit } = useQuery({
    queryKey: ['resort-drawer-audit', resort?.id],
    queryFn: async () => {
      if (!resort) return [];
      const { data } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('resort_id', resort.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!resort && open && activeTab === 'audit',
  });

  // Fetch diagnostics
  const { data: diagnostics, isLoading: loadingDiagnostics } = useQuery({
    queryKey: ['resort-drawer-diagnostics', resort?.id],
    queryFn: async () => {
      if (!resort) return [];
      const issues: { type: 'error' | 'warning' | 'info'; message: string }[] = [];

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
        issues.push({ type: 'warning', message: `${activityCount} activities without upcoming sessions` });
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
        issues.push({ type: 'warning', message: `${restaurantCount} restaurants without upcoming slots` });
      }

      return issues;
    },
    enabled: !!resort && open && activeTab === 'diagnostics',
  });

  if (!resort) return null;

  const tierInfo = getTierInfo((resort.subscription_tier || 'ESSENTIAL') as SubscriptionTier);

  const handleSwitchToResort = () => {
    const fullResort = resorts.find(r => r.id === resort.id);
    if (fullResort) {
      setCurrentResort(fullResort);
      navigate('/staff/dashboard');
      onOpenChange(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(resort.id);
    toast.success('Resort ID copied to clipboard');
  };

  const handleOpenGuestPortal = () => {
    window.open(`/guest/login?resort=${resort.code}`, '_blank');
  };

  const handleSettingToggle = (key: ResortSettingKey, label: string) => {
    if (!writeMode) {
      toast.error('Enable Write Mode to make changes');
      return;
    }
    const currentValue = settings?.[key] as boolean ?? false;
    setConfirmDialog({ key, label, newValue: !currentValue, oldValue: currentValue });
  };

  const handleConfirmSettingChange = async () => {
    if (!confirmDialog || !resort) return;
    
    try {
      await updateSetting.mutateAsync({
        resortId: resort.id,
        key: confirmDialog.key,
        value: confirmDialog.newValue,
        oldValue: confirmDialog.oldValue,
      });
      toast.success(`${confirmDialog.label} ${confirmDialog.newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      toast.error('Failed to update setting');
    } finally {
      setConfirmDialog(null);
    }
  };

  const handleExportDiagnostics = async () => {
    if (!resort) return;

    toast.loading('Generating diagnostics report...');

    try {
      // Fetch all diagnostic data in parallel
      const [
        { data: errors },
        { data: auditData },
        { data: settingsData },
      ] = await Promise.all([
        supabase.from('platform_errors')
          .select('*')
          .eq('resort_id', resort.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('admin_audit_logs')
          .select('*')
          .eq('resort_id', resort.id)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase.from('resort_settings')
          .select('*')
          .eq('resort_id', resort.id)
          .single(),
      ]);

      const diagnosticsReport = {
        generated_at: new Date().toISOString(),
        resort: {
          id: resort.id,
          name: resort.name,
          code: resort.code,
          tier: resort.subscription_tier,
          timezone: resort.timezone,
          currency: resort.currency,
          is_demo: resort.is_demo,
          status: resort.status,
        },
        metrics: metrics || {},
        settings: settingsData || {},
        recent_errors: errors || [],
        recent_audit_logs: auditData || [],
        diagnostics_issues: diagnostics || [],
      };

      // Create downloadable file
      const blob = new Blob([JSON.stringify(diagnosticsReport, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `propera-diagnostics-${resort.code.toLowerCase()}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.dismiss();
      toast.success('Diagnostics report downloaded');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to generate diagnostics report');
      console.error(error);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl flex flex-col h-full max-h-[100dvh] overflow-hidden">
          <SheetHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {resort.name}
                </SheetTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={`${tierInfo.color} text-xs`}>{tierInfo.name}</Badge>
                  {resort.is_demo && <Badge variant="outline" className="text-xs">DEMO</Badge>}
                  <Badge variant="outline" className="text-xs">{resort.code}</Badge>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Quick Actions */}
          <div className="flex gap-2 mb-4">
            <Button size="sm" onClick={handleSwitchToResort}>
              <Eye className="h-3 w-3 mr-1" />
              Staff Console
            </Button>
            <Button size="sm" variant="outline" onClick={handleOpenGuestPortal}>
              <ExternalLink className="h-3 w-3 mr-1" />
              Guest Portal
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCopyId}>
              <Copy className="h-3 w-3 mr-1" />
              Copy ID
            </Button>
          </div>

          <Separator className="mb-4" />

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5 mb-4">
              <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
              <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
              <TabsTrigger value="users" className="text-xs">Users</TabsTrigger>
              <TabsTrigger value="diagnostics" className="text-xs">Diag</TabsTrigger>
              <TabsTrigger value="audit" className="text-xs">Audit</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1 min-h-0">
              <TabsContent value="overview" className="space-y-4 mt-0 pr-4">
                {loadingMetrics ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : metrics && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 bg-muted/30 rounded-xl">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Users className="h-4 w-4" />
                          <span className="text-xs">Guests In-House</span>
                        </div>
                        <p className="text-2xl font-bold">{metrics.guestsInHouse}</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Users className="h-4 w-4" />
                          <span className="text-xs">Upcoming</span>
                        </div>
                        <p className="text-2xl font-bold">{metrics.upcomingArrivals}</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Calendar className="h-4 w-4" />
                          <span className="text-xs">Sessions Today</span>
                        </div>
                        <p className="text-2xl font-bold">{metrics.todaySessions}</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Utensils className="h-4 w-4" />
                          <span className="text-xs">Slots Today</span>
                        </div>
                        <p className="text-2xl font-bold">{metrics.todaySlots}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-primary/5 rounded-xl border border-primary/20">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Pre-arrival Completion</span>
                        <span className="text-lg font-bold text-primary">{metrics.prearrivalRate}%</span>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/30 rounded-xl">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Staff Members</span>
                        <span className="font-medium">{metrics.staffCount}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm">Timezone</span>
                        <span className="font-medium text-muted-foreground">{resort.timezone}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm">Currency</span>
                        <span className="font-medium text-muted-foreground">{resort.currency}</span>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="settings" className="space-y-4 mt-0">
                {/* Write Mode Warning */}
                {!writeMode && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg text-sm text-warning flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    <span>Enable Write Mode in the header to change settings</span>
                  </div>
                )}

                {writeMode && (
                  <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    <span>Write Mode active - changes will be applied immediately</span>
                  </div>
                )}

                {loadingSettings ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {SETTING_ROWS.map(row => (
                      <div key={row.key} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                        <div>
                          <Label>{row.label}</Label>
                          <p className="text-xs text-muted-foreground">{row.description}</p>
                        </div>
                        <Switch 
                          checked={(settings?.[row.key] as boolean) ?? false}
                          disabled={!writeMode}
                          onCheckedChange={() => handleSettingToggle(row.key, row.label)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="users" className="space-y-4 mt-0">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => {
                    navigate(`/superadmin/resorts/${resort.id}`);
                    onOpenChange(false);
                  }}
                >
                  <Users className="h-4 w-4 mr-2" />
                  View Full Staff List
                </Button>
                <p className="text-sm text-center text-muted-foreground">
                  {metrics?.staffCount || 0} staff members at this resort
                </p>
              </TabsContent>

              <TabsContent value="diagnostics" className="space-y-4 mt-0">
                {loadingDiagnostics ? (
                  <Skeleton className="h-32 w-full" />
                ) : diagnostics && diagnostics.length > 0 ? (
                  <div className="space-y-3">
                    {diagnostics.map((issue, i) => (
                      <div 
                        key={i}
                        className={`p-4 rounded-xl border ${
                          issue.type === 'error' ? 'bg-destructive/10 border-destructive/30' :
                          issue.type === 'warning' ? 'bg-warning/10 border-warning/30' :
                          'bg-info/10 border-info/30'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                            issue.type === 'error' ? 'text-destructive' :
                            issue.type === 'warning' ? 'text-warning' : 'text-info'
                          }`} />
                          <p className="text-sm">{issue.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="h-12 w-12 text-success/50 mb-3" />
                    <p className="font-medium">All Clear</p>
                    <p className="text-sm text-muted-foreground">No issues detected</p>
                  </div>
                )}
                <Button variant="outline" className="w-full" onClick={handleExportDiagnostics}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Diagnostics
                </Button>
              </TabsContent>

              <TabsContent value="audit" className="space-y-4 mt-0">
                {loadingAudit ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : auditLogs && auditLogs.length > 0 ? (
                  <div className="space-y-2">
                    {auditLogs.map(log => (
                      <div key={log.id} className="p-3 bg-muted/30 rounded-lg text-sm">
                        <p className="font-medium">{log.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">No recent changes</p>
                  </div>
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Setting Change Confirmation Dialog */}
      <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Setting Change</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to <strong>{confirmDialog?.newValue ? 'enable' : 'disable'}</strong>{' '}
              <strong>{confirmDialog?.label}</strong> for <strong>{resort?.name}</strong>.
              <br /><br />
              This action will be logged to the audit trail.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmSettingChange}
              disabled={updateSetting.isPending}
            >
              {updateSetting.isPending ? 'Applying...' : 'Confirm Change'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
