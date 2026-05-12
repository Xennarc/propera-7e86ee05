import { describe, it, expect } from 'vitest';
import {
  isEntitledForFeature,
  checkFeatureEntitlement,
  getEntitledFeatures,
  getEntitlementSummary,
  getEntitlementReasonText,
  FeatureFlagInfo,
  EntitlementContext
} from './feature-entitlements';
import { SubscriptionTier } from './tier-features';
import type { FeatureFlagCategory } from '@/hooks/useAddonEntitlements';

describe('feature-entitlements', () => {
  describe('isEntitledForFeature', () => {
    it('step 1: returns false when global flag is disabled', () => {
      const flag: FeatureFlagInfo = {
        key: 'enable_premium_feature',
        is_enabled: false,
        category: 'premium',
        resort_id: null, // global flag
      };
      const context: EntitlementContext = {
        resortTier: 'ELITE' as SubscriptionTier,
        entitledCategories: ['premium'],
      };

      const result = isEntitledForFeature(flag, context);

      expect(result).toEqual({
        entitled: false,
        reason: 'global_disabled',
        source: 'disabled',
      });
    });

    it('step 2: returns true when resort override is true', () => {
      const flag: FeatureFlagInfo = {
        key: 'enable_some_feature',
        is_enabled: true,
        category: 'core',
      };
      const resortOverrides = new Map<string, boolean>();
      resortOverrides.set('enable_some_feature', true);

      const context: EntitlementContext = {
        resortTier: 'ESSENTIAL' as SubscriptionTier,
        entitledCategories: [],
        resortOverrides,
      };

      const result = isEntitledForFeature(flag, context);

      expect(result).toEqual({
        entitled: true,
        reason: 'override_enabled',
        source: 'override',
      });
    });

    it('step 2: returns false when resort override is false', () => {
      const flag: FeatureFlagInfo = {
        key: 'enable_some_feature',
        is_enabled: true,
        category: 'core',
      };
      const resortOverrides = new Map<string, boolean>();
      resortOverrides.set('enable_some_feature', false);

      const context: EntitlementContext = {
        resortTier: 'ELITE' as SubscriptionTier, // Even if elite, override takes precedence
        entitledCategories: ['core'],
        resortOverrides,
      };

      const result = isEntitledForFeature(flag, context);

      expect(result).toEqual({
        entitled: false,
        reason: 'override_disabled',
        source: 'override',
      });
    });

    it('step 3: returns true when tier includes feature', () => {
      const flag: FeatureFlagInfo = {
        key: 'enable_activities_recurring', // mapped to 'activities_recurring' which is PROFESSIONAL
        is_enabled: true,
        category: 'premium',
      };

      const context: EntitlementContext = {
        resortTier: 'PROFESSIONAL' as SubscriptionTier,
        entitledCategories: [],
      };

      const result = isEntitledForFeature(flag, context);

      expect(result).toEqual({
        entitled: true,
        reason: 'tier_granted',
        source: 'tier',
      });
    });

    it('step 4: returns true when add-on unlocks the category', () => {
      const flag: FeatureFlagInfo = {
        key: 'enable_reports_ai_insights', // mapped to 'reports_ai_insights' which is ELITE
        is_enabled: true,
        category: 'experimental',
      };

      const context: EntitlementContext = {
        resortTier: 'PROFESSIONAL' as SubscriptionTier, // Tier doesn't have it
        entitledCategories: ['experimental'] as FeatureFlagCategory[], // But addon unlocks it
      };

      const result = isEntitledForFeature(flag, context);

      expect(result).toEqual({
        entitled: true,
        reason: 'addon_unlocked',
        source: 'addon',
      });
    });

    it('step 5: returns false when not entitled by any means', () => {
      const flag: FeatureFlagInfo = {
        key: 'enable_loyalty_program', // ELITE feature
        is_enabled: true,
        category: 'premium',
      };

      const context: EntitlementContext = {
        resortTier: 'PROFESSIONAL' as SubscriptionTier,
        entitledCategories: ['guest'] as FeatureFlagCategory[], // wrong category
      };

      const result = isEntitledForFeature(flag, context);

      expect(result).toEqual({
        entitled: false,
        reason: 'not_entitled',
        source: 'disabled',
      });
    });
  });

  describe('checkFeatureEntitlement', () => {
    it('returns boolean from isEntitledForFeature', () => {
      const flag: FeatureFlagInfo = {
        key: 'enable_guest_portal_basic',
        is_enabled: true,
        category: 'guest',
      };

      const context: EntitlementContext = {
        resortTier: 'ESSENTIAL' as SubscriptionTier,
        entitledCategories: [],
      };

      expect(checkFeatureEntitlement(flag, context)).toBe(true);
    });
  });

  describe('getEntitledFeatures', () => {
    it('returns only keys of entitled features', () => {
      const flags: FeatureFlagInfo[] = [
        { key: 'enable_guest_portal_basic', is_enabled: true, category: 'guest' }, // ESSENTIAL
        { key: 'enable_loyalty_program', is_enabled: true, category: 'premium' }, // ELITE
      ];

      const context: EntitlementContext = {
        resortTier: 'ESSENTIAL' as SubscriptionTier,
        entitledCategories: [],
      };

      const keys = getEntitledFeatures(flags, context);
      expect(keys).toEqual(['enable_guest_portal_basic']);
    });
  });

  describe('getEntitlementSummary', () => {
    it('summarizes entitlements correctly', () => {
      const resortOverrides = new Map<string, boolean>();
      resortOverrides.set('enable_test_override', true);

      const flags: FeatureFlagInfo[] = [
        { key: 'enable_guest_portal_basic', is_enabled: true, category: 'guest' }, // Tier granted (ESSENTIAL)
        { key: 'enable_reports_ai_insights', is_enabled: true, category: 'experimental' }, // Addon unlocked (this is an ELITE feature, so it won't be unlocked by ESSENTIAL tier)
        { key: 'enable_test_override', is_enabled: true, category: 'core' }, // Override enabled
        { key: 'loyalty_program', is_enabled: true, category: 'premium' }, // Not entitled
        { key: 'enable_global_off', is_enabled: false, category: 'core', resort_id: null }, // Global disabled
      ];

      const context: EntitlementContext = {
        resortTier: 'ESSENTIAL' as SubscriptionTier,
        entitledCategories: ['experimental'] as FeatureFlagCategory[],
        resortOverrides,
      };

      const summary = getEntitlementSummary(flags, context);
      expect(summary).toEqual({
        total: 5,
        entitled: 3,
        byTier: 1,
        byAddon: 1,
        byOverride: 1,
        disabled: 2,
      });
    });
  });

  describe('getEntitlementReasonText', () => {
    it('returns correct display text for all reasons', () => {
      expect(getEntitlementReasonText('global_disabled')).toBe('Globally disabled');
      expect(getEntitlementReasonText('override_enabled')).toBe('Enabled by override');
      expect(getEntitlementReasonText('override_disabled')).toBe('Disabled by override');
      expect(getEntitlementReasonText('tier_granted')).toBe('Included in plan');
      expect(getEntitlementReasonText('addon_unlocked')).toBe('Unlocked by add-on');
      expect(getEntitlementReasonText('not_entitled')).toBe('Not entitled');
    });
  });
});
