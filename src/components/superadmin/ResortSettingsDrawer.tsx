import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { getTierInfo, SubscriptionTier, tierHasFeature, TierFeature } from '@/lib/tier-features';
import { format } from 'date-fns';
import { usePurgeJob } from '@/hooks/usePurgeJob';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { toast } from 'sonner';
import { useResortSettings, useUpdateResortSetting, ResortSettingKey } from '@/hooks/useResortSettings';
import {
  Building2,
  Settings,
  Crown,
  Zap,
  Shield,
  AlertTriangle,
  Globe,
  Clock,
  DollarSign,
  Eye,
  ExternalLink,
  Copy,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  Pause,
  Loader2,
} from 'lucide-react';
import { ResortAddonsSection } from './ResortAddonsSection';

interface Resort {
  id: string;
  name: string;
  code: string;
  status: string;
  is_demo: boolean;
  subscription_tier: string;
  timezone?: string;
  currency?: string;
  demo_expires_at?: string | null;
}

interface ResortSettingsDrawerProps {
  resort: Resort | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}

// Feature settings configuration
const FEATURE_SETTINGS: { key: ResortSettingKey; label: string; description: string; requiredTier?: SubscriptionTier }[] = [
  { key: 'activities_enabled', label: 'Activities Module', description: 'Enable activity booking for guests' },
  { key: 'dining_enabled', label: 'Dining Module', description: 'Enable restaurant reservations' },
  { key: 'prearrival_enabled', label: 'Pre-arrival', description: 'Guest pre-arrival forms and early booking', requiredTier: 'PROFESSIONAL' },
  { key: 'loyalty_enabled', label: 'Loyalty Program', description: 'Rewards program and member tiers', requiredTier: 'ELITE' },
  { key: 'guest_booking_enabled', label: 'Guest Self-Booking', description: 'Allow guests to book from portal' },
];

// Key features for tier display
const KEY_FEATURES: { key: TierFeature; label: string; tier: SubscriptionTier }[] = [
  { key: 'loyalty_program', label: 'Loyalty Program', tier: 'ELITE' },
  { key: 'guest_portal_pre_arrival', label: 'Pre-Arrival Booking', tier: 'PROFESSIONAL' },
  { key: 'guest_portal_branding', label: 'Custom Branding', tier: 'PROFESSIONAL' },
  { key: 'reports_ai_insights', label: 'AI Insights', tier: 'ELITE' },
];

