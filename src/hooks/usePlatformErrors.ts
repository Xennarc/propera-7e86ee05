import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subHours, subDays } from 'date-fns';


export interface PlatformError {
  id: string;
  resort_id: string | null;
  route: string;
  action: string | null;
  error_message: string;
  error_stack: string | null;
  user_id: string | null;
  user_type: 'staff' | 'guest' | 'system' | null;
  severity: 'warning' | 'error' | 'critical';
  metadata_json: Record<string, unknown>;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  resort_name?: string;
}

export interface ErrorMetrics {
  totalErrors: number;
  criticalCount: number;
  errorCount: number;
  warningCount: number;
  trend: number; // % change vs previous period
  topRoutes: { route: string; count: number }[];
  byResort: { resortId: string; resortName: string; count: number }[];
}

export type TimeRange = '24h' | '7d' | '30d';

function getTimeRangeDate(timeRange: TimeRange): Date {
  switch (timeRange) {
    case '24h': return subHours(new Date(), 24);
    case '7d': return subDays(new Date(), 7);
    case '30d': return subDays(new Date(), 30);
  }
}

function getPreviousPeriodDate(timeRange: TimeRange): { start: Date; end: Date } {
  const end = getTimeRangeDate(timeRange);
  switch (timeRange) {
    case '24h': return { start: subHours(end, 24), end };
    case '7d': return { start: subDays(end, 7), end };
    case '30d': return { start: subDays(end, 30), end };
  }
}

export function usePlatformErrors(
  resortFilter: string = 'all',
  timeRange: TimeRange = '24h',
  resorts: { id: string; name: string }[] = []
) {
  return useQuery({
    queryKey: ['platform-errors', resortFilter, timeRange],
    queryFn: async (): Promise<{ errors: PlatformError[]; metrics: ErrorMetrics }> => {
      const startDate = getTimeRangeDate(timeRange);
      const previousPeriod = getPreviousPeriodDate(timeRange);

      // Build query for current period
      let query = supabase
        .from('platform_errors')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (resortFilter !== 'all') {
        query = query.eq('resort_id', resortFilter);
      }

      const { data: errors, error } = await query;
      if (error) throw error;

      // Build query for previous period (for trend calculation)
      let prevQuery = supabase
        .from('platform_errors')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', previousPeriod.start.toISOString())
        .lt('created_at', previousPeriod.end.toISOString());

      if (resortFilter !== 'all') {
        prevQuery = prevQuery.eq('resort_id', resortFilter);
      }

      const { count: previousCount } = await prevQuery;

      // Enrich with resort names
      const enrichedErrors: PlatformError[] = (errors || []).map(e => ({
        ...e,
        severity: e.severity as 'warning' | 'error' | 'critical',
        user_type: e.user_type as 'staff' | 'guest' | 'system' | null,
        metadata_json: e.metadata_json as Record<string, unknown>,
        resort_name: e.resort_id 
          ? resorts.find(r => r.id === e.resort_id)?.name || 'Unknown Resort'
          : null
      }));

      // Calculate metrics
      const totalErrors = enrichedErrors.length;
      const criticalCount = enrichedErrors.filter(e => e.severity === 'critical').length;
      const errorCount = enrichedErrors.filter(e => e.severity === 'error').length;
      const warningCount = enrichedErrors.filter(e => e.severity === 'warning').length;

      // Calculate trend
      const prev = previousCount || 0;
      const trend = prev === 0 ? 0 : Math.round(((totalErrors - prev) / prev) * 100);

      // Top routes
      const routeCounts: Record<string, number> = {};
      enrichedErrors.forEach(e => {
        routeCounts[e.route] = (routeCounts[e.route] || 0) + 1;
      });
      const topRoutes = Object.entries(routeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([route, count]) => ({ route, count }));

      // By resort
      const resortCounts: Record<string, { name: string; count: number }> = {};
      enrichedErrors.forEach(e => {
        if (e.resort_id) {
          if (!resortCounts[e.resort_id]) {
            resortCounts[e.resort_id] = { name: e.resort_name || 'Unknown', count: 0 };
          }
          resortCounts[e.resort_id].count += 1;
        }
      });
      const byResort = Object.entries(resortCounts)
        .map(([resortId, data]) => ({ resortId, resortName: data.name, count: data.count }))
        .sort((a, b) => b.count - a.count);

      return {
        errors: enrichedErrors,
        metrics: { totalErrors, criticalCount, errorCount, warningCount, trend, topRoutes, byResort }
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useResolveError() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (errorId: string) => {
      const { error } = await supabase
        .from('platform_errors')
        .update({ resolved_at: new Date().toISOString(), resolved_by: (await supabase.auth.getUser()).data.user?.id })
        .eq('id', errorId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-errors'] });
    },
  });
}

export function useLogError() {
  return useMutation({
    mutationFn: async (params: {
      route: string;
      errorMessage: string;
      resortId?: string;
      action?: string;
      errorStack?: string;
      userType?: 'staff' | 'guest' | 'system';
      severity?: 'warning' | 'error' | 'critical';
      metadata?: Record<string, unknown>;
    }) => {
      const { data, error } = await supabase.rpc('log_platform_error', {
        p_route: params.route,
        p_error_message: params.errorMessage,
        p_resort_id: params.resortId || null,
        p_action: params.action || null,
        p_error_stack: params.errorStack || null,
        p_user_type: params.userType || 'staff',
        p_severity: params.severity || 'error',
        p_metadata: JSON.stringify(params.metadata || {}),
      });

      if (error) throw error;
      return data;
    },
  });
}

// Get error count for KPI display
export function useErrorCount24h(resortIds: string[] = []) {
  return useQuery({
    queryKey: ['error-count-24h', resortIds],
    queryFn: async () => {
      const startDate = subHours(new Date(), 24);
      
      let query = supabase
        .from('platform_errors')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      if (resortIds.length > 0) {
        query = query.in('resort_id', resortIds);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 60000,
  });
}
