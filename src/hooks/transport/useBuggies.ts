import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BuggyRow {
  id: string;
  resort_id: string;
  name: string;
  capacity: number;
  is_accessible: boolean;
  status: string;
  current_stop_id: string | null;
  last_location: unknown;
  last_location_at: string | null;
  metadata: unknown;
  created_at: string;
  updated_at: string;
  current_stop?: { id: string; name: string } | null;
}

export function useBuggies(resortId: string | undefined) {
  return useQuery({
    queryKey: ['buggies', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      
      const { data, error } = await supabase
        .from('buggies')
        .select(`
          *,
          current_stop:buggy_stops(id, name)
        `)
        .eq('resort_id', resortId)
        .order('name', { ascending: true });
      
      if (error) throw error;
      return (data || []) as BuggyRow[];
    },
    enabled: !!resortId,
  });
}

export function useAvailableBuggies(resortId: string | undefined) {
  return useQuery({
    queryKey: ['available-buggies', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      
      const { data, error } = await supabase
        .from('buggies')
        .select('*')
        .eq('resort_id', resortId)
        .eq('status', 'available')
        .order('name', { ascending: true });
      
      if (error) throw error;
      return (data || []) as BuggyRow[];
    },
    enabled: !!resortId,
  });
}
