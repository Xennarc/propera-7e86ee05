/**
 * FlagEntitlementBadges
 * 
 * Displays how a feature flag is entitled - by tier and/or add-ons.
 * Shows minimum tier badge and add-on unlock chips with links to Plans page.
 */

import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Crown, Package, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type AddonInfo,
  getMinimumTier,
  TIER_LABELS,
  TIER_COLORS,
  formatAddonPrice,
  useCategoryAddonMappings,
} from '@/hooks/useFlagEntitlements';
import type { FeatureFlagCategory } from '@/hooks/useAddonEntitlements';

interface FlagEntitlementBadgesProps {
  category: string;
  tier: string | null;
  compact?: boolean;
  className?: string;
}

export function FlagEntitlementBadges({
  category,
  tier,
  compact = false,
  className,
}: FlagEntitlementBadgesProps) {
  const { data: categoryMap, isLoading } = useCategoryAddonMappings();
  
  const minTier = getMinimumTier(tier);
  const addons = categoryMap?.get(category as FeatureFlagCategory) || [];

  if (isLoading) {
    return <Skeleton className="h-5 w-24" />;
  }

  const hasEntitlements = minTier || addons.length > 0;

  if (!hasEntitlements) {
    return (
      <span className="text-xs text-muted-foreground italic">
        No entitlement
      </span>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {minTier && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn("text-[9px] px-1.5 py-0 gap-0.5", TIER_COLORS[minTier])}
              >
                <Crown className="h-2.5 w-2.5" />
                {TIER_LABELS[minTier]}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Minimum tier: {TIER_LABELS[minTier]}
            </TooltipContent>
          </Tooltip>
        )}
        {addons.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 gap-0.5 bg-accent/10"
              >
                <Package className="h-2.5 w-2.5" />
                {addons.length} add-on{addons.length !== 1 ? 's' : ''}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="font-medium text-xs mb-1">Unlocked by add-ons:</p>
              <ul className="text-xs space-y-0.5">
                {addons.map((addon) => (
                  <li key={addon.key} className="flex items-center gap-2">
                    <span>{addon.name}</span>
                    <span className="text-muted-foreground">
                      {formatAddonPrice(addon.monthly_price_cents, addon.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {/* Tier badge */}
      {minTier && (
        <Badge
          variant="outline"
          className={cn("text-[10px] px-2 py-0.5 gap-1", TIER_COLORS[minTier])}
        >
          <Crown className="h-3 w-3" />
          {TIER_LABELS[minTier]}+
        </Badge>
      )}

      {/* Add-on badges */}
      {addons.map((addon) => (
        <AddonChip key={addon.key} addon={addon} />
      ))}

      {/* No add-on message */}
      {addons.length === 0 && !minTier && (
        <span className="text-xs text-muted-foreground">
          No add-on tied to this category
        </span>
      )}
    </div>
  );
}

function AddonChip({ addon }: { addon: AddonInfo }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={`/superadmin/plans?tab=addons&addon=${addon.key}`}
          className="inline-flex"
        >
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-2 py-0.5 gap-1 cursor-pointer transition-colors",
              "hover:bg-accent/20",
              addon.is_active
                ? "bg-accent/10 border-accent/30"
                : "bg-muted/30 border-muted-foreground/30 opacity-60"
            )}
          >
            <Package className="h-3 w-3" />
            {addon.name}
            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
          </Badge>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="space-y-1">
          <p className="font-medium">{addon.name}</p>
          <p className="text-muted-foreground">
            {formatAddonPrice(addon.monthly_price_cents, addon.currency)}
          </p>
          {!addon.is_active && (
            <p className="text-warning text-[10px]">Add-on is inactive</p>
          )}
          <p className="text-[10px] text-muted-foreground">
            Click to view in Plans
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Inline display for category-level entitlement info
 */
interface CategoryEntitlementInfoProps {
  category: FeatureFlagCategory;
}

export function CategoryEntitlementInfo({ category }: CategoryEntitlementInfoProps) {
  const { data: categoryMap, isLoading } = useCategoryAddonMappings();
  const addons = categoryMap?.get(category) || [];

  if (isLoading) {
    return <Skeleton className="h-4 w-32" />;
  }

  if (addons.length === 0) {
    return (
      <span className="text-xs text-muted-foreground">
        No add-on tied to this category
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {addons.map((addon) => (
        <AddonChip key={addon.key} addon={addon} />
      ))}
    </div>
  );
}
