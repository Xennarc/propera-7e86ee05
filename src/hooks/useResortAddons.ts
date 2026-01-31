/**
 * useResortAddons
 * 
 * Hook for managing resort add-ons and deriving entitled categories.
 * Add-ons unlock feature flag categories for specific resorts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/query-keys';
import type { FeatureFlagCategory } from './useAddonEntitlements';

// ==========================================
// Types
// ==========================================

export interface ResortAddon {
  id: string;
  resort_id: string;
  addon_key: string;
  is_active: boolean;
  started_at: string;
  ends_at: string | null;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined fields
  addon_name?: string;
  addon_description?: string | null;
  monthly_price_cents?: number;
  currency?: string;
  unlocked_categories?: FeatureFlagCategory[];
}

export interface AddonForSelection {
  key: string;
  name: string;
  description: string | null;
  monthly_price_cents: number;
  currency: string;
  is_active: boolean;
  categories: FeatureFlagCategory[];
}

// ==========================================
// Query Hooks
// ==========================================

/**
 * Fetch all active add-ons for a resort
 */
export function useResortAddons(resortId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.resorts.addons(resortId || ''),
    queryFn: async (): Promise<ResortAddon[]> => {
      if (!resortId) return [];

      // Use the view for rich data
      const { data, error } = await supabase
        .from('resort_addons_with_details_v')
        .select('*')
        .eq('resort_id', resortId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useResortAddons] Error:', error);
        throw error;
      }

      return (data || []).map((row) => ({
        id: row.id,
        resort_id: row.resort_id,
        addon_key: row.addon_key,
        is_active: row.is_active,
        started_at: row.started_at,
        ends_at: row.ends_at,
        metadata_json: row.metadata_json as Record<string, unknown>,
        created_at: row.created_at,
        updated_at: row.updated_at,
        addon_name: row.addon_name,
        addon_description: row.addon_description,
        monthly_price_cents: row.monthly_price_cents,
        currency: row.currency,
        unlocked_categories: row.unlocked_categories as FeatureFlagCategory[],
      }));
    },
    enabled: !!resortId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch entitled categories for a resort (via DB function)
 */
export function useResortEntitledCategories(resortId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.resorts.entitledCategories(resortId || ''),
    queryFn: async (): Promise<FeatureFlagCategory[]> => {
      if (!resortId) return [];

      const { data, error } = await supabase
        .rpc('get_resort_entitled_categories', { p_resort_id: resortId });

      if (error) {
        console.error('[useResortEntitledCategories] Error:', error);
        throw error;
      }

      return (data || []) as FeatureFlagCategory[];
    },
    enabled: !!resortId,
    staleTime: 60 * 1000,
  });
}

/**
 * Fetch all available add-ons with their categories (for selection UI)
 */
export function useAvailableAddons() {
  return useQuery({
    queryKey: queryKeys.pricing.addonsWithCategories(),
    queryFn: async (): Promise<AddonForSelection[]> => {
      // Get all active addons
      const { data: addons, error: addonsError } = await supabase
        .from('addon_pricing')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (addonsError) throw addonsError;

      // Get category mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('addon_feature_categories')
        .select('addon_key, category');

      if (mappingsError) throw mappingsError;

      // Build category map
      const categoryMap = new Map<string, FeatureFlagCategory[]>();
      for (const m of mappings || []) {
        if (!categoryMap.has(m.addon_key)) {
          categoryMap.set(m.addon_key, []);
        }
        categoryMap.get(m.addon_key)!.push(m.category as FeatureFlagCategory);
      }

      return (addons || []).map((addon) => ({
        key: addon.key,
        name: addon.name,
        description: addon.description,
        monthly_price_cents: addon.monthly_price_cents,
        currency: addon.currency,
        is_active: addon.is_active,
        categories: categoryMap.get(addon.key) || [],
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

// ==========================================
// Mutation Hooks
// ==========================================

export function useToggleResortAddon() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      resortId: string;
      addonKey: string;
      enabled: boolean;
    }) => {
      const { resortId, addonKey, enabled } = params;

      if (enabled) {
        // Upsert to enable
        const { error } = await supabase
          .from('resort_addons')
          .upsert(
            {
              resort_id: resortId,
              addon_key: addonKey,
              is_active: true,
              started_at: new Date().toISOString(),
              ends_at: null,
            },
            { onConflict: 'resort_id,addon_key' }
          );

        if (error) throw error;
      } else {
        // Update to disable (soft disable)
        const { error } = await supabase
          .from('resort_addons')
          .update({ is_active: false, ends_at: new Date().toISOString() })
          .eq('resort_id', resortId)
          .eq('addon_key', addonKey);

        if (error) throw error;
      }

      // Audit log
      await supabase.from('admin_audit_logs').insert({
        actor_id: user?.id || '00000000-0000-0000-0000-000000000000',
        action: enabled ? 'resort_addon_enabled' : 'resort_addon_disabled',
        resort_id: resortId,
        metadata_json: {
          addon_key: addonKey,
          action: enabled ? 'enabled' : 'disabled',
          timestamp: new Date().toISOString(),
        },
      });

      return { resortId, addonKey, enabled };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resorts.addons(result.resortId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.resorts.entitledCategories(result.resortId) });
      toast.success(
        result.enabled ? 'Add-on enabled for resort' : 'Add-on disabled for resort'
      );
    },
    onError: (error: Error) => {
      toast.error('Failed to update add-on', { description: error.message });
    },
  });
}

export function useRemoveResortAddon() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: { resortId: string; addonKey: string }) => {
      const { resortId, addonKey } = params;

      const { error } = await supabase
        .from('resort_addons')
        .delete()
        .eq('resort_id', resortId)
        .eq('addon_key', addonKey);

      if (error) throw error;

      // Audit log
      await supabase.from('admin_audit_logs').insert({
        actor_id: user?.id || '00000000-0000-0000-0000-000000000000',
        action: 'resort_addon_removed',
        resort_id: resortId,
        metadata_json: {
          addon_key: addonKey,
          timestamp: new Date().toISOString(),
        },
      });

      return { resortId, addonKey };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resorts.addons(result.resortId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.resorts.entitledCategories(result.resortId) });
      toast.success('Add-on removed from resort');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove add-on', { description: error.message });
    },
  });
}
