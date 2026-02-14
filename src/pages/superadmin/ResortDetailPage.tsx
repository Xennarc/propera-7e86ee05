import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { toast } from 'sonner';
import { 
  ArrowLeft, Building2, Users, Crown, Activity, AlertTriangle, 
  ExternalLink, Settings, Shield, Star, Calendar, Utensils
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getTierInfo, SubscriptionTier, TierFeature, tierHasFeature, FEATURE_NAMES } from '@/lib/tier-features';
import { KpiGrid, KpiCard } from '@/components/ui/kpi-card';

const KEY_FEATURES: { key: TierFeature; label: string; tier: SubscriptionTier }[] = [
  { key: 'loyalty_program', label: 'Loyalty Program', tier: 'ELITE' },
  { key: 'guest_portal_pre_arrival', label: 'Pre-Arrival Booking', tier: 'PROFESSIONAL' },
  { key: 'guest_portal_branding', label: 'Custom Branding', tier: 'PROFESSIONAL' },
  { key: 'reports_ai_insights', label: 'AI Insights', tier: 'ELITE' },
  { key: 'reports_sales_performance', label: 'Sales Performance', tier: 'ELITE' },
  { key: 'guest_portal_multi_language', label: 'Multi-Language', tier: 'PROFESSIONAL' },
];

