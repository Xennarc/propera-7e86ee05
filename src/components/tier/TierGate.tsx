import { ReactNode } from 'react';
import { useTierAccess } from '@/hooks/useTierAccess';
import { TierFeature, getTierInfo } from '@/lib/tier-features';
import { Lock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TierGateProps {
  feature: TierFeature;
  children: ReactNode;
  /** What to show when feature is locked */
  fallback?: 'hide' | 'disabled' | 'upgrade-prompt';
  /** Custom fallback component */
  customFallback?: ReactNode;
  /** For disabled mode - wrap element in tooltip */
  disabledTooltip?: string;
}

/**
 * Gate component that shows/hides content based on tier access
 */
export function TierGate({
  feature,
  children,
  fallback = 'hide',
  customFallback,
  disabledTooltip,
}: TierGateProps) {
  const { hasFeature, getUpgradeTier, getFeatureName } = useTierAccess();

  const hasAccess = hasFeature(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  // Custom fallback takes precedence
  if (customFallback) {
    return <>{customFallback}</>;
  }

  const upgradeTier = getUpgradeTier(feature);
  const featureName = getFeatureName(feature);
  const tierInfo = upgradeTier ? getTierInfo(upgradeTier) : null;

  switch (fallback) {
    case 'hide':
      return null;

    case 'disabled':
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="opacity-50 pointer-events-none">{children}</div>
            </TooltipTrigger>
            <TooltipContent>
              <p>
                {disabledTooltip ||
                  `${featureName} requires ${tierInfo?.name || 'upgrade'}`}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );

    case 'upgrade-prompt':
      return (
        <div className="border border-dashed border-border rounded-lg p-4 bg-muted/30">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">{featureName}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Upgrade to {tierInfo?.name} to unlock this feature.
          </p>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Upgrade to {tierInfo?.name}
          </Button>
        </div>
      );

    default:
      return null;
  }
}

/**
 * Simple badge showing the required tier for a feature
 */
export function TierBadge({ feature }: { feature: TierFeature }) {
  const { getRequiredTier } = useTierAccess();
  const requiredTier = getRequiredTier(feature);
  const tierInfo = getTierInfo(requiredTier);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white ${tierInfo.color}`}
    >
      {tierInfo.name}
    </span>
  );
}
