/**
 * Hook for displaying feature flag entitlement information.
 * Shows how each flag/category is "sold" - by tier and/or add-on.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import { useMemo } from 'react';
import type { FeatureFlagCategory } from './useAddonEntitlements';

// ==========================================
// Types
// ==========================================

export interface AddonInfo {
  key: string;
  name: string;
  monthly_price_cents: number;
  currency: string;
  is_active: boolean;
}

export interface CategoryEntitlement {
  category: FeatureFlagCategory;
  addons: AddonInfo[];
}

export interface FlagEntitlement {
  flagKey: string;
  category: FeatureFlagCategory;
  tier: string | null;
  addons: AddonInfo[];
}

// ==========================================
// Tier utilities
// ==========================================

export const TIER_ORDER = ['starter', 'professional', 'enterprise'] as const;
export type TierLevel = typeof TIER_ORDER[number];

export const TIER_LABELS: Record<TierLevel, string> = {
  starter: 'Essential',
  professional: 'Professional',
  enterprise: 'Elite',
};

export const TIER_COLORS: Record<TierLevel, string> = {
  starter: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  professional: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  enterprise: 'bg-purple-500/10 text-purple-600 border-purple-500/30',
};

/**
 * Get the display-friendly minimum tier for a flag
 */
export function getMinimumTier(tier: string | null): TierLevel | null {
  if (!tier) return null;
  const normalized = tier.toLowerCase();
  if (TIER_ORDER.includes(normalized as TierLevel)) {
    return normalized as TierLevel;
  }
  return null;
}

// ==========================================
// Query Hook
// ==========================================

/**
 * Fetch addon info joined with category mappings
 */
export function useCategoryAddonMappings() {
  return useQuery({
    queryKey: queryKeys.pricing.categoryAddonMappings(),
    queryFn: async (): Promise<Map<FeatureFlagCategory, AddonInfo[]>> => {
      // Fetch addon_feature_categories joined with addon_pricing
      const { data, error } = await supabase
        .from('addon_feature_categories')
        .select(`
          category,
          addon_key,
          addon_pricing!inner (
            key,
            name,
            monthly_price_cents,
            currency,
            is_active
          )
        `);

      if (error) {
        console.error('[CategoryAddonMappings] Fetch error:', error);
        throw error;
      }

      // Build map: category -> addon[]
      const map = new Map<FeatureFlagCategory, AddonInfo[]>();

      for (const row of data || []) {
        const cat = row.category as FeatureFlagCategory;
        const addon = row.addon_pricing as unknown as AddonInfo;

        if (!map.has(cat)) {
          map.set(cat, []);
        }

        // Avoid duplicates
        const existing = map.get(cat)!;
        if (!existing.some((a) => a.key === addon.key)) {
          existing.push({
            key: addon.key,
            name: addon.name,
            monthly_price_cents: addon.monthly_price_cents,
            currency: addon.currency,
            is_active: addon.is_active,
          });
        }
      }

      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Get entitlement info for a specific flag
 */
export function useFlagEntitlement(
  flagKey: string,
  category: string,
  tier: string | null
) {
  const { data: categoryMap, isLoading } = useCategoryAddonMappings();

  const entitlement = useMemo((): FlagEntitlement => {
    const cat = category as FeatureFlagCategory;
    const addons = categoryMap?.get(cat) || [];

    return {
      flagKey,
      category: cat,
      tier,
      addons,
    };
  }, [flagKey, category, tier, categoryMap]);

  return { entitlement, isLoading };
}

/**
 * Get entitlement info for all flags by category
 */
export function useCategoryEntitlements() {
  const { data: categoryMap, isLoading } = useCategoryAddonMappings();

  const entitlements = useMemo((): CategoryEntitlement[] => {
    if (!categoryMap) return [];

    const categories: FeatureFlagCategory[] = ['core', 'guest', 'premium', 'experimental', 'danger'];
    
    return categories.map((cat) => ({
      category: cat,
      addons: categoryMap.get(cat) || [],
    }));
  }, [categoryMap]);

  return { entitlements, isLoading };
}

/**
 * Format price for display
 */
export function formatAddonPrice(cents: number, currency: string): string {
  if (cents === 0) return 'Free';
  const dollars = cents / 100;
  if (currency === 'USD') {
    return `$${dollars}/mo`;
  }
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars) + '/mo';
}
