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

      // Get all resort staff members
      const { data: memberships, error: membershipsError } = await supabase
        .from('resort_memberships')
        .select(`
          user_id,
          resort_role,
          profiles!inner(id, full_name)
        `)
        .eq('resort_id', resortId);

      if (membershipsError) throw membershipsError;

      // Get existing drivers for this resort
      const { data: existingDrivers, error: driversError } = await supabase
        .from('buggy_drivers')
        .select('user_id')
        .eq('resort_id', resortId);

      if (driversError) throw driversError;

      const existingDriverIds = new Set(existingDrivers?.map(d => d.user_id) || []);

      // Filter out users who are already registered as drivers
      const eligible = (memberships || [])
        .filter(m => !existingDriverIds.has(m.user_id))
        .map(m => ({
          user_id: m.user_id,
          full_name: (m.profiles as any)?.full_name || 'Unknown',
          resort_role: m.resort_role,
        }));

      return eligible;
    },
    enabled: !!resortId,
  });
}
