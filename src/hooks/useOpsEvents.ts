/**
 * useOpsEvents — React Query hook that fetches normalised OpsEvents
 * from all registered adapters, merging results into a single sorted stream.
 *
 * Only active when the ops_events_adapter_enabled feature flag is on.
 */
import { useQuery } from '@tanstack/react-query';
import { useFeatureEnabled } from '@/components/FeatureGate';
import { useDepartment } from '@/contexts/DepartmentContext';
import { ActivitiesOpsAdapter } from '@/lib/ops/adapters/activities-ops-adapter';
import { DiningOpsAdapter } from '@/lib/ops/adapters/dining-ops-adapter';
import type { OpsEvent, OpsAdapterParams } from '@/lib/ops/ops-event-types';

const ADAPTERS = [ActivitiesOpsAdapter, DiningOpsAdapter];

interface UseOpsEventsOptions {
  resortId: string | undefined;
  dateRange: { start: string; end: string } | undefined;
  enabled?: boolean;
}

export function useOpsEvents({ resortId, dateRange, enabled = true }: UseOpsEventsOptions) {
  const adapterEnabled = useFeatureEnabled('ops_events_adapter_enabled');
  const { scope } = useDepartment();

  return useQuery<OpsEvent[]>({
    queryKey: ['ops-events', resortId, dateRange?.start, dateRange?.end, scope.activityCategoryKeys, scope.restaurantIds],
    queryFn: async () => {
      if (!resortId || !dateRange) return [];

      const params: OpsAdapterParams = {
        resortId,
        dateRange,
        scope: {
          activityCategoryKeys: scope.activityCategoryKeys,
          restaurantIds: scope.restaurantIds,
        },
      };

      // Run all adapters in parallel, merge results
      const results = await Promise.allSettled(
        ADAPTERS.map(a => a.getOpsEvents(params))
      );

      const events: OpsEvent[] = [];
      for (const r of results) {
        if (r.status === 'fulfilled') {
          events.push(...r.value);
        } else {
          console.warn('[useOpsEvents] Adapter failed:', r.reason);
        }
      }

      // Sort chronologically
      events.sort((a, b) => a.start_at.localeCompare(b.start_at));
      return events;
    },
    enabled: !!resortId && !!dateRange && adapterEnabled && enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/**
 * Returns true if the adapter pipeline is enabled.
 * Pages use this to decide which data pipeline to render from.
 */
export function useOpsAdapterEnabled(): boolean {
  return useFeatureEnabled('ops_events_adapter_enabled');
}
