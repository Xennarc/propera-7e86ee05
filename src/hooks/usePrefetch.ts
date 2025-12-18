import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';

/**
 * Prefetch common resort data that's frequently accessed
 */
export function usePrefetchResortData() {
  const queryClient = useQueryClient();
  const { currentResort } = useResort();

  useEffect(() => {
    if (!currentResort?.id) return;

    // Prefetch activities list
    queryClient.prefetchQuery({
      queryKey: ['activities', currentResort.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('activities')
          .select('id, name, category, is_active, duration_minutes, default_max_capacity')
          .eq('resort_id', currentResort.id)
          .eq('is_active', true)
          .order('name');
        return data || [];
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Prefetch restaurants list
    queryClient.prefetchQuery({
      queryKey: ['restaurants', currentResort.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('restaurants')
          .select('id, name, cuisine_type, is_active, opening_time, closing_time')
          .eq('resort_id', currentResort.id)
          .eq('is_active', true)
          .order('name');
        return data || [];
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Prefetch resources list
    queryClient.prefetchQuery({
      queryKey: ['resources', currentResort.id],
      queryFn: async () => {
        const { data } = await supabase
          .from('resources')
          .select('id, name, type, capacity, is_active')
          .eq('resort_id', currentResort.id)
          .eq('is_active', true)
          .order('name');
        return data || [];
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  }, [currentResort?.id, queryClient]);
}

/**
 * Hook to get cached activities list
 */
export function useCachedActivities() {
  const { currentResort } = useResort();
  const queryClient = useQueryClient();
  
  return queryClient.getQueryData(['activities', currentResort?.id]) as any[] | undefined;
}

/**
 * Hook to get cached restaurants list
 */
export function useCachedRestaurants() {
  const { currentResort } = useResort();
  const queryClient = useQueryClient();
  
  return queryClient.getQueryData(['restaurants', currentResort?.id]) as any[] | undefined;
}
