import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EligibleDriver {
  user_id: string;
  full_name: string;
  resort_role: string;
}

export function useEligibleDrivers(resortId: string | undefined) {
  return useQuery({
    queryKey: ['eligible-drivers', resortId],
    queryFn: async (): Promise<EligibleDriver[]> => {
      if (!resortId) return [];

      const { data, error } = await supabase.rpc('get_eligible_drivers_for_resort', {
        _resort_id: resortId,
      });

      if (error) {
        // If access denied, silently return empty (user lacks permission)
        if (error.message.includes('Access denied')) {
          return [];
        }
        throw error;
      }

      return (data || []).map((d: any) => ({
        user_id: d.user_id,
        full_name: d.full_name,
        resort_role: d.resort_role,
      }));
    },
    enabled: !!resortId,
  });
}
