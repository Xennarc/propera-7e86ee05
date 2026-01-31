/**
 * Feature Entitlement Evaluation
 * 
 * Determines if a feature is entitled based on:
 * 1. Global feature flag state
 * 2. Resort-level overrides
 * 3. Tier-based access
 * 4. Add-on category unlocks
 * 
 * This is ADDITIVE: add-ons provide an "OR unlock" path, 
 * they never replace tier checks.
 */

import { tierHasFeature, SubscriptionTier, TierFeature } from './tier-features';
import type { FeatureFlagCategory } from '@/hooks/useAddonEntitlements';

// ==========================================
// Types
// ==========================================

export interface FeatureFlagInfo {
  key: string;
  is_enabled: boolean;
  category: string;
  tier?: string | null;
  resort_id?: string | null;
}

export interface EntitlementContext {
  /** Resort's subscription tier */
  resortTier: SubscriptionTier;
  /** Categories unlocked via active add-ons */
  entitledCategories: FeatureFlagCategory[];
  /** Optional: Resort-level flag overrides (key -> enabled) */
  resortOverrides?: Map<string, boolean>;
}

export interface EntitlementResult {
  /** Whether the feature is entitled */
  entitled: boolean;
  /** Reason for the entitlement decision */
  reason: EntitlementReason;
  /** Source of the entitlement (for UI display) */
  source: 'tier' | 'addon' | 'override' | 'disabled';
}

export type EntitlementReason =
  | 'global_disabled'     // Global flag is OFF
  | 'override_enabled'    // Resort override says ON
  | 'override_disabled'   // Resort override says OFF
  | 'tier_granted'        // Tier includes this feature
  | 'addon_unlocked'      // Add-on category includes this feature
  | 'not_entitled';       // No tier or addon grant

// ==========================================
// Core Entitlement Function
// ==========================================

/**
 * Evaluate if a feature is entitled for a resort
 * 
 * Decision order:
 * 1. If global flag is OFF → false
 * 2. If resort-level override exists → obey override
 * 3. If tier includes feature → true
 * 4. If add-on unlocks the category → true
 * 5. Otherwise → false
 */
export function isEntitledForFeature(
  flag: FeatureFlagInfo,
  context: EntitlementContext
): EntitlementResult {
  const { resortTier, entitledCategories, resortOverrides } = context;

  // Step 1: Check global flag state
  // If the flag has no resort_id (global) and is disabled, block access
  if (!flag.resort_id && !flag.is_enabled) {
    return {
      entitled: false,
      reason: 'global_disabled',
      source: 'disabled',
    };
  }

  // Step 2: Check resort-level override
  if (resortOverrides?.has(flag.key)) {
    const overrideValue = resortOverrides.get(flag.key)!;
    return {
      entitled: overrideValue,
      reason: overrideValue ? 'override_enabled' : 'override_disabled',
      source: 'override',
    };
  }

  // Step 3: Check tier-based access
  // Try to map flag.key to a TierFeature
  const tierFeatureKey = flag.key.replace('enable_', '') as TierFeature;
  if (tierHasFeature(resortTier, tierFeatureKey)) {
    return {
      entitled: true,
      reason: 'tier_granted',
      source: 'tier',
    };
  }

  // Step 4: Check add-on category unlock
  const flagCategory = flag.category as FeatureFlagCategory;
  if (entitledCategories.includes(flagCategory)) {
    return {
      entitled: true,
      reason: 'addon_unlocked',
      source: 'addon',
    };
  }

  // Step 5: Not entitled
  return {
    entitled: false,
    reason: 'not_entitled',
    source: 'disabled',
  };
}

/**
 * Simplified check - just returns boolean
 */
export function checkFeatureEntitlement(
  flag: FeatureFlagInfo,
  context: EntitlementContext
): boolean {
  return isEntitledForFeature(flag, context).entitled;
}

/**
 * Get all entitled features for a resort
 */
export function getEntitledFeatures(
  flags: FeatureFlagInfo[],
  context: EntitlementContext
): string[] {
  return flags
    .filter((flag) => checkFeatureEntitlement(flag, context))
    .map((flag) => flag.key);
}

/**
 * Get entitlement summary for display
 */
export function getEntitlementSummary(
  flags: FeatureFlagInfo[],
  context: EntitlementContext
): {
  total: number;
  entitled: number;
  byTier: number;
  byAddon: number;
  byOverride: number;
  disabled: number;
} {
  const results = flags.map((flag) => isEntitledForFeature(flag, context));

  return {
    total: flags.length,
    entitled: results.filter((r) => r.entitled).length,
    byTier: results.filter((r) => r.reason === 'tier_granted').length,
    byAddon: results.filter((r) => r.reason === 'addon_unlocked').length,
    byOverride: results.filter(
      (r) => r.reason === 'override_enabled'
    ).length,
    disabled: results.filter((r) => !r.entitled).length,
  };
}

/**
 * Get reason display text
 */
export function getEntitlementReasonText(reason: EntitlementReason): string {
  switch (reason) {
    case 'global_disabled':
      return 'Globally disabled';
    case 'override_enabled':
      return 'Enabled by override';
    case 'override_disabled':
      return 'Disabled by override';
    case 'tier_granted':
      return 'Included in plan';
    case 'addon_unlocked':
      return 'Unlocked by add-on';
    case 'not_entitled':
      return 'Not entitled';
  }
}
