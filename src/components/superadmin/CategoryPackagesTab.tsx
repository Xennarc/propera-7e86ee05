/**
 * CategoryPackagesTab
 * 
 * Shows feature flag categories with their add-on mappings
 * and tier coverage for operator-friendly pricing overview.
 */

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import {
  Package,
  ChevronDown,
  Plus,
  AlertTriangle,
  Shield,
  Sparkles,
  Zap,
  Box,
  ExternalLink,
  Users,
  Crown,
  Check,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import { FEATURE_FLAG_REGISTRY, type FeatureFlagDefinition } from '@/lib/feature-flag-registry';
import { CATEGORY_METADATA, useAddonFeatureCategories, useUpdateAddonEntitlements, type FeatureFlagCategory } from '@/hooks/useAddonEntitlements';
import { useAddonPricing, formatCentsToDisplay } from '@/hooks/usePricingManagement';
import { getTierInfo, type SubscriptionTier } from '@/lib/tier-features';
import { toast } from 'sonner';

// ==========================================
// Types
// ==========================================

interface CategoryPackage {
  category: FeatureFlagCategory;
  flags: FeatureFlagDefinition[];
  addons: Array<{
    key: string;
    name: string;
    monthly_price_cents: number;
    currency: string;
  }>;
  tierCoverage: {
    tier: SubscriptionTier;
    count: number;
  }[];
}

// ==========================================
// Hook for category package data
// ==========================================

function useCategoryPackages() {
  const { data: addonPricing, isLoading: loadingAddons } = useAddonPricing();
  const { data: categoryMappings, isLoading: loadingMappings } = useAddonFeatureCategories();

  const packages = useMemo<CategoryPackage[]>(() => {
    const categories: FeatureFlagCategory[] = ['core', 'guest', 'premium', 'experimental', 'danger'];
    
    return categories.map((category) => {
      // Get flags for this category
      const flags = FEATURE_FLAG_REGISTRY.filter((f) => f.category === category);

      // Get add-ons that include this category
      const addonKeysForCategory = categoryMappings
        ?.filter((m) => m.category === category)
        .map((m) => m.addon_key) || [];

      const addons = (addonPricing || [])
        .filter((a) => addonKeysForCategory.includes(a.key))
        .map((a) => ({
          key: a.key,
          name: a.name,
          monthly_price_cents: a.monthly_price_cents,
          currency: a.currency,
        }));

      // Calculate tier coverage
      const tierCoverage: CategoryPackage['tierCoverage'] = [];
      const tiers: SubscriptionTier[] = ['ESSENTIAL', 'PROFESSIONAL', 'ELITE'];
      
      for (const tier of tiers) {
        const count = flags.filter((f) => {
          if (!f.tier) return true; // null tier = all tiers have it
          const tierOrder = { starter: 0, professional: 1, enterprise: 2 };
          const flagTierIndex = tierOrder[f.tier as keyof typeof tierOrder] ?? 0;
          const currentTierIndex = { ESSENTIAL: 0, PROFESSIONAL: 1, ELITE: 2 }[tier];
          return currentTierIndex >= flagTierIndex;
        }).length;
        
        tierCoverage.push({ tier, count });
      }

      return { category, flags, addons, tierCoverage };
    });
  }, [addonPricing, categoryMappings]);

  return {
    packages,
    isLoading: loadingAddons || loadingMappings,
  };
}

// ==========================================
// Main Component
// ==========================================

export function CategoryPackagesTab() {
  const { packages, isLoading } = useCategoryPackages();
  const [assignDialog, setAssignDialog] = useState<{
    open: boolean;
    category: FeatureFlagCategory | null;
  }>({ open: false, category: null });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-info/10 border border-info/30">
          <Info className="h-5 w-5 text-info mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm">Category Packages</p>
            <p className="text-xs text-muted-foreground mt-1">
              Each category groups related feature flags. Assign categories to add-ons 
              to create pricing packages. Resorts with active add-ons unlock all flags in assigned categories.
            </p>
          </div>
        </div>

        {/* Category Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          {packages.map((pkg) => (
            <CategoryPackageCard
              key={pkg.category}
              package={pkg}
              onAssign={() => setAssignDialog({ open: true, category: pkg.category })}
            />
          ))}
        </div>

        {/* Assign to Add-on Dialog */}
        <AssignToAddonDialog
          open={assignDialog.open}
          category={assignDialog.category}
          onOpenChange={(open) => setAssignDialog({ open, category: open ? assignDialog.category : null })}
        />
      </div>
    </TooltipProvider>
  );
}

