/**
 * ActivitiesOpsAdapter — Converts activity_sessions into OpsEvents.
 *
 * Re-uses the same Supabase query patterns as the existing dept pages
 * to ensure identical data. Applies scope.activityCategoryKeys filter.
 */
import { supabase } from '@/integrations/supabase/client';
import type { OpsEventAdapter, OpsAdapterParams, OpsEvent } from '../ops-event-types';

export const ActivitiesOpsAdapter: OpsEventAdapter = {
  name: 'ActivitiesOpsAdapter',

  async getOpsEvents(params: OpsAdapterParams): Promise<OpsEvent[]> {
    const { resortId, dateRange, scope } = params;
    const categories = scope.activityCategoryKeys;
    const hasScope = categories.length > 0;

    const selectStr = hasScope
      ? 'id, date, start_time, end_time, capacity, status, resource_id, lead_staff_id, activity:activities!inner(name, category)'
      : 'id, date, start_time, end_time, capacity, status, resource_id, lead_staff_id, activity:activities(name, category)';

    let query = supabase
      .from('activity_sessions')
      .select(selectStr)
      .eq('resort_id', resortId)
      .gte('date', dateRange.start)
      .lte('date', dateRange.end)
      .order('date')
      .order('start_time');

    // Apply category scope via inner join filter
    if (hasScope && categories.length === 1) {
      query = query.eq('activity.category', categories[0]);
    } else if (hasScope && categories.length > 1) {
      query = query.in('activity.category', categories);
    }

    const { data, error } = await query;
    if (error) throw error;

    return (data ?? []).map((s: any): OpsEvent => ({
      id: s.id,
      start_at: `${s.date}T${s.start_time}`,
      end_at: `${s.date}T${s.end_time}`,
      title: s.activity?.name ?? 'Unknown Activity',
      status: s.status,
      source_type: 'activity_session',
      source_id: s.id,
      lane_key: s.resource_id ?? null,
      meta: {
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
        capacity: s.capacity,
        category: s.activity?.category ?? null,
        lead_staff_id: s.lead_staff_id,
        resource_id: s.resource_id,
      },
    }));
  },
};
