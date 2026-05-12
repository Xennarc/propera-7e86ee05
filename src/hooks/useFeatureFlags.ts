import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMemo } from 'react';

export interface FeatureFlag {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string;
  tier: string | null;
  is_enabled: boolean;
  is_dangerous: boolean;
  scope: 'global' | 'resort';
  resort_id: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const FEATURE_CATEGORIES: Record<string, { label: string; icon: string; color: string }> = {
  core: { label: 'Core Features', icon: 'Building2', color: 'text-primary' },
  guest: { label: 'Guest Portal', icon: 'ToggleRight', color: 'text-success' },
  premium: { label: 'Premium Features', icon: 'Zap', color: 'text-warning' },
  experimental: { label: 'Experimental', icon: 'FlaskConical', color: 'text-info' },
  danger: { label: 'Danger Zone', icon: 'AlertTriangle', color: 'text-destructive' },
};

// ═══════════════════════════════════════════════════════════════════════════
// FLAG MAP UTILITIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a lookup map from flags array
 */
export function buildFlagsMap(flags: FeatureFlag[]): Record<string, boolean> {
  const map: Record<string, boolean> = {};
  for (const flag of flags) {
    map[flag.key] = flag.is_enabled;
  }
  return map;
}

/**
 * Known module keys that act as parents
 */
const MODULE_KEYS = new Set([
  'enable_dashboards',
  'enable_guests',
  'enable_requests',
  'enable_transport',
  'enable_prearrival',
  'enable_reports',
  'enable_loyalty',
  'enable_guest_portal',
  'enable_activities',
  'enable_activities_ops',
  'enable_room_service',
]);

/**
 * Extract the parent module key from a sub-feature key.
 * 
 * Pattern: enable_<module>_<subfeature> → enable_<module>
 * 
 * Examples:
 *   enable_transport_guest_booking → enable_transport
 *   enable_guests_travel_party → enable_guests
 *   enable_dashboards → null (is itself a module)
 */
export function getParentModuleKey(key: string): string | null {
  // If it's a module key itself, no parent
  if (MODULE_KEYS.has(key)) {
    return null;
  }

  // Try to match against known module prefixes
  for (const moduleKey of MODULE_KEYS) {
    // Check if key starts with moduleKey + '_'
    if (key.startsWith(moduleKey + '_')) {
      return moduleKey;
    }
  }

  return null;
}

/**
 * Check if a feature flag is effectively enabled.
 * 
 * Rules:
 * - If key is a sub-feature (enable_<module>_<subfeature>):
 *   Requires BOTH parent module AND sub-feature to be enabled
 * - Otherwise: just check the key's own value
 * 
 * @param key - The feature flag key to check
 * @param flagsMap - Map of flag keys to their enabled state
 * @returns true if effectively enabled, false otherwise
 */
export function isEnabledEffective(key: string, flagsMap: Record<string, boolean>): boolean {
  const ownValue = flagsMap[key] ?? false;
  
  // If own value is false, no need to check parent
  if (!ownValue) {
    return false;
  }

  // Check for parent module dependency
  const parentKey = getParentModuleKey(key);
  if (parentKey) {
    const parentEnabled = flagsMap[parentKey] ?? false;
    return parentEnabled && ownValue;
  }

  return ownValue;
}

// ═══════════════════════════════════════════════════════════════════════════
// CORE HOOKS
// ═══════════════════════════════════════════════════════════════════════════

export function useFeatureFlags(resortId?: string) {
  return useQuery({
    queryKey: ['feature-flags', resortId],
    queryFn: async (): Promise<FeatureFlag[]> => {
      // Fetch global flags
      const { data: globalFlags, error: globalError } = await supabase
        .from('feature_flags')
        .select('*')
        .is('resort_id', null)
        .order('category', { ascending: true })
        .order('key', { ascending: true });

      if (globalError) throw globalError;

      // If a resort is specified, fetch resort-specific overrides
      if (resortId) {
        const { data: resortFlags, error: resortError } = await supabase
          .from('feature_flags')
          .select('*')
          .eq('resort_id', resortId);

        if (resortError) throw resortError;

        // Merge resort overrides into global flags
        const flagMap = new Map<string, FeatureFlag>();
        
        globalFlags?.forEach(flag => {
          flagMap.set(flag.key, { ...flag, scope: flag.scope as 'global' | 'resort' });
        });

        resortFlags?.forEach(override => {
          if (flagMap.has(override.key)) {
            flagMap.set(override.key, {
              ...flagMap.get(override.key)!,
              is_enabled: override.is_enabled,
              resort_id: override.resort_id,
              updated_at: override.updated_at,
            });
          }
        });

        return Array.from(flagMap.values());
      }

      return (globalFlags || []).map(f => ({ ...f, scope: f.scope as 'global' | 'resort' }));
    },
  });
}

/**
 * Hook that provides resolved feature flags with effective state calculation.
 * 
 * Returns:
 * - flags: The merged flag list (same as useFeatureFlags)
 * - flagsMap: A Record<key, boolean> for quick lookup
 * - isEnabled: Function to check if a flag is effectively enabled (respects parent deps)
 * - isLoading: Query loading state
 */
export function useResolvedFeatureFlags(resortId?: string) {
  const { data: flags, isLoading, error, refetch } = useFeatureFlags(resortId);

  const flagsMap = useMemo(() => {
    return buildFlagsMap(flags || []);
  }, [flags]);

  const isEnabled = useMemo(() => {
    return (key: string): boolean => isEnabledEffective(key, flagsMap);
  }, [flagsMap]);

  return {
    flags: flags || [],
    flagsMap,
    isEnabled,
    isLoading,
    error,
    refetch,
  };
}

export function useToggleFeatureFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      flagKey, 
      isEnabled, 
      resortId 
    }: { 
      flagKey: string; 
      isEnabled: boolean; 
      resortId?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      if (resortId) {
        // Check if override exists
        const { data: existing } = await supabase
          .from('feature_flags')
          .select('id')
          .eq('key', flagKey)
          .eq('resort_id', resortId)
          .single();

        if (existing) {
          // Update existing override
          const { error } = await supabase
            .from('feature_flags')
            .update({ 
              is_enabled: isEnabled, 
              updated_by: userId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

          if (error) throw error;
        } else {
          // Get global flag to copy properties
          const { data: globalFlag } = await supabase
            .from('feature_flags')
            .select('*')
            .eq('key', flagKey)
            .is('resort_id', null)
            .single();

          if (!globalFlag) throw new Error('Global flag not found');

          // Create resort override
          const { error } = await supabase
            .from('feature_flags')
            .insert({
              key: flagKey,
              label: globalFlag.label,
              description: globalFlag.description,
              category: globalFlag.category,
              tier: globalFlag.tier,
              is_enabled: isEnabled,
              is_dangerous: globalFlag.is_dangerous,
              scope: 'resort',
              resort_id: resortId,
              updated_by: userId,
            });

          if (error) throw error;
        }
      } else {
        // Update global flag
        const { error } = await supabase
          .from('feature_flags')
          .update({ 
            is_enabled: isEnabled, 
            updated_by: userId,
            updated_at: new Date().toISOString(),
          })
          .eq('key', flagKey)
          .is('resort_id', null);

        if (error) throw error;
      }

      // Log the activity
      await supabase.rpc('log_platform_activity', {
        p_event_type: 'feature_flag_toggled',
        p_resort_id: resortId || null,
        p_target_type: 'feature_flag',
        p_target_name: flagKey,
        p_metadata: { is_enabled: isEnabled, scope: resortId ? 'resort' : 'global' },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success('Feature flag updated');
    },
    onError: (error) => {
      toast.error('Failed to update feature flag');
      console.error(error);
    },
  });
}

export function useRemoveResortOverride() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ flagKey, resortId }: { flagKey: string; resortId: string }) => {
      const { error } = await supabase
        .from('feature_flags')
        .delete()
        .eq('key', flagKey)
        .eq('resort_id', resortId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success('Override removed');
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// BULK OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════

export function useBulkToggleFeatureFlags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      flagKeys, 
      isEnabled, 
      resortId 
    }: { 
      flagKeys: string[]; 
      isEnabled: boolean; 
      resortId?: string;
    }) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      for (const flagKey of flagKeys) {
        if (resortId) {
          // Check if override exists
          const { data: existing } = await supabase
            .from('feature_flags')
            .select('id')
            .eq('key', flagKey)
            .eq('resort_id', resortId)
            .single();

          if (existing) {
            await supabase
              .from('feature_flags')
              .update({ 
                is_enabled: isEnabled, 
                updated_by: userId,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);
          } else {
            // Get global flag to copy properties
            const { data: globalFlag } = await supabase
              .from('feature_flags')
              .select('*')
              .eq('key', flagKey)
              .is('resort_id', null)
              .single();

            if (globalFlag) {
              await supabase
                .from('feature_flags')
                .insert({
                  key: flagKey,
                  label: globalFlag.label,
                  description: globalFlag.description,
                  category: globalFlag.category,
                  tier: globalFlag.tier,
                  is_enabled: isEnabled,
                  is_dangerous: globalFlag.is_dangerous,
                  scope: 'resort',
                  resort_id: resortId,
                  updated_by: userId,
                });
            }
          }
        } else {
          // Update global flag
          await supabase
            .from('feature_flags')
            .update({ 
              is_enabled: isEnabled, 
              updated_by: userId,
              updated_at: new Date().toISOString(),
            })
            .eq('key', flagKey)
            .is('resort_id', null);
        }
      }

      // Log the bulk activity
      await supabase.rpc('log_platform_activity', {
        p_event_type: 'feature_flags_bulk_updated',
        p_resort_id: resortId || null,
        p_target_type: 'feature_flag',
        p_target_name: `${flagKeys.length} flags`,
        p_metadata: { 
          affected_keys: flagKeys, 
          action: isEnabled ? 'bulk_enable' : 'bulk_disable',
          scope: resortId ? 'resort' : 'global',
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success(`${variables.flagKeys.length} flags ${variables.isEnabled ? 'enabled' : 'disabled'}`);
    },
    onError: (error) => {
      toast.error('Failed to update feature flags');
      console.error(error);
    },
  });
}

