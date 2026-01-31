/**
 * ResortAddonsSection
 * 
 * UI for managing add-ons assigned to a resort.
 * Shows active add-ons, unlocked categories, and allows toggling.
 */

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  Check,
  Sparkles,
  Shield,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useResortAddons,
  useResortEntitledCategories,
  useAvailableAddons,
  useToggleResortAddon,
  type AddonForSelection,
} from '@/hooks/useResortAddons';
import { CATEGORY_METADATA, type FeatureFlagCategory } from '@/hooks/useAddonEntitlements';
import { formatAddonPrice } from '@/hooks/useFlagEntitlements';

interface ResortAddonsSectionProps {
  resortId: string;
  resortName?: string;
}

export function ResortAddonsSection({ resortId, resortName }: ResortAddonsSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: resortAddons, isLoading: loadingAddons } = useResortAddons(resortId);
  const { data: entitledCategories, isLoading: loadingCategories } = useResortEntitledCategories(resortId);
  const { data: availableAddons, isLoading: loadingAvailable } = useAvailableAddons();
  const toggleAddon = useToggleResortAddon();

  const isLoading = loadingAddons || loadingCategories || loadingAvailable;

  // Build set of active addon keys
  const activeAddonKeys = new Set(
    resortAddons?.filter((a) => a.is_active).map((a) => a.addon_key) || []
  );

  const handleToggle = (addonKey: string, enabled: boolean) => {
    toggleAddon.mutate({ resortId, addonKey, enabled });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">Add-ons</span>
              <Badge variant="outline" className="text-[10px]">
                {activeAddonKeys.size} active
              </Badge>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform',
                isExpanded && 'rotate-180'
              )}
            />
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent className="pt-3 space-y-4">
          {/* Unlocked Categories Summary */}
          {entitledCategories && entitledCategories.length > 0 && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">
                  Unlocked Categories
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {entitledCategories.map((cat) => (
                  <CategoryBadge key={cat} category={cat} />
                ))}
              </div>
            </div>
          )}

          {/* Available Add-ons */}
          <div className="space-y-2">
            {availableAddons?.map((addon) => (
              <AddonRow
                key={addon.key}
                addon={addon}
                isActive={activeAddonKeys.has(addon.key)}
                onToggle={(enabled) => handleToggle(addon.key, enabled)}
                isPending={toggleAddon.isPending}
              />
            ))}

            {(!availableAddons || availableAddons.length === 0) && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                No add-ons configured yet.
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </TooltipProvider>
  );
}

function AddonRow({
  addon,
  isActive,
  onToggle,
  isPending,
}: {
  addon: AddonForSelection;
  isActive: boolean;
  onToggle: (enabled: boolean) => void;
  isPending: boolean;
}) {
  const hasCategories = addon.categories.length > 0;

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        isActive
          ? 'bg-primary/5 border-primary/30'
          : 'bg-muted/20 border-border/40'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{addon.name}</span>
            <Badge variant="outline" className="text-[9px]">
              {formatAddonPrice(addon.monthly_price_cents, addon.currency)}
            </Badge>
          </div>
          {addon.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {addon.description}
            </p>
          )}
          {hasCategories && (
            <div className="flex flex-wrap gap-1 mt-2">
              {addon.categories.map((cat) => (
                <CategoryBadge key={cat} category={cat} small />
              ))}
            </div>
          )}
          {!hasCategories && (
            <p className="text-[10px] text-muted-foreground mt-1 italic">
              No categories assigned to this add-on
            </p>
          )}
        </div>
        <Switch
          checked={isActive}
          onCheckedChange={onToggle}
          disabled={isPending}
          className="mt-0.5"
        />
      </div>
    </div>
  );
}

function CategoryBadge({
  category,
  small = false,
}: {
  category: FeatureFlagCategory;
  small?: boolean;
}) {
  const meta = CATEGORY_METADATA[category];
  if (!meta) return null;

  const Icon = getCategoryIcon(category);

  const variants: Record<string, string> = {
    default: 'bg-primary/10 text-primary border-primary/30',
    warning: 'bg-warning/10 text-warning border-warning/30',
    destructive: 'bg-destructive/10 text-destructive border-destructive/30',
    secondary: 'bg-secondary text-secondary-foreground border-secondary',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            small ? 'text-[9px] px-1.5 py-0' : 'text-[10px] px-2 py-0.5',
            'gap-1',
            variants[meta.variant] || variants.default
          )}
        >
          <Icon className={small ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
          {meta.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-xs">
        {meta.description}
      </TooltipContent>
    </Tooltip>
  );
}

function getCategoryIcon(category: FeatureFlagCategory) {
  switch (category) {
    case 'core':
      return Package;
    case 'guest':
      return Sparkles;
    case 'premium':
      return Zap;
    case 'experimental':
      return AlertTriangle;
    case 'danger':
      return Shield;
    default:
      return Package;
  }
}

/**
 * Compact summary for inline display
 */
export function ResortAddonsCompact({ resortId }: { resortId: string }) {
  const { data: resortAddons, isLoading } = useResortAddons(resortId);
  const { data: entitledCategories } = useResortEntitledCategories(resortId);

  if (isLoading) {
    return <Skeleton className="h-5 w-20" />;
  }

  const activeCount = resortAddons?.filter((a) => a.is_active).length || 0;

  if (activeCount === 0) {
    return (
      <span className="text-xs text-muted-foreground italic">No add-ons</span>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-[10px] gap-1">
              <Package className="h-2.5 w-2.5" />
              {activeCount} add-on{activeCount !== 1 ? 's' : ''}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <div className="space-y-1">
              <p className="font-medium">Active Add-ons:</p>
              <ul className="text-muted-foreground">
                {resortAddons
                  ?.filter((a) => a.is_active)
                  .map((a) => (
                    <li key={a.addon_key}>• {a.addon_name || a.addon_key}</li>
                  ))}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>

        {entitledCategories && entitledCategories.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="text-[10px] gap-1">
                <Sparkles className="h-2.5 w-2.5" />
                {entitledCategories.length} categories
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <div className="space-y-1">
                <p className="font-medium">Unlocked Categories:</p>
                <ul className="text-muted-foreground">
                  {entitledCategories.map((cat) => (
                    <li key={cat}>• {CATEGORY_METADATA[cat]?.label || cat}</li>
                  ))}
                </ul>
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
