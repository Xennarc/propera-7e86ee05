import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface DriverRow {
  id: string;
  resort_id: string;
  user_id: string;
  status: string;
  assigned_buggy_id: string | null;
  last_seen_at: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  full_name: string | null;
  assigned_buggy?: { id: string; name: string; status: string } | null;
}

export function useBuggyDrivers(resortId: string | undefined) {
  return useQuery({
    queryKey: ['buggy-drivers', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      
      // First get drivers
      const { data: drivers, error: driverError } = await supabase
        .from('buggy_drivers')
        .select(`
          *,
          assigned_buggy:buggies(id, name, status)
        `)
        .eq('resort_id', resortId)
        .order('created_at', { ascending: false });
      
      if (driverError) throw driverError;
      if (!drivers?.length) return [];
      
      // Get profiles for user_ids
      const userIds = drivers.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      
      return drivers.map(driver => ({
        ...driver,
        full_name: profileMap.get(driver.user_id) || null,
      })) as DriverRow[];
    },
    enabled: !!resortId,
  });
}

export function useOnlineDrivers(resortId: string | undefined) {
  return useQuery({
    queryKey: ['online-drivers', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      
      const { data: drivers, error: driverError } = await supabase
        .from('buggy_drivers')
        .select('*')
        .eq('resort_id', resortId)
        .eq('status', 'online')
        .order('last_seen_at', { ascending: false });
      
      if (driverError) throw driverError;
      if (!drivers?.length) return [];
      
      // Get profiles for user_ids
      const userIds = drivers.map(d => d.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      
      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);
      
      return drivers.map(driver => ({
        ...driver,
        full_name: profileMap.get(driver.user_id) || null,
      })) as DriverRow[];
    },
    enabled: !!resortId,
  });
}
