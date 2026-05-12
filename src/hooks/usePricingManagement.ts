import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/query-keys';
import {
  validatePlanPricingUpdate,
  validateAddonPricingUpdate,
  formatValidationErrors,
  VALID_TIERS,
} from '@/lib/pricing-validation';
import { logPricingError } from '@/lib/platform-error-logger';

// ==========================================
// Types
// ==========================================

export interface PlanPricingRow {
  id: string;
  tier: string;
  monthly_price_cents: number;
  currency: string;
  display_price_text: string | null;
  usage_included: string | null;
  overage_text: string | null;
  is_active: boolean;
  metadata_json: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
}

export interface AddonPricingRow {
  id: string;
  key: string;
  name: string;
  monthly_price_cents: number;
  currency: string;
  description: string | null;
  is_active: boolean;
  metadata_json: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
}

export interface TierStats {
  distribution: Record<string, number>;
  total: number;
  expiringSoon: number;
  demoCount: number;
}

// ==========================================
// Query Hooks
// ==========================================

export function usePlanPricing() {
  return useQuery({
    queryKey: queryKeys.pricing.plans(),
    queryFn: async (): Promise<PlanPricingRow[]> => {
      const { data, error } = await supabase
        .from('plan_pricing')
        .select('*')
        .order('monthly_price_cents', { ascending: true });

      if (error) {
        logPricingError('fetch_plan_pricing', error.message);
        throw error;
      }

      // Runtime validation: filter out invalid tiers
      const validData = (data || []).filter((row) => {
        const isValid = VALID_TIERS.includes(row.tier as any);
        if (!isValid) {
          console.warn(`[PlanPricing] Skipping invalid tier: ${row.tier}`);
        }
        return isValid;
      });

      return validData as PlanPricingRow[];
    },
    staleTime: 60 * 1000,
  });
}

export function useAddonPricing() {
  return useQuery({
    queryKey: queryKeys.pricing.addons(),
    queryFn: async (): Promise<AddonPricingRow[]> => {
      const { data, error } = await supabase
        .from('addon_pricing')
        .select('*')
        .order('monthly_price_cents', { ascending: true });

      if (error) {
        logPricingError('fetch_addon_pricing', error.message);
        throw error;
      }

      return (data || []) as AddonPricingRow[];
    },
    staleTime: 60 * 1000,
  });
}

export function useTierStats() {
  return useQuery({
    queryKey: queryKeys.pricing.tierStats(),
    queryFn: async (): Promise<TierStats> => {
      const { data: allResorts, error } = await supabase
        .from('resorts')
        .select('id, subscription_tier, subscription_expires_at, is_demo')
        .order('subscription_tier');

      if (error) throw error;

      const distribution: Record<string, number> = {
        ESSENTIAL: 0,
        PROFESSIONAL: 0,
        ELITE: 0,
      };

      let expiringSoon = 0;
      let demoCount = 0;
      const now = Date.now();
      const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;

      const total = allResorts ? allResorts.length : 0;
      for (let i = 0; i < total; i++) {
        const resort = allResorts![i];
        const tier = resort.subscription_tier || 'ESSENTIAL';
        if (distribution[tier] !== undefined) {
          distribution[tier]++;
        }

        if (resort.subscription_expires_at) {
          const expiresAt = Date.parse(resort.subscription_expires_at);
          if (expiresAt <= thirtyDaysFromNow && expiresAt > now) {
            expiringSoon++;
          }
        }

        if (resort.is_demo) {
          demoCount++;
        }
      }

      return {
        distribution,
        total,
        expiringSoon,
        demoCount,
      };
    },
    staleTime: 60 * 1000,
  });
}

// ==========================================
// Mutation Hooks
// ==========================================

export function useUpdatePlanPricing() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      monthly_price_cents: number;
      currency: string;
      is_active: boolean;
    }) => {
      // Runtime validation
      const validation = validatePlanPricingUpdate(params);
      if (!validation.success) {
        const errorMsg = formatValidationErrors(validation.error);
        logPricingError('validate_plan_pricing', errorMsg, { params });
        throw new Error(errorMsg);
      }

      const { error } = await supabase
        .from('plan_pricing')
        .update({
          monthly_price_cents: params.monthly_price_cents,
          currency: params.currency,
          is_active: params.is_active,
          updated_by: user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id);

      if (error) {
        logPricingError('update_plan_pricing', error.message, { plan_id: params.id });
        throw error;
      }

      // Log the action
      await supabase.from('pricing_publish_log').insert({
        actor_id: user?.id || '00000000-0000-0000-0000-000000000000',
        action: 'update_plan_price',
        metadata_json: {
          plan_id: params.id,
          monthly_price_cents: params.monthly_price_cents,
          currency: params.currency,
          is_active: params.is_active,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.plans() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.changeLog() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.public() });
      toast.success('Plan pricing updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update plan pricing', { description: error.message });
    },
  });
}

export function useUpdateAddonPricing() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      id: string;
      monthly_price_cents: number;
      currency: string;
      is_active: boolean;
      name: string;
    }) => {
      // Runtime validation
      const validation = validateAddonPricingUpdate(params);
      if (!validation.success) {
        const errorMsg = formatValidationErrors(validation.error);
        logPricingError('validate_addon_pricing', errorMsg, { params });
        throw new Error(errorMsg);
      }

      const { error } = await supabase
        .from('addon_pricing')
        .update({
          monthly_price_cents: params.monthly_price_cents,
          currency: params.currency,
          is_active: params.is_active,
          name: params.name,
          updated_by: user?.id || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.id);

      if (error) {
        logPricingError('update_addon_pricing', error.message, { addon_id: params.id });
        throw error;
      }

      // Log the action
      await supabase.from('pricing_publish_log').insert({
        actor_id: user?.id || '00000000-0000-0000-0000-000000000000',
        action: 'update_addon_price',
        metadata_json: {
          addon_id: params.id,
          name: params.name,
          monthly_price_cents: params.monthly_price_cents,
          currency: params.currency,
          is_active: params.is_active,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.addons() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.changeLog() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.public() });
      toast.success('Add-on pricing updated');
    },
    onError: (error: Error) => {
      toast.error('Failed to update add-on pricing', { description: error.message });
    },
  });
}

export function usePublishPricing() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      // Log publish event
      const { error } = await supabase.from('pricing_publish_log').insert({
        actor_id: user?.id || '00000000-0000-0000-0000-000000000000',
        action: 'publish_pricing',
        metadata_json: {
          timestamp: new Date().toISOString(),
        },
      });

      if (error) {
        logPricingError('publish_pricing', error.message);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.public() });
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.changeLog() });
      toast.success('Pricing published', {
        description: 'Changes are now visible on the public pricing page.',
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to publish pricing', { description: error.message });
    },
  });
}

// ==========================================
// Helpers
// ==========================================

export function formatCentsToDisplay(cents: number, currency: string = 'USD'): string {
  const dollars = cents / 100;
  if (currency === 'USD') {
    return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(dollars);
}

export function calculateEstimatedMRR(
  tierStats: TierStats | undefined,
  planPricing: PlanPricingRow[] | undefined
): number {
  if (!tierStats || !planPricing) return 0;

  let mrr = 0;
  for (const plan of planPricing) {
    if (plan.is_active) {
      const count = tierStats.distribution[plan.tier] || 0;
      mrr += (plan.monthly_price_cents / 100) * count;
    }
  }
  return mrr;
}
