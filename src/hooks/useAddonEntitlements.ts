import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/query-keys';
import { logPricingError } from '@/lib/platform-error-logger';

// ==========================================
// Types
// ==========================================

export type FeatureFlagCategory = 'core' | 'guest' | 'premium' | 'experimental' | 'danger';

export interface AddonFeatureCategory {
  id: string;
  addon_key: string;
  category: FeatureFlagCategory;
  created_at: string;
}

export interface FeatureFlagForCategory {
  key: string;
  label: string;
  category: string;
  description: string | null;
}

export interface CategoryWithFlags {
  category: FeatureFlagCategory;
  flags: FeatureFlagForCategory[];
  flagCount: number;
}

export interface AddonWithCategories {
  addonKey: string;
  categories: FeatureFlagCategory[];
  flagCounts: Record<FeatureFlagCategory, number>;
}

// ==========================================
// Category metadata
// ==========================================

export const CATEGORY_METADATA: Record<FeatureFlagCategory, {
  label: string;
  description: string;
  variant: 'default' | 'warning' | 'destructive' | 'secondary';
}> = {
  core: {
    label: 'Core',
    description: 'Essential module toggles for the platform',
    variant: 'default',
  },
  guest: {
    label: 'Guest',
    description: 'Guest portal and self-service features',
    variant: 'secondary',
  },
  premium: {
    label: 'Premium',
    description: 'Advanced features for higher-tier plans',
    variant: 'default',
  },
  experimental: {
    label: 'Experimental',
    description: 'Beta features that may change or be removed',
    variant: 'warning',
  },
  danger: {
    label: 'Danger',
    description: 'High-risk system flags that affect platform stability',
    variant: 'destructive',
  },
};

export const ALL_CATEGORIES: FeatureFlagCategory[] = [
  'core',
  'guest',
  'premium',
  'experimental',
  'danger',
];

// ==========================================
// Query Hooks
// ==========================================

/**
 * Fetch all addon-to-category mappings
 */
export function useAddonFeatureCategories() {
  return useQuery({
    queryKey: queryKeys.pricing.addonCategories(),
    queryFn: async (): Promise<AddonFeatureCategory[]> => {
      const { data, error } = await supabase
        .from('addon_feature_categories')
        .select('*')
        .order('addon_key');

      if (error) {
        logPricingError('fetch_addon_feature_categories', error.message);
        throw error;
      }

      return (data || []) as AddonFeatureCategory[];
    },
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch global feature flags grouped by category
 */
export function useFeatureFlagsByCategory() {
  return useQuery({
    queryKey: queryKeys.pricing.featureFlagsByCategory(),
    queryFn: async (): Promise<CategoryWithFlags[]> => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('key, label, category, description')
        .is('resort_id', null) // Global flags only
        .order('key');

      if (error) {
        logPricingError('fetch_feature_flags_by_category', error.message);
        throw error;
      }

      // Group by category
      const groupedMap = new Map<FeatureFlagCategory, FeatureFlagForCategory[]>();
      
      for (const cat of ALL_CATEGORIES) {
        groupedMap.set(cat, []);
      }

      for (const flag of data || []) {
        const cat = flag.category as FeatureFlagCategory;
        if (groupedMap.has(cat)) {
          groupedMap.get(cat)!.push({
            key: flag.key,
            label: flag.label,
            category: flag.category,
            description: flag.description,
          });
        }
      }

      return ALL_CATEGORIES.map((cat) => ({
        category: cat,
        flags: groupedMap.get(cat) || [],
        flagCount: (groupedMap.get(cat) || []).length,
      }));
    },
    staleTime: 5 * 60 * 1000, // Flags don't change often
  });
}

/**
 * Derive addon categories map from raw data
 */
export function useAddonCategoriesMap() {
  const { data: mappings } = useAddonFeatureCategories();
  const { data: categoryData } = useFeatureFlagsByCategory();

  // Build flag counts per category
  const flagCountsByCategory: Record<FeatureFlagCategory, number> = {
    core: 0,
    guest: 0,
    premium: 0,
    experimental: 0,
    danger: 0,
  };

  if (categoryData) {
    for (const c of categoryData) {
      flagCountsByCategory[c.category] = c.flagCount;
    }
  }

  // Build addon -> categories map
  const addonMap = new Map<string, AddonWithCategories>();

  if (mappings) {
    for (const m of mappings) {
      if (!addonMap.has(m.addon_key)) {
        addonMap.set(m.addon_key, {
          addonKey: m.addon_key,
          categories: [],
          flagCounts: { ...flagCountsByCategory },
        });
      }
      addonMap.get(m.addon_key)!.categories.push(m.category);
    }
  }

  return {
    addonMap,
    flagCountsByCategory,
    isLoading: !mappings || !categoryData,
  };
}

// ==========================================
// Mutation Hooks
// ==========================================

export function useUpdateAddonEntitlements() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      addonKey: string;
      categories: FeatureFlagCategory[];
    }) => {
      const { addonKey, categories } = params;

      // 1. Delete existing mappings for this addon
      const { error: deleteError } = await supabase
        .from('addon_feature_categories')
        .delete()
        .eq('addon_key', addonKey);

      if (deleteError) {
        logPricingError('delete_addon_entitlements', deleteError.message, { addonKey });
        throw deleteError;
      }

      // 2. Insert new mappings
      if (categories.length > 0) {
        const rows = categories.map((cat) => ({
          addon_key: addonKey,
          category: cat,
        }));

        const { error: insertError } = await supabase
          .from('addon_feature_categories')
          .insert(rows);

        if (insertError) {
          logPricingError('insert_addon_entitlements', insertError.message, { addonKey, categories });
          throw insertError;
        }
      }

      // 3. Audit log
      await supabase.from('admin_audit_logs').insert({
        actor_id: user?.id || '00000000-0000-0000-0000-000000000000',
        action: 'update_addon_entitlements',
        metadata_json: {
          addon_key: addonKey,
          categories,
          updated_at: new Date().toISOString(),
        },
      });
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.addonCategories() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.changeLog() });
      toast.success('Entitlements updated', {
        description: `Updated categories for ${params.addonKey}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to update entitlements', { description: error.message });
    },
  });
}