export function ResortSettingsDrawer({ resort, open, onOpenChange, onRefresh }: ResortSettingsDrawerProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { setCurrentResort, resorts } = useResort();
  const [activeTab, setActiveTab] = useState('general');
  const [confirmDialog, setConfirmDialog] = useState<{
    key: ResortSettingKey;
    label: string;
    newValue: boolean;
    oldValue: boolean;
  } | null>(null);
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [newTier, setNewTier] = useState<SubscriptionTier>('ESSENTIAL');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suspendDialogOpen, setSuspendDialogOpen] = useState(false);
  const [confirmCode, setConfirmCode] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');
  const [confirmDemoDelete, setConfirmDemoDelete] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [understandCheckbox, setUnderstandCheckbox] = useState(false);

  // Purge job hook
  const { job: purgeJob, isLoading: loadingPurgeJob, isPurging, startPurge, retryPurge } = usePurgeJob(resort?.id);

  // Fetch settings
  const { data: settings, isLoading: loadingSettings } = useResortSettings(resort?.id);
  const updateSetting = useUpdateResortSetting();

  // Fetch resort details (extended data)
  const { data: resortDetails, isLoading: loadingDetails } = useQuery({
    queryKey: ['resort-settings-drawer-details', resort?.id],
    queryFn: async () => {
      if (!resort?.id) return null;

      const [
        { count: guestsInHouse },
        { count: staffCount },
        { data: featureFlags },
      ] = await Promise.all([
        supabase.from('guests').select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id)
          .lte('check_in_date', new Date().toISOString().split('T')[0])
          .gte('check_out_date', new Date().toISOString().split('T')[0]),
        supabase.from('resort_memberships').select('*', { count: 'exact', head: true })
          .eq('resort_id', resort.id),
        supabase.from('feature_flags').select('key, is_enabled')
          .eq('resort_id', resort.id)
          .eq('scope', 'resort'),
      ]);

      return {
        guestsInHouse: guestsInHouse || 0,
        staffCount: staffCount || 0,
        featureFlags: featureFlags || [],
      };
    },
    enabled: !!resort?.id && open,
  });

  // Fetch integrations status
  const { data: integrations, isLoading: loadingIntegrations } = useQuery({
    queryKey: ['resort-settings-drawer-integrations', resort?.id],
    queryFn: async () => {
      if (!resort?.id) return null;

      // Check for prearrival settings (integration-like)
      const { data: prearrival } = await supabase
        .from('prearrival_settings')
        .select('is_enabled')
        .eq('resort_id', resort.id)
        .maybeSingle();

      // Check for loyalty program
      const { data: loyalty } = await supabase
        .from('loyalty_programs')
        .select('is_enabled')
        .eq('resort_id', resort.id)
        .maybeSingle();

      return {
        prearrival: prearrival?.is_enabled ?? false,
        loyalty: loyalty?.is_enabled ?? false,
      };
    },
    enabled: !!resort?.id && open && activeTab === 'integrations',
  });

  // Update tier mutation
  const updateTierMutation = useMutation({
    mutationFn: async (tier: SubscriptionTier) => {
      if (!resort) throw new Error('No resort');
      
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const oldTier = resort.subscription_tier || 'ESSENTIAL';
      
      const { error } = await supabase
        .from('resorts')
        .update({ subscription_tier: tier })
        .eq('id', resort.id);

      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        actor_id: userId!,
        action: 'resort_tier_changed',
        resort_id: resort.id,
        metadata_json: { old_tier: oldTier, new_tier: tier },
      });

      return tier;
    },
    onSuccess: (tier) => {
      queryClient.invalidateQueries({ queryKey: ['resorts'] });
      onRefresh();
      toast.success(`Plan updated to ${getTierInfo(tier).name}`);
      setTierDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to update plan tier');
    },
  });

  // Note: Resort deletion uses the purge system via handlePurgeRequest
  // The purge-resort edge function handles complete cleanup of all data and storage

  // Suspend/Unsuspend mutation
  const suspendMutation = useMutation({
    mutationFn: async (suspend: boolean) => {
      if (!resort) throw new Error('No resort');
      
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      
      const { error } = await supabase
        .from('resorts')
        .update({ status: suspend ? 'INACTIVE' : 'ACTIVE' })
        .eq('id', resort.id);

      if (error) throw error;

      await supabase.from('admin_audit_logs').insert({
        actor_id: userId!,
        action: suspend ? 'resort_suspended' : 'resort_unsuspended',
        resort_id: resort.id,
        metadata_json: { resort_name: resort.name },
      });

      return suspend;
    },
    onSuccess: (suspended) => {
      queryClient.invalidateQueries({ queryKey: ['resorts'] });
      onRefresh();
      toast.success(suspended ? `${resort?.name} suspended` : `${resort?.name} reactivated`);
      setSuspendDialogOpen(false);
      setConfirmCode('');
    },
    onError: () => {
      toast.error('Failed to update resort status');
    },
  });

  // Reseed demo mutation (only for demo resorts - calls demo-reset edge function)
  const reseedMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('demo-reset', {
        body: { action: 'run' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resorts'] });
      onRefresh();
      toast.success('Demo data reseeded successfully');
    },
    onError: () => {
      toast.error('Failed to reseed demo data');
    },
  });

  if (!resort) return null;

  const tierInfo = getTierInfo((resort.subscription_tier || 'ESSENTIAL') as SubscriptionTier);
  const currentTier = (resort.subscription_tier || 'ESSENTIAL') as SubscriptionTier;

  const handleSettingToggle = (key: ResortSettingKey, label: string, requiredTier?: SubscriptionTier) => {
    if (requiredTier && !tierHasFeature(currentTier, key as any)) {
      toast.error(`${label} requires ${getTierInfo(requiredTier).name} tier or higher`);
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

  // Validation for delete action
  const codeMatches = confirmCode === resort.code;
  const deleteWordMatches = confirmDelete === 'DELETE';
  const demoWordMatches = !resort.is_demo || confirmDemoDelete === 'DELETE DEMO';
  const canDelete = codeMatches && deleteWordMatches && demoWordMatches && understandCheckbox;

  // Determine confirmation word for RPC
  const confirmWord = resort.is_demo ? 'DELETE DEMO' : 'DELETE';

  // Handle purge request
  const handlePurgeRequest = async () => {
    if (!resort) return;
    
    try {
      await startPurge({
        resortId: resort.id,
        resortCode: resort.code,
        confirmWord,
        reason: deleteReason || undefined,
      });
      
      toast.success('Purge job started');
      // Don't close dialog - show progress instead
    } catch (error) {
      console.error('Purge request failed:', error);
    }
  };

  // Handle purge retry
  const handleRetryPurge = async () => {
    if (!purgeJob) return;
    
    try {
      await retryPurge(purgeJob.id);
      toast.success('Retry initiated');
    } catch (error) {
      console.error('Purge retry failed:', error);
    }
  };

  // Reset delete dialog state
  const resetDeleteDialog = () => {
    setConfirmCode('');
    setConfirmDelete('');
    setConfirmDemoDelete('');
    setDeleteReason('');
    setUnderstandCheckbox(false);
  };

  const isDowngrade = newTier !== currentTier && 
    ['ESSENTIAL', 'PROFESSIONAL', 'ELITE'].indexOf(newTier) < 
    ['ESSENTIAL', 'PROFESSIONAL', 'ELITE'].indexOf(currentTier);

  const featuresLostOnDowngrade = KEY_FEATURES.filter(f => 
    tierHasFeature(currentTier, f.key) && !tierHasFeature(newTier, f.key)
  );

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <DrawerTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {resort.name}
                </DrawerTitle>
                <DrawerDescription className="flex items-center gap-2 mt-1">
                  <Badge className={`${tierInfo.color} text-xs`}>{tierInfo.name}</Badge>
                  {resort.is_demo && <Badge variant="outline" className="text-xs">DEMO</Badge>}
                  <Badge variant="outline" className="text-xs font-mono">{resort.code}</Badge>
                </DrawerDescription>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleSwitchToResort}>
                  <Eye className="h-3 w-3 mr-1" />
                  Staff Console
                </Button>
                <Button size="sm" variant="ghost" onClick={handleCopyId}>
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </DrawerHeader>

          <Separator className="mb-2" />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="w-full justify-start px-4 bg-transparent">
              <TabsTrigger value="general" className="text-xs">General</TabsTrigger>
              <TabsTrigger value="plan" className="text-xs">Plan & Limits</TabsTrigger>
              <TabsTrigger value="features" className="text-xs">Features</TabsTrigger>
              <TabsTrigger value="integrations" className="text-xs">Integrations</TabsTrigger>
              <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
              <TabsTrigger value="danger" className="text-xs text-destructive data-[state=active]:text-destructive">Danger Zone</TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[50vh] px-4 pb-4">
              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-4">
                {loadingDetails ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-muted/30 rounded-xl">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Globe className="h-4 w-4" />
                          <span className="text-xs">Timezone</span>
                        </div>
                        <p className="font-medium">{resort.timezone || 'UTC'}</p>
                      </div>
                      <div className="p-4 bg-muted/30 rounded-xl">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <DollarSign className="h-4 w-4" />
                          <span className="text-xs">Currency</span>
                        </div>
                        <p className="font-medium">{resort.currency || 'USD'}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Status</span>
                        <Badge variant={resort.status === 'ACTIVE' ? 'default' : 'outline'}>
                          {resort.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Resort Code</span>
                        <span className="font-mono text-sm">{resort.code}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Guests In-House</span>
                        <span className="font-medium">{resortDetails?.guestsInHouse || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Staff Members</span>
                        <span className="font-medium">{resortDetails?.staffCount || 0}</span>
                      </div>
                    </div>

                    {resort.is_demo && resort.demo_expires_at && (
                      <div className="p-4 bg-warning/10 border border-warning/30 rounded-xl">
                        <div className="flex items-center gap-2 text-warning mb-1">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">Demo Expiration</span>
                        </div>
                        <p className="text-sm">{format(new Date(resort.demo_expires_at), 'PPP')}</p>
                      </div>
                    )}

                    <Button variant="outline" className="w-full" onClick={handleOpenGuestPortal}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Open Guest Portal
                    </Button>
                  </>
                )}
              </TabsContent>

              {/* Plan & Limits Tab */}
              <TabsContent value="plan" className="space-y-4 mt-4">
                <div className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Current Plan</p>
                      <Badge className={`${tierInfo.color} text-white mt-1`}>
                        {tierInfo.name}
                      </Badge>
                    </div>
                    <Button size="sm" onClick={() => { setNewTier(currentTier); setTierDialogOpen(true); }}>
                      Change Plan
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">{tierInfo.description}</p>
                </div>

                {/* Resort Add-ons */}
                <ResortAddonsSection resortId={resort.id} resortName={resort.name} />

                <Separator />

                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Available Features</h4>
                  {KEY_FEATURES.map(feature => {
                    const available = tierHasFeature(currentTier, feature.key);
                    return (
                      <div key={feature.key} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <span className={available ? '' : 'text-muted-foreground'}>
                          {feature.label}
                        </span>
                        {available ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {getTierInfo(feature.tier).name}+
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </TabsContent>

              {/* Features Tab */}
              <TabsContent value="features" className="space-y-4 mt-4">
                {loadingSettings ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {FEATURE_SETTINGS.map(row => {
                      const tierLocked = row.requiredTier && !tierHasFeature(currentTier, row.key as any);
                      return (
                        <div 
                          key={row.key} 
                          className={`flex items-center justify-between p-4 rounded-xl ${
                            tierLocked ? 'bg-muted/20 opacity-60' : 'bg-muted/30'
                          }`}
                        >
                          <div>
                            <Label className="flex items-center gap-2">
                              {row.label}
                              {tierLocked && (
                                <Badge variant="outline" className="text-[10px]">
                                  {getTierInfo(row.requiredTier!).name}+
                                </Badge>
                              )}
                            </Label>
                            <p className="text-xs text-muted-foreground">{row.description}</p>
                          </div>
                          <Switch 
                            checked={(settings?.[row.key] as boolean) ?? false}
                            disabled={tierLocked}
                            onCheckedChange={() => handleSettingToggle(row.key, row.label, row.requiredTier)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Integrations Tab */}
              <TabsContent value="integrations" className="space-y-4 mt-4">
                {loadingIntegrations ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                      <div>
                        <Label>Pre-arrival Forms</Label>
                        <p className="text-xs text-muted-foreground">Guest pre-arrival data collection</p>
                      </div>
                      <Badge variant={integrations?.prearrival ? 'default' : 'outline'}>
                        {integrations?.prearrival ? 'Active' : 'Not Configured'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
                      <div>
                        <Label>Loyalty Program</Label>
                        <p className="text-xs text-muted-foreground">Guest rewards and tiers</p>
                      </div>
                      <Badge variant={integrations?.loyalty ? 'default' : 'outline'}>
                        {integrations?.loyalty ? 'Active' : 'Not Configured'}
                      </Badge>
                    </div>
                    {/* TODO: Add more integrations when schema supports them */}
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl opacity-60">
                      <div>
                        <Label>PMS Integration</Label>
                        <p className="text-xs text-muted-foreground">Property management system sync</p>
                      </div>
                      <Badge variant="outline" className="text-muted-foreground">
                        Not configured yet
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted/20 rounded-xl opacity-60">
                      <div>
                        <Label>Payment Gateway</Label>
                        <p className="text-xs text-muted-foreground">Online payment processing</p>
                      </div>
                      <Badge variant="outline" className="text-muted-foreground">
                        Not configured yet
                      </Badge>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-4 mt-4">
                <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="font-medium">Security Status</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">RLS Policies</span>
                    <Badge variant="default" className="bg-success/10 text-success border-success/30">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tenant Isolation</span>
                    <Badge variant="default" className="bg-success/10 text-success border-success/30">
                      Active
                    </Badge>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-sm">Staff with Access</span>
                    <span className="font-medium">{resortDetails?.staffCount || 0}</span>
                  </div>
                </div>

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    navigate(`/superadmin/audit?resort=${resort.id}`);
                    onOpenChange(false);
                  }}
                >
                  View Audit Logs
                </Button>
              </TabsContent>

              {/* Danger Zone Tab */}
              <TabsContent value="danger" className="space-y-4 mt-4">
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-xl">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Danger Zone</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Actions here are destructive and may be irreversible. Proceed with caution.
                  </p>
                </div>

                {/* Suspend Resort */}
                <div className="p-4 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2">
                        <Pause className="h-4 w-4" />
                        {resort.status === 'INACTIVE' ? 'Resort Suspended' : 'Suspend Resort'}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {resort.status === 'INACTIVE' 
                          ? 'This resort is currently suspended' 
                          : 'Temporarily disable access for all users'
                        }
                      </p>
                    </div>
                    <Button 
                      variant={resort.status === 'INACTIVE' ? 'default' : 'outline'} 
                      size="sm"
                      onClick={() => setSuspendDialogOpen(true)}
                    >
                      {resort.status === 'INACTIVE' ? 'Unsuspend' : 'Suspend'}
                    </Button>
                  </div>
                </div>

                {/* Reseed Demo */}
                {resort.is_demo && (
                  <div className="p-4 bg-muted/30 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="flex items-center gap-2">
                          <RefreshCw className={`h-4 w-4 ${reseedMutation.isPending ? 'animate-spin' : ''}`} />
                          Reseed Demo Data
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Reset demo data to initial state
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => reseedMutation.mutate()}
                        disabled={reseedMutation.isPending}
                      >
                        {reseedMutation.isPending ? 'Reseeding...' : 'Reseed'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Active Purge Job Status */}
                {purgeJob && ['queued', 'running', 'failed'].includes(purgeJob.status) && (
                  <div className={`p-4 border rounded-xl ${
                    purgeJob.status === 'failed' 
                      ? 'border-destructive/50 bg-destructive/10' 
                      : 'border-amber-500/50 bg-amber-500/10'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      {purgeJob.status === 'running' || purgeJob.status === 'queued' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-destructive" />
                      )}
                      <span className="font-medium">
                        {purgeJob.status === 'queued' && 'Purge Queued'}
                        {purgeJob.status === 'running' && 'Purge In Progress'}
                        {purgeJob.status === 'failed' && 'Purge Failed'}
                      </span>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {purgeJob.status.toUpperCase()}
                      </Badge>
                    </div>
                    
                    {(purgeJob.status === 'running' || purgeJob.status === 'queued') && (
                      <>
                        <Progress value={purgeJob.progress} className="h-2 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          {purgeJob.current_step || 'Initializing...'} ({purgeJob.progress}%)
                        </p>
                      </>
                    )}
                    
                    {purgeJob.status === 'failed' && (
                      <>
                        <p className="text-sm text-destructive mb-3">
                          {purgeJob.error || 'Unknown error occurred'}
                        </p>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleRetryPurge}
                          disabled={isPurging}
                        >
                          {isPurging ? 'Retrying...' : 'Retry Purge'}
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* Completed Purge Job */}
                {purgeJob && purgeJob.status === 'completed' && (
                  <div className="p-4 border border-success/50 bg-success/10 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      <span className="font-medium text-success">Purge Completed</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Deleted {purgeJob.summary?.total_rows_deleted || 0} rows and{' '}
                      {purgeJob.summary?.total_files_deleted || 0} files in{' '}
                      {((purgeJob.summary?.duration_ms || 0) / 1000).toFixed(1)}s
                    </p>
                  </div>
                )}

                {/* Delete Resort */}
                <div className="p-4 border border-destructive/50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="flex items-center gap-2 text-destructive">
                        <Trash2 className="h-4 w-4" />
                        Delete Resort Permanently
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Permanently delete all resort data including guests, bookings, and files
                      </p>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => setDeleteDialogOpen(true)}
                      disabled={purgeJob && ['queued', 'running'].includes(purgeJob.status)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DrawerContent>
      </Drawer>

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

      {/* Tier Change Dialog */}
      <AlertDialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Change Subscription Plan</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Select a new plan for {resort.name}</p>
                
                <Select value={newTier} onValueChange={(v) => setNewTier(v as SubscriptionTier)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ESSENTIAL">Essential</SelectItem>
                    <SelectItem value="PROFESSIONAL">Professional</SelectItem>
                    <SelectItem value="ELITE">Elite</SelectItem>
                  </SelectContent>
                </Select>

                {isDowngrade && featuresLostOnDowngrade.length > 0 && (
                  <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                    <div className="flex items-center gap-2 text-warning text-sm font-medium mb-2">
                      <AlertTriangle className="h-4 w-4" />
                      Features that will be hidden:
                    </div>
                    <ul className="text-sm space-y-1">
                      {featuresLostOnDowngrade.map(f => (
                        <li key={f.key}>• {f.label}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => updateTierMutation.mutate(newTier)}
              disabled={updateTierMutation.isPending || newTier === currentTier}
            >
              {updateTierMutation.isPending ? 'Updating...' : 'Update Plan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog with Triple Confirmation for Demo */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        setDeleteDialogOpen(open);
        if (!open) resetDeleteDialog();
      }}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Resort Permanently
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-sm">
                  <p className="font-medium text-destructive">⚠️ This action is irreversible!</p>
                  <p className="mt-2">
                    Deleting <strong>{resort.name}</strong> will permanently remove:
                  </p>
                  <ul className="mt-2 space-y-1 text-muted-foreground">
                    <li>• All guest records and bookings</li>
                    <li>• All activities and restaurant reservations</li>
                    <li>• All staff access and audit logs</li>
                    <li>• All uploaded files and images</li>
                  </ul>
                </div>

                {resort.is_demo && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm">
                    <p className="font-medium text-amber-600">
                      This is a DEMO resort — extra confirmation required
                    </p>
                  </div>
                )}
                
                <div className="space-y-4 pt-2">
                  <div>
                    <Label htmlFor="drawer-delete-code">
                      Type the resort code: <strong className="font-mono">{resort.code}</strong>
                    </Label>
                    <Input
                      id="drawer-delete-code"
                      value={confirmCode}
                      onChange={(e) => setConfirmCode(e.target.value)}
                      placeholder={resort.code}
                      className="mt-2 font-mono"
                    />
                    {confirmCode && confirmCode !== resort.code && (
                      <p className="text-xs text-destructive mt-1">Code does not match</p>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="drawer-delete-confirm">
                      Type <strong>DELETE</strong> to confirm
                    </Label>
                    <Input
                      id="drawer-delete-confirm"
                      value={confirmDelete}
                      onChange={(e) => setConfirmDelete(e.target.value)}
                      placeholder="DELETE"
                      className="mt-2"
                    />
                  </div>

                  {resort.is_demo && (
                    <div>
                      <Label htmlFor="drawer-delete-demo-confirm">
                        Type <strong>DELETE DEMO</strong> to confirm demo deletion
                      </Label>
                      <Input
                        id="drawer-delete-demo-confirm"
                        value={confirmDemoDelete}
                        onChange={(e) => setConfirmDemoDelete(e.target.value)}
                        placeholder="DELETE DEMO"
                        className="mt-2"
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="drawer-delete-reason">
                      Reason for deletion (optional)
                    </Label>
                    <Textarea
                      id="drawer-delete-reason"
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Enter reason for audit trail..."
                      className="mt-2"
                      rows={2}
                    />
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="drawer-delete-understand"
                      checked={understandCheckbox}
                      onCheckedChange={(checked) => setUnderstandCheckbox(checked === true)}
                    />
                    <Label 
                      htmlFor="drawer-delete-understand" 
                      className="text-sm font-normal leading-tight cursor-pointer"
                    >
                      I understand this will permanently delete all resort data and cannot be undone
                    </Label>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={resetDeleteDialog}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePurgeRequest}
              disabled={!canDelete || isPurging}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPurging ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Delete Permanently'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Suspend/Unsuspend Dialog */}
      <AlertDialog open={suspendDialogOpen} onOpenChange={setSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {resort.status === 'INACTIVE' ? 'Unsuspend Resort' : 'Suspend Resort'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                {resort.status === 'INACTIVE' 
                  ? `You are about to unsuspend ${resort.name}. This will restore access for all staff and guests.`
                  : `You are about to suspend ${resort.name}. This will prevent all staff and guests from accessing the resort.`
                }
              </p>
              <div className="pt-3">
                <Label htmlFor="drawer-suspend-code">Type the resort code to confirm: <strong>{resort.code}</strong></Label>
                <Input
                  id="drawer-suspend-code"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value)}
                  placeholder={resort.code}
                  className="mt-2"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setConfirmCode(''); }}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => suspendMutation.mutate(resort.status === 'ACTIVE')}
              disabled={confirmCode !== resort.code || suspendMutation.isPending}
              className={resort.status === 'INACTIVE' ? '' : 'bg-warning text-warning-foreground hover:bg-warning/90'}
            >
              {suspendMutation.isPending ? 'Processing...' : resort.status === 'INACTIVE' ? 'Unsuspend' : 'Suspend'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