export default function ResortDetailPage() {
  const { resortId } = useParams<{ resortId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { resorts, setCurrentResort } = useResort();
  const [tierDialogOpen, setTierDialogOpen] = useState(false);
  const [newTier, setNewTier] = useState<SubscriptionTier>('ESSENTIAL');
  const today = new Date().toISOString().split('T')[0];

  const resort = resorts.find(r => r.id === resortId);

  // Fetch detailed resort data
  const { data: resortData, isLoading } = useQuery({
    queryKey: ['super-admin-resort-detail', resortId],
    queryFn: async () => {
      if (!resortId) return null;

      // Get guests in house
      const { count: guestsInHouse } = await supabase
        .from('guests')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', resortId)
        .lte('check_in_date', today)
        .gte('check_out_date', today);

      // Get loyalty program
      const { data: loyaltyProgram } = await supabase
        .from('loyalty_programs')
        .select('*, loyalty_members(count)')
        .eq('resort_id', resortId)
        .maybeSingle();

      // Get pre-arrival settings
      const { data: prearrivalSettings } = await supabase
        .from('prearrival_settings')
        .select('*')
        .eq('resort_id', resortId)
        .maybeSingle();

      // Get staff count
      const { count: staffCount } = await supabase
        .from('resort_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', resortId);

      // Get activity count
      const { count: activityCount } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', resortId)
        .eq('is_active', true);

      // Get restaurant count
      const { count: restaurantCount } = await supabase
        .from('restaurants')
        .select('*', { count: 'exact', head: true })
        .eq('resort_id', resortId)
        .eq('is_active', true);

      // Get recent feedback
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const { data: feedback } = await supabase
        .from('stay_feedback')
        .select('overall_rating')
        .eq('resort_id', resortId)
        .gte('created_at', sevenDaysAgo.toISOString());

      const avgRating = feedback && feedback.length > 0
        ? (feedback.reduce((sum, f) => sum + f.overall_rating, 0) / feedback.length).toFixed(1)
        : null;

      return {
        guestsInHouse: guestsInHouse || 0,
        loyaltyProgram,
        loyaltyMemberCount: loyaltyProgram?.loyalty_members?.[0]?.count || 0,
        prearrivalSettings,
        staffCount: staffCount || 0,
        activityCount: activityCount || 0,
        restaurantCount: restaurantCount || 0,
        avgRating,
        feedbackCount: feedback?.length || 0,
      };
    },
    enabled: !!resortId,
  });

  // Update tier mutation
  const updateTierMutation = useMutation({
    mutationFn: async (tier: SubscriptionTier) => {
      if (!resortId) throw new Error('No resort ID');
      
      const oldTier = resort?.subscription_tier || 'ESSENTIAL';
      
      const { error } = await supabase
        .from('resorts')
        .update({ subscription_tier: tier })
        .eq('id', resortId);

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_admin_action', {
        p_action: 'update_resort_plan',
        p_resort_id: resortId,
        p_metadata: { old_tier: oldTier, new_tier: tier },
      });

      return tier;
    },
    onSuccess: (tier) => {
      queryClient.invalidateQueries({ queryKey: ['resorts'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin-resort-detail'] });
      toast.success(`Plan updated to ${getTierInfo(tier).name}`);
      setTierDialogOpen(false);
    },
    onError: (error) => {
      console.error('Error updating tier:', error);
      toast.error('Failed to update plan tier');
    },
  });

  const handleOpenTierDialog = () => {
    setNewTier(resort?.subscription_tier || 'ESSENTIAL');
    setTierDialogOpen(true);
  };

  const handleUpdateTier = () => {
    updateTierMutation.mutate(newTier);
  };

  const handleSwitchToResort = () => {
    if (resort) {
      setCurrentResort(resort);
      navigate('/staff/dashboard');
    }
  };

  const currentTier = (resort?.subscription_tier || 'ESSENTIAL') as SubscriptionTier;
  const isDowngrade = newTier !== currentTier && 
    ['ESSENTIAL', 'PROFESSIONAL', 'ELITE'].indexOf(newTier) < 
    ['ESSENTIAL', 'PROFESSIONAL', 'ELITE'].indexOf(currentTier);

  const featuresLostOnDowngrade = KEY_FEATURES.filter(f => 
    tierHasFeature(currentTier, f.key) && !tierHasFeature(newTier, f.key)
  );

  if (!resort) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Button variant="ghost" onClick={() => navigate('/superadmin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="text-center py-16 text-muted-foreground">
          Resort not found.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/superadmin')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <Button onClick={handleSwitchToResort}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Staff Console
        </Button>
      </div>

      <PageHeader
        title={resort.name}
        description={`Resort code: ${resort.code}`}
      />

      {/* Resort Summary Cards */}
      <KpiGrid columns="grid-cols-1 xs:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Guests In House"
          value={isLoading ? '—' : resortData?.guestsInHouse || 0}
          icon={Users}
          helperText="Currently checked in"
          loading={isLoading}
        />
        <KpiCard
          label="Staff Members"
          value={isLoading ? '—' : resortData?.staffCount || 0}
          icon={Shield}
          helperText="Active team members"
          loading={isLoading}
        />
        <KpiCard
          label="Activities"
          value={isLoading ? '—' : resortData?.activityCount || 0}
          icon={Calendar}
          helperText="Active activities"
          loading={isLoading}
        />
        <KpiCard
          label="Restaurants"
          value={isLoading ? '—' : resortData?.restaurantCount || 0}
          icon={Utensils}
          helperText="Active restaurants"
          loading={isLoading}
        />
      </KpiGrid>

      {/* Plan & Features */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Plan Tier Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Subscription Plan
            </CardTitle>
            <CardDescription>Manage this resort's plan tier</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={`${getTierInfo(currentTier).color} text-white`}>
                    {getTierInfo(currentTier).name}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {getTierInfo(currentTier).description}
                  </span>
                </div>
              </div>
              <Button onClick={handleOpenTierDialog}>
                Change Plan
              </Button>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={resort.status === 'ACTIVE' ? 'default' : 'outline'}>
                {resort.is_demo ? 'DEMO' : resort.status}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Features Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Feature Status
            </CardTitle>
            <CardDescription>Key features available for this tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {KEY_FEATURES.map(feature => {
                const available = tierHasFeature(currentTier, feature.key);
                return (
                  <div key={feature.key} className="flex items-center justify-between">
                    <span className={available ? '' : 'text-muted-foreground'}>
                      {feature.label}
                    </span>
                    <Badge 
                      variant={available ? 'default' : 'outline'}
                      className={available ? 'bg-success/10 text-success border-success/30' : ''}
                    >
                      {available ? 'Enabled' : `${getTierInfo(feature.tier).name}+`}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Config Status */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Loyalty Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Loyalty Program
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : resortData?.loyaltyProgram ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={resortData.loyaltyProgram.is_enabled ? 'default' : 'outline'}>
                    {resortData.loyaltyProgram.is_enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Members</span>
                  <span className="font-medium">{resortData.loyaltyMemberCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Currency</span>
                  <span className="font-medium">{resortData.loyaltyProgram.currency_name}</span>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => {
                    setCurrentResort(resort);
                    navigate('/staff/loyalty/settings');
                  }}
                >
                  Edit Loyalty Settings
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No loyalty program configured</p>
                {tierHasFeature(currentTier, 'loyalty_program') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => {
                      setCurrentResort(resort);
                      navigate('/staff/loyalty/settings');
                    }}
                  >
                    Set Up Loyalty
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pre-arrival Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Pre-Arrival
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : resortData?.prearrivalSettings ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={resortData.prearrivalSettings.is_enabled ? 'default' : 'outline'}>
                    {resortData.prearrivalSettings.is_enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Opens</span>
                  <span className="font-medium">
                    {resortData.prearrivalSettings.open_days_before_checkin} days before check-in
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Activity Booking</span>
                  <Badge variant={resortData.prearrivalSettings.allow_activity_bookings ? 'default' : 'outline'}>
                    {resortData.prearrivalSettings.allow_activity_bookings ? 'Allowed' : 'Disabled'}
                  </Badge>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => {
                    setCurrentResort(resort);
                    navigate('/staff/settings/prearrival');
                  }}
                >
                  Edit Pre-Arrival Settings
                </Button>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p>No pre-arrival settings configured</p>
                {tierHasFeature(currentTier, 'guest_portal_pre_arrival') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => {
                      setCurrentResort(resort);
                      navigate('/staff/settings/prearrival');
                    }}
                  >
                    Set Up Pre-Arrival
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feedback Summary */}
      {resortData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Guest Feedback (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Star className="h-6 w-6 text-warning fill-warning" />
                <span className="text-2xl font-bold">
                  {resortData.avgRating || '—'}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                Based on {resortData.feedbackCount} reviews
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Tier Dialog */}
      <Dialog open={tierDialogOpen} onOpenChange={setTierDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Subscription Plan</DialogTitle>
            <DialogDescription>
              Update the plan tier for {resort.name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label>New Plan Tier</Label>
              <Select value={newTier} onValueChange={(v) => setNewTier(v as SubscriptionTier)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['ESSENTIAL', 'PROFESSIONAL', 'ELITE'] as SubscriptionTier[]).map(tier => (
                    <SelectItem key={tier} value={tier}>
                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${getTierInfo(tier).color}`} />
                        {getTierInfo(tier).name} — {getTierInfo(tier).description}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isDowngrade && featuresLostOnDowngrade.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Downgrade Warning</AlertTitle>
                <AlertDescription>
                  The following features will no longer be available:
                  <ul className="list-disc list-inside mt-2">
                    {featuresLostOnDowngrade.map(f => (
                      <li key={f.key}>{f.label}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-sm">
                    Existing data will be preserved but features will be hidden from the UI.
                  </p>
                </AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateTier} 
              disabled={updateTierMutation.isPending || newTier === currentTier}
            >
              {updateTierMutation.isPending ? 'Updating...' : 'Update Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
