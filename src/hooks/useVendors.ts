import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { Vendor, VendorResort } from '@/types/vendor';
import { useToast } from '@/hooks/use-toast';

export function useVendors() {
  const { currentResort } = useResort();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all vendors linked to current resort
  const vendorsQuery = useQuery({
    queryKey: ['vendors', currentResort?.id],
    queryFn: async () => {
      if (!currentResort?.id) return [];
      
      // Get vendors linked to this resort
      const { data: vendorResorts, error: vrError } = await supabase
        .from('vendor_resorts')
        .select(`
          *,
          vendor:vendors(*)
        `)
        .eq('resort_id', currentResort.id);

      if (vrError) throw vrError;

      // Transform to include vendor data with resort link info
      return (vendorResorts || []).map(vr => ({
        ...vr.vendor,
        vendorResort: {
          id: vr.id,
          status: vr.status,
          commission_rate_override: vr.commission_rate_override,
          operational_notes: vr.operational_notes,
          ack_sla_minutes: vr.ack_sla_minutes,
        }
      })) as (Vendor & { vendorResort: Partial<VendorResort> })[];
    },
    enabled: !!currentResort?.id,
  });

  // Fetch all vendors (for linking)
  const allVendorsQuery = useQuery({
    queryKey: ['vendors', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Vendor[];
    },
  });

  // Create vendor
  const createVendorMutation = useMutation({
    mutationFn: async (vendor: Partial<Vendor>) => {
      const { data, error } = await supabase
        .from('vendors')
        .insert({
          name: vendor.name!,
          status: vendor.status || 'active',
          contact_name: vendor.contact_name,
          email: vendor.email,
          phone: vendor.phone,
          default_commission_rate: vendor.default_commission_rate,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Vendor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({ title: 'Vendor created' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Update vendor
  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, ...vendor }: Partial<Vendor> & { id: string }) => {
      const { data, error } = await supabase
        .from('vendors')
        .update({
          name: vendor.name,
          status: vendor.status,
          contact_name: vendor.contact_name,
          email: vendor.email,
          phone: vendor.phone,
          default_commission_rate: vendor.default_commission_rate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Vendor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({ title: 'Vendor updated' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Link vendor to resort
  const linkVendorMutation = useMutation({
    mutationFn: async (data: {
      vendor_id: string;
      commission_rate_override?: number | null;
      operational_notes?: string | null;
      ack_sla_minutes?: number | null;
    }) => {
      if (!currentResort?.id) throw new Error('No resort selected');

      const { error } = await supabase
        .from('vendor_resorts')
        .insert({
          vendor_id: data.vendor_id,
          resort_id: currentResort.id,
          status: 'approved',
          commission_rate_override: data.commission_rate_override,
          operational_notes: data.operational_notes,
          ack_sla_minutes: data.ack_sla_minutes,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({ title: 'Vendor linked to resort' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Update vendor-resort link
  const updateVendorResortMutation = useMutation({
    mutationFn: async (data: {
      vendor_resort_id: string;
      status?: VendorResort['status'];
      commission_rate_override?: number | null;
      operational_notes?: string | null;
      ack_sla_minutes?: number | null;
    }) => {
      const { vendor_resort_id, ...updates } = data;
      const { error } = await supabase
        .from('vendor_resorts')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', vendor_resort_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({ title: 'Vendor settings updated' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Unlink vendor from resort
  const unlinkVendorMutation = useMutation({
    mutationFn: async (vendor_resort_id: string) => {
      const { error } = await supabase
        .from('vendor_resorts')
        .delete()
        .eq('id', vendor_resort_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast({ title: 'Vendor unlinked from resort' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Get approved vendors for activity selection
  const approvedVendorsQuery = useQuery({
    queryKey: ['vendors', 'approved', currentResort?.id],
    queryFn: async () => {
      if (!currentResort?.id) return [];
      
      const { data, error } = await supabase
        .from('vendor_resorts')
        .select(`
          vendor:vendors(*)
        `)
        .eq('resort_id', currentResort.id)
        .eq('status', 'approved');

      if (error) throw error;
      return (data || []).map(vr => vr.vendor).filter(Boolean) as Vendor[];
    },
    enabled: !!currentResort?.id,
  });

  return {
    vendors: vendorsQuery.data || [],
    allVendors: allVendorsQuery.data || [],
    approvedVendors: approvedVendorsQuery.data || [],
    isLoading: vendorsQuery.isLoading,
    createVendor: createVendorMutation.mutateAsync,
    updateVendor: updateVendorMutation.mutateAsync,
    linkVendor: linkVendorMutation.mutateAsync,
    updateVendorResort: updateVendorResortMutation.mutateAsync,
    unlinkVendor: unlinkVendorMutation.mutateAsync,
    isCreating: createVendorMutation.isPending,
    isUpdating: updateVendorMutation.isPending,
  };
}
