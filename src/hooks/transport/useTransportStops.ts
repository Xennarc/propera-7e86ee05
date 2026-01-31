import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BuggyStop, BuggyRoute, BuggyRouteStop } from '@/types/database';

export function useTransportStops(resortId: string | undefined) {
  return useQuery({
    queryKey: ['transport-stops', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      
      const { data, error } = await supabase
        .from('buggy_stops')
        .select('*')
        .eq('resort_id', resortId)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      return (data || []) as BuggyStop[];
    },
    enabled: !!resortId,
  });
}

export function useTransportRoutes(resortId: string | undefined) {
  return useQuery({
    queryKey: ['transport-routes', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      
      const { data, error } = await supabase
        .from('buggy_routes')
        .select(`
          *,
          route_stops:buggy_route_stops(
            id,
            sort_order,
            dwell_minutes,
            stop:buggy_stops(id, name)
          )
        `)
        .eq('resort_id', resortId)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      // Sort route_stops by sort_order
      return (data || []).map(route => ({
        ...route,
        route_stops: (route.route_stops || []).sort(
          (a: any, b: any) => a.sort_order - b.sort_order
        ),
      })) as (BuggyRoute & { route_stops: BuggyRouteStop[] })[];
    },
    enabled: !!resortId,
  });
}
