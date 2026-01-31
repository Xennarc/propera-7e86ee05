import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { queryKeys } from '@/lib/query-keys';
import { logSubscriptionAlertError } from '@/lib/platform-error-logger';

// ==========================================
// Types
// ==========================================

export interface SubscriptionAlert {
  id: string;
  resort_id: string;
  alert_type: 'EXPIRING_SOON' | 'EXPIRED';
  threshold_days: number | null;
  expires_at: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  last_seen_at: string | null;
  metadata_json: Record<string, unknown>;
  // Joined data
  resort?: {
    id: string;
    name: string;
    subscription_tier: string | null;
    subscription_expires_at: string | null;
  };
}

export interface AlertStats {
  expiringSoon: number;
  expired: number;
  total: number;
}

// ==========================================
// Query Hooks
// ==========================================

export function useSubscriptionAlerts(filters?: {
  alertType?: 'EXPIRING_SOON' | 'EXPIRED' | null;
  tier?: string | null;
  search?: string;
  includeResolved?: boolean;
}) {
  return useQuery({
    queryKey: queryKeys.subscriptionAlerts.list(filters),
    queryFn: async (): Promise<SubscriptionAlert[]> => {
      // Query alerts with resort join
      const baseQuery = supabase
        .from('subscription_alerts')
        .select(`
          id,
          resort_id,
          alert_type,
          threshold_days,
          expires_at,
          is_resolved,
          resolved_at,
          resolved_by,
          created_at,
          last_seen_at,
          metadata_json,
          resort:resorts!subscription_alerts_resort_id_fkey (
            id,
            name,
            subscription_tier,
            subscription_expires_at
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by resolved status
      let query = baseQuery;
      if (!filters?.includeResolved) {
        query = query.eq('is_resolved', false);
      }

      // Filter by alert type
      if (filters?.alertType) {
        query = query.eq('alert_type', filters.alertType);
      }

      const { data, error } = await query;

      if (error) {
        logSubscriptionAlertError('fetch_alerts', error.message);
        throw error;
      }

      // Client-side filtering for tier and search (joined data)
      let results = (data || []) as unknown as SubscriptionAlert[];

      if (filters?.tier) {
        results = results.filter(
          (a) => a.resort?.subscription_tier === filters.tier
        );
      }

      if (filters?.search) {
        const search = filters.search.toLowerCase();
        results = results.filter((a) =>
          a.resort?.name?.toLowerCase().includes(search)
        );
      }

      return results;
    },
    staleTime: 30 * 1000,
  });
}

export function useAlertStats() {
  return useQuery({
    queryKey: queryKeys.subscriptionAlerts.stats(),
    queryFn: async (): Promise<AlertStats> => {
      const { data, error } = await supabase
        .from('subscription_alerts')
        .select('alert_type')
        .eq('is_resolved', false);

      if (error) {
        logSubscriptionAlertError('fetch_alert_stats', error.message);
        throw error;
      }

      const alerts = (data || []) as unknown as { alert_type: string }[];
      const expiringSoon = alerts.filter((a) => a.alert_type === 'EXPIRING_SOON').length;
      const expired = alerts.filter((a) => a.alert_type === 'EXPIRED').length;

      return {
        expiringSoon,
        expired,
        total: alerts.length,
      };
    },
    staleTime: 30 * 1000,
  });
}

// ==========================================
// Mutation Hooks
// ==========================================

export function useResolveAlert() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('subscription_alerts')
        .update({
          is_resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id || null,
        })
        .eq('id', alertId);

      if (error) {
        logSubscriptionAlertError('resolve_alert', error.message, { alert_id: alertId });
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'subscription-alerts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.tierStats() });
      toast.success('Alert resolved');
    },
    onError: (error: Error) => {
      toast.error('Failed to resolve alert', { description: error.message });
    },
  });
}

export function useGenerateAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (thresholdDays: number = 14) => {
      const { data, error } = await supabase.functions.invoke('generate-subscription-alerts', {
        body: { threshold_days: thresholdDays },
      });

      if (error) {
        logSubscriptionAlertError('generate_alerts', error.message, { threshold_days: thresholdDays });
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['superadmin', 'subscription-alerts'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.pricing.tierStats() });
      toast.success('Alerts generated', {
        description: `Created: ${data?.created_count || 0}, Resolved: ${data?.resolved_count || 0}`,
      });
    },
    onError: (error: Error) => {
      toast.error('Failed to generate alerts', { description: error.message });
    },
  });
}

// ==========================================
// Helpers
// ==========================================

export function getDaysRemaining(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