export function useBulkResetResortOverrides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      flagKeys, 
      resortId 
    }: { 
      flagKeys: string[]; 
      resortId: string;
    }) => {
      const { error } = await supabase
        .from('feature_flags')
        .delete()
        .in('key', flagKeys)
        .eq('resort_id', resortId);

      if (error) throw error;

      // Log the reset activity
      await supabase.rpc('log_platform_activity', {
        p_event_type: 'feature_flags_bulk_updated',
        p_resort_id: resortId,
        p_target_type: 'feature_flag',
        p_target_name: `${flagKeys.length} overrides`,
        p_metadata: { 
          affected_keys: flagKeys, 
          action: 'reset_overrides',
          scope: 'resort',
        },
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      toast.success(`${variables.flagKeys.length} overrides reset to global`);
    },
    onError: (error) => {
      toast.error('Failed to reset overrides');
      console.error(error);
    },
  });
}

// Check if a specific feature is enabled (simple check, no parent resolution)
export function useIsFeatureEnabled(flagKey: string, resortId?: string) {
  const { data: flags } = useFeatureFlags(resortId);
  const flag = flags?.find(f => f.key === flagKey);
  return flag?.is_enabled ?? false;
}

// ═══════════════════════════════════════════════════════════════════════════
// DEV SANITY CHECK UTILITY
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Development utility to verify effective flag resolution logic.
 * Call this in dev console or a test file to validate behavior.
 */
