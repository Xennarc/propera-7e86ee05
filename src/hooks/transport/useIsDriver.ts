import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface DriverRecord {
  id: string;
  status: string;
}

export function useIsDriver(resortId: string | undefined) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['is-driver', resortId, user?.id],
    queryFn: async (): Promise<DriverRecord | null> => {
      if (!resortId || !user?.id) return null;
      
      const { data, error } = await supabase
        .from('buggy_drivers')
        .select('id, status')
        .eq('resort_id', resortId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!resortId && !!user?.id,
    staleTime: 60_000, // Cache for 1 minute
  });
}