// ==========================================
// Category Package Card
// ==========================================

function CategoryPackageCard({
  package: pkg,
  onAssign,
}: {
  package: CategoryPackage;
  onAssign: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const meta = CATEGORY_METADATA[pkg.category];
  const Icon = getCategoryIcon(pkg.category);

  const isWarning = pkg.category === 'experimental' || pkg.category === 'danger';

  return (
    <Card
      className={cn(
        'transition-colors',
        isWarning && 'border-warning/40 bg-warning/5'
      )}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'rounded-lg p-2',
                pkg.category === 'core' && 'bg-primary/10',
                pkg.category === 'guest' && 'bg-info/10',
                pkg.category === 'premium' && 'bg-success/10',
                pkg.category === 'experimental' && 'bg-warning/10',
                pkg.category === 'danger' && 'bg-destructive/10'
              )}
            >
              <Icon
                className={cn(
                  'h-4 w-4',
                  pkg.category === 'core' && 'text-primary',
                  pkg.category === 'guest' && 'text-info',
                  pkg.category === 'premium' && 'text-success',
                  pkg.category === 'experimental' && 'text-warning',
                  pkg.category === 'danger' && 'text-destructive'
                )}
              />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{meta?.label || pkg.category}</h3>
              <p className="text-xs text-muted-foreground">{meta?.description}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">
            {pkg.flags.length} flags
          </Badge>
        </div>

        {/* Warning for experimental/danger */}
        {isWarning && (
          <div className="flex items-center gap-2 p-2 rounded-lg bg-warning/10 text-warning text-xs">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>
              {pkg.category === 'danger'
                ? 'Contains sensitive operations'
                : 'Experimental features may change'}
            </span>
          </div>
        )}

        {/* Add-ons Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Sold via Add-ons</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2"
              onClick={onAssign}
            >
              <Plus className="h-3 w-3 mr-1" />
              Assign
            </Button>
          </div>
          {pkg.addons.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {pkg.addons.map((addon) => (
                <Link
                  key={addon.key}
                  to={`/superadmin/plans?addon=${addon.key}`}
                  className="inline-flex"
                >
                  <Badge
                    variant="secondary"
                    className="text-[10px] gap-1 hover:bg-primary/10 cursor-pointer transition-colors"
                  >
                    <Package className="h-2.5 w-2.5" />
                    {addon.name}
                    <span className="text-muted-foreground">
                      ({formatCentsToDisplay(addon.monthly_price_cents)})
                    </span>
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground italic">
              Not assigned to any add-on
            </p>
          )}
        </div>

        {/* Tier Coverage */}
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Tier Coverage
          </span>
          <div className="flex gap-2">
            {pkg.tierCoverage.map(({ tier, count }) => {
              const info = getTierInfo(tier);
              const percentage = pkg.flags.length > 0 
                ? Math.round((count / pkg.flags.length) * 100) 
                : 0;
              return (
                <Tooltip key={tier}>
                  <TooltipTrigger asChild>
                    <div className="flex-1 p-2 rounded-lg bg-muted/30 text-center">
                      <div className="text-xs font-medium">{info.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {count}/{pkg.flags.length} ({percentage}%)
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {count} of {pkg.flags.length} flags included in {info.name}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Expandable Flags List */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs justify-between"
            >
              <span>View flags</span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 transition-transform',
                  isExpanded && 'rotate-180'
                )}
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg bg-muted/20 p-2">
              {pkg.flags.map((flag) => (
                <FlagRow key={flag.key} flag={flag} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}

// ==========================================
// Flag Row (inside expanded list)
// ==========================================

function FlagRow({ flag }: { flag: FeatureFlagDefinition }) {
  const tierLabel = flag.tier
    ? getTierInfo(
        flag.tier === 'starter'
          ? 'ESSENTIAL'
          : flag.tier === 'professional'
          ? 'PROFESSIONAL'
          : 'ELITE'
      ).name
    : 'All tiers';

  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded bg-background/50 text-xs">
      <div className="min-w-0 flex-1">
        <span className="font-medium truncate block">{flag.label}</span>
        <code className="text-[9px] text-muted-foreground">{flag.key}</code>
      </div>
      <Badge variant="outline" className="text-[9px] shrink-0">
        {tierLabel}+
      </Badge>
    </div>
  );
}

// ==========================================
// Assign to Add-on Dialog
// ==========================================

function AssignToAddonDialog({
  open,
  category,
  onOpenChange,
}: {
  open: boolean;
  category: FeatureFlagCategory | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedAddon, setSelectedAddon] = useState<string>('');
  const { data: addonPricing, isLoading } = useAddonPricing();
  const { data: categoryMappings } = useAddonFeatureCategories();
  const updateCategories = useUpdateAddonEntitlements();

  // Find add-ons that already have this category
  const existingAddonKeys = useMemo(() => {
    return categoryMappings
      ?.filter((m) => m.category === category)
      .map((m) => m.addon_key) || [];
  }, [categoryMappings, category]);

  const handleAssign = async () => {
    if (!selectedAddon || !category) return;

    // Get current categories for the selected addon
    const currentCategories = categoryMappings
      ?.filter((m) => m.addon_key === selectedAddon)
      .map((m) => m.category as FeatureFlagCategory) || [];

    // Add the new category if not already present
    if (!currentCategories.includes(category)) {
      updateCategories.mutate(
        {
          addonKey: selectedAddon,
          categories: [...currentCategories, category],
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            setSelectedAddon('');
          },
        }
      );
    } else {
      toast.info('Category already assigned to this add-on');
    }
  };

  const meta = category ? CATEGORY_METADATA[category] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Assign Category to Add-on
          </DialogTitle>
          <DialogDescription>
            {meta
              ? `Assign "${meta.label}" to an add-on to include its ${
                  FEATURE_FLAG_REGISTRY.filter((f) => f.category === category).length
                } flags.`
              : 'Select a category to assign.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {existingAddonKeys.length > 0 && (
            <div className="p-3 rounded-lg bg-muted/30 text-xs">
              <span className="text-muted-foreground">Already assigned to: </span>
              {existingAddonKeys.map((key, i) => (
                <span key={key}>
                  <span className="font-medium">
                    {addonPricing?.find((a) => a.key === key)?.name || key}
                  </span>
                  {i < existingAddonKeys.length - 1 && ', '}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Select Add-on</label>
            <Select value={selectedAddon} onValueChange={setSelectedAddon}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an add-on..." />
              </SelectTrigger>
              <SelectContent>
                {addonPricing?.map((addon) => {
                  const alreadyHas = existingAddonKeys.includes(addon.key);
                  return (
                    <SelectItem
                      key={addon.key}
                      value={addon.key}
                      disabled={alreadyHas}
                    >
                      <div className="flex items-center gap-2">
                        <span>{addon.name}</span>
                        <span className="text-muted-foreground text-xs">
                          ({formatCentsToDisplay(addon.monthly_price_cents)})
                        </span>
                        {alreadyHas && (
                          <Check className="h-3.5 w-3.5 text-success" />
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedAddon || updateCategories.isPending}
          >
            {updateCategories.isPending ? 'Assigning...' : 'Assign Category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==========================================
// Helper
// ==========================================

function getCategoryIcon(category: FeatureFlagCategory) {
  switch (category) {
    case 'core':
      return Box;
    case 'guest':
      return Users;
    case 'premium':
      return Crown;
    case 'experimental':
      return Zap;
    case 'danger':
      return Shield;
    default:
      return Package;
  }
}
