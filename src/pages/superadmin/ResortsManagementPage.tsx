import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EmptyState } from '@/components/ui/empty-state';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { getTierInfo, SubscriptionTier } from '@/lib/tier-features';
import { format } from 'date-fns';
import {
  Building2,
  Search,
  Plus,
  CheckCircle,
  AlertCircle,
  Star,
} from 'lucide-react';
import { ResortActionsMenu } from '@/components/superadmin/ResortActionsMenu';
import { ResortSettingsDrawer } from '@/components/superadmin/ResortSettingsDrawer';
import { CreateResortDialog } from '@/components/resort/CreateResortDialog';

// Resort type for drawer
interface ResortForDrawer {
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

export default function ResortsManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { resorts, setCurrentResort, refetch: refetchResorts } = useResort();
  const [searchQuery, setSearchQuery] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [includeDemos, setIncludeDemos] = useState(true);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [selectedResort, setSelectedResort] = useState<ResortForDrawer | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const handleOpenSettings = useCallback((resort: ResortForDrawer) => {
    setSelectedResort(resort);
    setSettingsDrawerOpen(true);
  }, []);

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['resorts'] });
    queryClient.invalidateQueries({ queryKey: ['resorts-management-metrics'] });
    refetchResorts();
  }, [queryClient, refetchResorts]);

  // Filter resorts
  const filteredResorts = resorts.filter(r => {
    if (!includeDemos && r.is_demo) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (tierFilter !== 'all' && r.subscription_tier !== tierFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(query) || r.code.toLowerCase().includes(query);
    }
    return true;
  });

  // Fetch resort metrics
  const { data: resortMetrics, isLoading } = useQuery({
    queryKey: ['resorts-management-metrics', filteredResorts.map(r => r.id), today],
    queryFn: async () => {
      const metrics = await Promise.all(
        filteredResorts.map(async (resort) => {
          // Guests in house
          const { count: guestsInHouse } = await supabase
            .from('guests')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .lte('check_in_date', today)
            .gte('check_out_date', today);

          // Staff count
          const { count: staffCount } = await supabase
            .from('resort_memberships')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id);

          // Activity sessions
          const { count: sessionCount } = await supabase
            .from('activity_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .gte('date', today);

          // Restaurant slots
          const { count: slotCount } = await supabase
            .from('restaurant_time_slots')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .gte('date', today);

          // Check onboarding status
          const { count: activityCount } = await supabase
            .from('activities')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .eq('is_active', true);

          const { count: restaurantCount } = await supabase
            .from('restaurants')
            .select('*', { count: 'exact', head: true })
            .eq('resort_id', resort.id)
            .eq('is_active', true);

          const { data: prearrival } = await supabase
            .from('prearrival_settings')
            .select('is_enabled')
            .eq('resort_id', resort.id)
            .maybeSingle();

          // Use 7-step onboarding flags from resorts table for accurate progress
          // Fallback to live-count checks for legacy resorts without flags
          const onboardingChecks = {
            hasBasics: true, // Resort exists = basics done
            hasActivities: (activityCount || 0) > 0,
            hasRestaurants: (restaurantCount || 0) > 0,
            hasStaff: (staffCount || 0) > 0,
            hasBranding: resort.onboarding_branding_done || false,
            hasPrearrival: resort.onboarding_prearrival_done || prearrival?.is_enabled || false,
            hasPortal: resort.onboarding_portal_done || false,
          };

          const completedSteps = Object.values(onboardingChecks).filter(Boolean).length;
          const totalSteps = Object.keys(onboardingChecks).length; // 7 steps

          return {
            resortId: resort.id,
            guestsInHouse: guestsInHouse || 0,
            staffCount: staffCount || 0,
            sessionCount: sessionCount || 0,
            slotCount: slotCount || 0,
            onboardingProgress: Math.round((completedSteps / totalSteps) * 100),
            onboardingChecks,
          };
        })
      );

      return metrics.reduce((acc, m) => {
        acc[m.resortId] = m;
        return acc;
      }, {} as Record<string, typeof metrics[0]>);
    },
    enabled: filteredResorts.length > 0,
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

  const getHealthStatus = (metrics: typeof resortMetrics extends Record<string, infer T> ? T : never) => {
    if (!metrics) return 'unknown';
    if (metrics.onboardingProgress < 50) return 'critical';
    if (metrics.onboardingProgress < 100) return 'warning';
    return 'good';
  };

  const healthColors = {
    good: 'bg-success',
    warning: 'bg-warning',
    critical: 'bg-destructive',
    unknown: 'bg-muted',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            Resort Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage all resorts, configurations, and onboarding
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Resort
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
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
              </SelectContent>
            </Select>
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
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{filteredResorts.length}</p>
                <p className="text-xs text-muted-foreground">Total Resorts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {filteredResorts.filter(r => r.status === 'ACTIVE').length}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-warning/10">
                <AlertCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {resortMetrics ? Object.values(resortMetrics).filter(m => m.onboardingProgress < 100).length : 0}
                </p>
                <p className="text-xs text-muted-foreground">Incomplete Setup</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-info/10">
                <Star className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {filteredResorts.filter(r => r.subscription_tier === 'ELITE').length}
                </p>
                <p className="text-xs text-muted-foreground">Elite Tier</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resorts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Resorts</CardTitle>
          <CardDescription>
            {filteredResorts.length} resort{filteredResorts.length !== 1 ? 's' : ''}
            {searchQuery && ` matching "${searchQuery}"`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredResorts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resort</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Health</TableHead>
                  <TableHead className="text-center">Guests</TableHead>
                  <TableHead className="text-center">Staff</TableHead>
                  <TableHead className="text-center">Setup</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredResorts.map((resort) => {
                  const metrics = resortMetrics?.[resort.id];
                  const tierInfo = getTierInfo((resort.subscription_tier || 'ESSENTIAL') as SubscriptionTier);
                  const health = getHealthStatus(metrics);

                  return (
                    <TableRow key={resort.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{resort.name}</span>
                              {resort.is_demo && (
                                <Badge variant="outline" className="text-[9px] px-1">DEMO</Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{resort.code}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${tierInfo.color} text-[10px]`}>
                          {tierInfo.name}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={resort.status === 'ACTIVE' ? 'default' : 'outline'}>
                          {resort.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <div className={`h-3 w-3 rounded-full ${healthColors[health]}`} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{metrics?.guestsInHouse || 0}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{metrics?.staffCount || 0}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${metrics?.onboardingProgress === 100 ? 'bg-success' : 'bg-primary'}`}
                              style={{ width: `${metrics?.onboardingProgress || 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {metrics?.onboardingProgress || 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <ResortActionsMenu
                          resort={{
                            id: resort.id,
                            name: resort.name,
                            code: resort.code,
                            status: resort.status,
                            is_demo: resort.is_demo,
                            subscription_tier: resort.subscription_tier,
                          }}
                          onOpenSettings={handleOpenSettings}
                          onRefresh={handleRefresh}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              icon={Building2}
              title="No resorts found"
              description={searchQuery ? "No resorts match your search criteria" : "No resorts have been created yet"}
            />
          )}
        </CardContent>
      </Card>

      {/* Settings Drawer */}
      <ResortSettingsDrawer
        resort={selectedResort}
        open={settingsDrawerOpen}
        onOpenChange={setSettingsDrawerOpen}
        onRefresh={handleRefresh}
      />

      {/* Create Resort Dialog */}
      <CreateResortDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false);
          handleRefresh();
        }}
      />
    </div>
  );
}
