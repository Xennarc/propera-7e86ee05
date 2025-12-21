import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

// Check if a specific feature is enabled
export function useIsFeatureEnabled(flagKey: string, resortId?: string) {
  const { data: flags } = useFeatureFlags(resortId);
  const flag = flags?.find(f => f.key === flagKey);
  return flag?.is_enabled ?? false;
}
