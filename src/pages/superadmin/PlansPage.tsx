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
  Calendar,
  DollarSign,
  ExternalLink,
  Send,
  Package,
  Info,
  Layers,
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

const TIER_ORDER: SubscriptionTier[] = ['ESSENTIAL', 'PROFESSIONAL', 'ELITE'];

export default function PlansPage() {
  const { data: tierStats, isLoading: isLoadingStats } = useTierStats();
  const { data: planPricing, isLoading: isLoadingPlans } = usePlanPricing();
  const { data: addonPricing, isLoading: isLoadingAddons } = useAddonPricing();
  const publishPricing = usePublishPricing();

  const estimatedMRR = calculateEstimatedMRR(tierStats, planPricing);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
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
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <a href="/pricing" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Pricing Page
            </a>
          </Button>
          <Button
            size="sm"
            onClick={() => publishPricing.mutate()}
            disabled={publishPricing.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            {publishPricing.isPending ? 'Publishing...' : 'Publish Pricing'}
          </Button>
        </div>
      </div>

      {/* Platform Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Resorts by Tier */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Total Resorts</p>
                {isLoadingStats ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">{tierStats?.total || 0}</p>
                )}
              </div>
            </div>
            {!isLoadingStats && tierStats && (
              <div className="mt-3 flex gap-2 flex-wrap">
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
          </CardContent>
        </Card>

        {/* Estimated MRR */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Estimated MRR</p>
                {isLoadingStats || isLoadingPlans ? (
                  <Skeleton className="h-7 w-24 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-success">
                    ${estimatedMRR.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Paid */}
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl p-2.5 bg-info/10">
                <TrendingUp className="h-5 w-5 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Active Paid</p>
                {isLoadingStats ? (
                  <Skeleton className="h-7 w-16 mt-1" />
                ) : (
                  <p className="text-2xl font-bold">
                    {(tierStats?.distribution.PROFESSIONAL || 0) +
                      (tierStats?.distribution.ELITE || 0)}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expiring Soon */}
        <Card>
          <CardContent className="pt-5">
            <TooltipProvider>
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2.5 bg-warning/10">
                  <Calendar className="h-5 w-5 text-warning" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-xs font-medium text-muted-foreground">Expiring Soon</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-3 w-3 text-muted-foreground/50 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Subscriptions expiring within 30 days</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  {isLoadingStats ? (
                    <Skeleton className="h-7 w-12 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold text-warning">
                      {tierStats?.expiringSoon || 0}
                    </p>
                  )}
                </div>
              </div>
            </TooltipProvider>
          </CardContent>
        </Card>
      </div>

      {/* Pricing Configuration */}
      <Card>
        <CardHeader>
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

      {/* Guardrails / Source of Truth */}
      <Card className="border-info/30 bg-info/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Info className="h-5 w-5 text-info" />
            Source of Truth
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>Tier features</strong> (what each plan includes) are defined in{' '}
            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">src/lib/tier-features.ts</code>{' '}
            and controlled via Feature Flags.
          </p>
          <p>
            <strong>Pricing values</strong> (monthly costs) are now managed in the database and
            displayed on the public pricing page.
          </p>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
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
                    <p className="font-medium">Tier Management</p>
                    <p className="text-sm text-muted-foreground">Change resort subscription tiers</p>
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
                    <p className="font-medium">Feature Flags</p>
                    <p className="text-sm text-muted-foreground">Control features by tier and resort</p>
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