export function __devTestEffectiveFlags(): void {
  console.group('🧪 Feature Flag Effective Resolution Tests');

  // Test case 1: Module OFF → subfeature effectively OFF
  const testCase1: Record<string, boolean> = {
    enable_transport: false,
    enable_transport_guest_booking: true,
    enable_transport_routes: true,
  };
  
  console.log('  enable_transport:', isEnabledEffective('enable_transport', testCase1), '(expected: false)');
  console.log('  enable_transport_guest_booking:', isEnabledEffective('enable_transport_guest_booking', testCase1), '(expected: false ← parent OFF)');
  console.log('  enable_transport_routes:', isEnabledEffective('enable_transport_routes', testCase1), '(expected: false ← parent OFF)');

  // Test case 2: Module ON → subfeatures respect their own values
  const testCase2: Record<string, boolean> = {
    enable_transport: true,
    enable_transport_guest_booking: true,
    enable_transport_routes: false,
  };
  
  console.log('\nTest 2: Module ON, mixed subfeatures');
  console.log('  enable_transport:', isEnabledEffective('enable_transport', testCase2), '(expected: true)');
  console.log('  enable_transport_guest_booking:', isEnabledEffective('enable_transport_guest_booking', testCase2), '(expected: true)');
  console.log('  enable_transport_routes:', isEnabledEffective('enable_transport_routes', testCase2), '(expected: false ← own value)');

  // Test case 3: Independent flags (no parent)
  const testCase3: Record<string, boolean> = {
    enable_maintenance_mode: true,
    enable_demo_reset: false,
  };
  
  console.log('\nTest 3: Independent flags (no parent dependency)');
  console.log('  enable_maintenance_mode:', isEnabledEffective('enable_maintenance_mode', testCase3), '(expected: true)');
  console.log('  enable_demo_reset:', isEnabledEffective('enable_demo_reset', testCase3), '(expected: false)');

  // Test case 4: Missing key returns false
  console.log('\nTest 4: Missing key');
  console.log('  nonexistent_flag:', isEnabledEffective('nonexistent_flag', testCase1), '(expected: false)');

  console.groupEnd();
}

// Auto-run in development
if (import.meta.env.DEV) {
  // Expose to window for manual testing
  (window as any).__devTestEffectiveFlags = __devTestEffectiveFlags;
}

