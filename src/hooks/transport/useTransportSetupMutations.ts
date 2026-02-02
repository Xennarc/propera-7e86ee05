import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useTransportSetupMutations(resortId: string | undefined) {
  const queryClient = useQueryClient();
  
  const invalidateSetupQueries = () => {
    queryClient.invalidateQueries({ queryKey: ['transport-stops', resortId] });
    queryClient.invalidateQueries({ queryKey: ['buggies', resortId] });
    queryClient.invalidateQueries({ queryKey: ['buggy-drivers', resortId] });
    queryClient.invalidateQueries({ queryKey: ['eligible-drivers', resortId] });
  };
  
  // ============ STOPS ============
  
  const addStop = useMutation({
    mutationFn: async ({ name, zone }: { name: string; zone?: string }) => {
      // Get max sort_order
      const { data: existing } = await supabase
        .from('buggy_stops')
        .select('sort_order')
        .eq('resort_id', resortId)
        .order('sort_order', { ascending: false })
        .limit(1);
      
      const maxOrder = existing?.[0]?.sort_order ?? 0;
      
      const { data, error } = await supabase
        .from('buggy_stops')
        .insert({
          resort_id: resortId,
          name,
          zone: zone || null,
          sort_order: maxOrder + 1,
          is_active: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateSetupQueries();
    },
    onError: (error: any) => {
      console.error('Add stop error:', error);
      toast.error(error.message || 'Failed to add stop');
    },
  });
  
  const updateStop = useMutation({
    mutationFn: async ({ id, name, zone }: { id: string; name: string; zone?: string }) => {
      const { data, error } = await supabase
        .from('buggy_stops')
        .update({ name, zone: zone || null })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateSetupQueries();
    },
    onError: (error: any) => {
      console.error('Update stop error:', error);
      toast.error(error.message || 'Failed to update stop');
    },
  });
  
  const deleteStop = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      // Soft delete by setting is_active = false
      const { error } = await supabase
        .from('buggy_stops')
        .update({ is_active: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateSetupQueries();
    },
    onError: (error: any) => {
      console.error('Delete stop error:', error);
      toast.error(error.message || 'Failed to delete stop');
    },
  });
  
  const reorderStops = useMutation({
    mutationFn: async ({ orderedIds }: { orderedIds: string[] }) => {
      // Update sort_order for each stop
      const updates = orderedIds.map((id, index) =>
        supabase
          .from('buggy_stops')
          .update({ sort_order: index + 1 })
          .eq('id', id)
      );
      
      await Promise.all(updates);
    },
    onSuccess: () => {
      invalidateSetupQueries();
    },
    onError: (error: any) => {
      console.error('Reorder stops error:', error);
      toast.error(error.message || 'Failed to reorder stops');
    },
  });
  
  // ============ BUGGIES ============
  
  const addBuggy = useMutation({
    mutationFn: async ({
      name,
      capacity,
      isAccessible,
    }: {
      name: string;
      capacity: number;
      isAccessible: boolean;
    }) => {
      const { data, error } = await supabase
        .from('buggies')
        .insert({
          resort_id: resortId,
          name,
          capacity,
          is_accessible: isAccessible,
          status: 'available',
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateSetupQueries();
    },
    onError: (error: any) => {
      console.error('Add buggy error:', error);
      toast.error(error.message || 'Failed to add buggy');
    },
  });
  
  const updateBuggy = useMutation({
    mutationFn: async ({
      id,
      name,
      capacity,
      isAccessible,
    }: {
      id: string;
      name: string;
      capacity: number;
      isAccessible: boolean;
    }) => {
      const { data, error } = await supabase
        .from('buggies')
        .update({
          name,
          capacity,
          is_accessible: isAccessible,
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidateSetupQueries();
    },
    onError: (error: any) => {
      console.error('Update buggy error:', error);
      toast.error(error.message || 'Failed to update buggy');
    },
  });
  
  const deleteBuggy = useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      // Soft delete by setting status to 'out_of_service'
      const { error } = await supabase
        .from('buggies')
        .update({ status: 'out_of_service' })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateSetupQueries();
    },
    onError: (error: any) => {
      console.error('Delete buggy error:', error);
      toast.error(error.message || 'Failed to delete buggy');
    },
  });
  
  return {
    // Stops
    addStop,
    updateStop,
    deleteStop,
    reorderStops,
    // Buggies
    addBuggy,
    updateBuggy,
    deleteBuggy,
    // Loading state
    isLoading:
      addStop.isPending ||
      updateStop.isPending ||
      deleteStop.isPending ||
      reorderStops.isPending ||
      addBuggy.isPending ||
      updateBuggy.isPending ||
      deleteBuggy.isPending,
  };
}
