import { useResort } from '@/contexts/ResortContext';
import {
  SubscriptionTier,
  TierFeature,
  tierHasFeature,
  getUpgradeTierForFeature,
  getTierInfo,
  getFeatureTier,
  FEATURE_NAMES,
} from '@/lib/tier-features';

interface TierAccessResult {
  // Current tier info
  currentTier: SubscriptionTier;
  tierInfo: ReturnType<typeof getTierInfo>;
  isLoading: boolean;

  // Feature access checks
  hasFeature: (feature: TierFeature) => boolean;
  getUpgradeTier: (feature: TierFeature) => SubscriptionTier | null;
  getFeatureName: (feature: TierFeature) => string;
  getRequiredTier: (feature: TierFeature) => SubscriptionTier;

  // Tier comparisons
  isEssential: boolean;
  isProfessional: boolean;
  isElite: boolean;
  isAtLeastProfessional: boolean;
  isAtLeastElite: boolean;
}

/**
 * Hook to check tier-based feature access for the current resort
 */
export function useTierAccess(): TierAccessResult {
  const { currentResort, loading } = useResort();

  // Default to ESSENTIAL if no resort or tier not set
  const currentTier: SubscriptionTier =
    (currentResort?.subscription_tier as SubscriptionTier) ?? 'ESSENTIAL';

  const tierInfo = getTierInfo(currentTier);

  return {
    currentTier,
    tierInfo,
    isLoading: loading,

    hasFeature: (feature: TierFeature) => tierHasFeature(currentTier, feature),
    getUpgradeTier: (feature: TierFeature) => getUpgradeTierForFeature(currentTier, feature),
    getFeatureName: (feature: TierFeature) => FEATURE_NAMES[feature],
    getRequiredTier: (feature: TierFeature) => getFeatureTier(feature),

    isEssential: currentTier === 'ESSENTIAL',
    isProfessional: currentTier === 'PROFESSIONAL',
    isElite: currentTier === 'ELITE',
    isAtLeastProfessional: currentTier === 'PROFESSIONAL' || currentTier === 'ELITE',
    isAtLeastElite: currentTier === 'ELITE',
  };
}
