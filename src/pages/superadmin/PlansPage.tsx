import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  ArrowRight,
  ToggleRight,
  Settings,
  Building2,
  TrendingUp,
  DollarSign,
  ExternalLink,
  Send,
  Package,
  Info,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import { getTierInfo, type SubscriptionTier } from '@/lib/tier-features';
import {
  useTierStats,
  usePlanPricing,
  useAddonPricing,
  usePublishPricing,
  formatCentsToDisplay,
  calculateEstimatedMRR,
} from '@/hooks/usePricingManagement';
import { PlanPricingTable } from '@/components/superadmin/PlanPricingTable';
import { AddonPricingTable } from '@/components/superadmin/AddonPricingTable';
import { SubscriptionHealthSection } from '@/components/superadmin/SubscriptionHealthSection';
import { PricingChangeLogDrawer } from '@/components/superadmin/PricingChangeLogDrawer';
import { useAlertStats } from '@/hooks/useSubscriptionAlerts';

const TIER_ORDER: SubscriptionTier[] = ['ESSENTIAL', 'PROFESSIONAL', 'ELITE'];

export default function PlansPage() {
  const { data: tierStats, isLoading: isLoadingStats } = useTierStats();
  const { data: planPricing, isLoading: isLoadingPlans } = usePlanPricing();
  const { data: addonPricing, isLoading: isLoadingAddons } = useAddonPricing();
  const { data: alertStats, isLoading: isLoadingAlerts } = useAlertStats();
  const publishPricing = usePublishPricing();

  const estimatedMRR = calculateEstimatedMRR(tierStats, planPricing);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header - matches Feature Flags structure */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-primary" />
            Plans & Billing
          </h1>
          <p className="text-muted-foreground mt-1">
            Platform pricing, tiers, and subscription health.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PricingChangeLogDrawer />
          <Button variant="outline" size="sm" asChild>
            <a href="/pricing" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Pricing
            </a>
          </Button>
          <Button
            size="sm"
            onClick={() => publishPricing.mutate()}
            disabled={publishPricing.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            {publishPricing.isPending ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </div>

      {/* Filters / Scope Card - matches Feature Flags pattern */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Platform Overview Stats inline */}
            <div className="flex items-center gap-6 flex-wrap flex-1">
              {/* Total Resorts */}
              <div className="flex items-center gap-2">
                <div className="rounded-lg p-2 bg-primary/10">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Resorts</p>
                  {isLoadingStats ? (
                    <Skeleton className="h-5 w-8" />
                  ) : (
                    <p className="font-semibold">{tierStats?.total || 0}</p>
                  )}
                </div>
              </div>

              {/* Estimated MRR */}
              <div className="flex items-center gap-2">
                <div className="rounded-lg p-2 bg-success/10">
                  <DollarSign className="h-4 w-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Est. MRR</p>
                  {isLoadingStats || isLoadingPlans ? (
                    <Skeleton className="h-5 w-16" />
                  ) : (
                    <p className="font-semibold text-success">
                      ${estimatedMRR.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Paid Resorts */}
              <div className="flex items-center gap-2">
                <div className="rounded-lg p-2 bg-info/10">
                  <TrendingUp className="h-4 w-4 text-info" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                  {isLoadingStats ? (
                    <Skeleton className="h-5 w-8" />
                  ) : (
                    <p className="font-semibold">
                      {(tierStats?.distribution.PROFESSIONAL || 0) +
                        (tierStats?.distribution.ELITE || 0)}
                    </p>
                  )}
                </div>
              </div>

              {/* Alerts */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <div className={`rounded-lg p-2 ${alertStats && alertStats.total > 0 ? 'bg-warning/20' : 'bg-warning/10'}`}>
                        <AlertTriangle className={`h-4 w-4 ${alertStats && alertStats.total > 0 ? 'text-warning' : 'text-muted-foreground'}`} />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Alerts</p>
                        {isLoadingAlerts ? (
                          <Skeleton className="h-5 w-8" />
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <p className={`font-semibold ${alertStats && alertStats.total > 0 ? 'text-warning' : ''}`}>
                              {alertStats?.total || 0}
                            </p>
                            {alertStats && alertStats.expired > 0 && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0">
                                {alertStats.expired}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Expiring: {alertStats?.expiringSoon || 0} | Expired: {alertStats?.expired || 0}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {/* Tier Distribution Badges */}
            {!isLoadingStats && tierStats && (
              <div className="flex gap-2 flex-wrap">
                {TIER_ORDER.map((tier) => {
                  const count = tierStats.distribution[tier] || 0;
                  const info = getTierInfo(tier);
                  return (
                    <Badge
                      key={tier}
                      variant="outline"
                      className={`text-[10px] ${
                        tier === 'ELITE'
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : tier === 'PROFESSIONAL'
                            ? 'bg-info/10 text-info border-info/30'
                            : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {info.name}: {count}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pricing Configuration - matches Feature Flags tabs pattern */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Pricing Configuration
          </CardTitle>
          <CardDescription>
            Manage plan and add-on pricing. Changes are logged and require publishing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="plans">
            <TabsList className="grid w-full max-w-sm grid-cols-2 mb-6">
              <TabsTrigger value="plans" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Plans
              </TabsTrigger>
              <TabsTrigger value="addons" className="gap-2">
                <Package className="h-4 w-4" />
                Add-ons
              </TabsTrigger>
            </TabsList>

            <TabsContent value="plans">
              <PlanPricingTable plans={planPricing} isLoading={isLoadingPlans} />
            </TabsContent>

            <TabsContent value="addons">
              <AddonPricingTable addons={addonPricing} isLoading={isLoadingAddons} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Subscription Health Section */}
      <SubscriptionHealthSection />

      {/* Source of Truth - Info Banner style matching Feature Flags */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-info/10 border border-info/30">
        <Info className="h-5 w-5 text-info mt-0.5" />
        <div>
          <p className="font-medium text-sm">Source of Truth</p>
          <p className="text-xs text-muted-foreground mt-1">
            <strong>Tier features</strong> are defined in{' '}
            <code className="text-[10px] bg-muted px-1 py-0.5 rounded">src/lib/tier-features.ts</code>{' '}
            and controlled via Feature Flags.{' '}
            <strong>Pricing values</strong> are managed in the database.
          </p>
        </div>
      </div>

      {/* Quick Links - matches Feature Flags card styling */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Quick Links</CardTitle>
          <CardDescription>Jump to related management tools</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/staff/settings/subscriptions">
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Settings className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Tier Management</p>
                    <p className="text-xs text-muted-foreground">Change resort subscription tiers</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>

            <Link to="/superadmin/feature-flags">
              <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info/10">
                    <ToggleRight className="h-5 w-5 text-info" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Feature Flags</p>
                    <p className="text-xs text-muted-foreground">Control features by tier and resort</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
