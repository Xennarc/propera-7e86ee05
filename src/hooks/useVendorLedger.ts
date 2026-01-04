import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useToast } from '@/hooks/use-toast';

export interface VendorLedgerEntry {
  id: string;
  created_at: string;
  resort_id: string;
  vendor_id: string;
  booking_id: string | null;
  payout_id: string | null;
  type: 'CHARGE' | 'COMMISSION' | 'ADJUSTMENT' | 'PAYOUT';
  amount: number;
  currency: string;
  status: 'PENDING' | 'POSTED' | 'REVERSED';
  note: string | null;
}

export interface VendorPayout {
  id: string;
  resort_id: string;
  vendor_id: string;
  created_at: string;
  period_start: string;
  period_end: string;
  total_amount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';
  metadata: Record<string, unknown>;
}

export function useVendorLedger(vendorId: string | undefined) {
  const { currentResort } = useResort();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch ledger entries for a vendor
  const ledgerQuery = useQuery({
    queryKey: ['vendor-ledger', currentResort?.id, vendorId],
    queryFn: async () => {
      if (!currentResort?.id || !vendorId) return [];

      // Cast to any since types may not be regenerated yet
      const { data, error } = await (supabase as any)
        .from('vendor_ledger_entries')
        .select('*')
        .eq('resort_id', currentResort.id)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as VendorLedgerEntry[];
    },
    enabled: !!currentResort?.id && !!vendorId,
  });

  // Get vendor balance
  const balanceQuery = useQuery({
    queryKey: ['vendor-balance', currentResort?.id, vendorId],
    queryFn: async () => {
      if (!currentResort?.id || !vendorId) return { total: 0, unpaid: 0 };

      // Cast to any since types may not be regenerated yet
      const { data: totalData } = await (supabase as any)
        .rpc('get_vendor_balance', {
          p_vendor_id: vendorId,
          p_resort_id: currentResort.id,
        });

      const { data: unpaidData } = await (supabase as any)
        .rpc('get_vendor_unpaid_balance', {
          p_vendor_id: vendorId,
          p_resort_id: currentResort.id,
        });

      return {
        total: Number(totalData) || 0,
        unpaid: Number(unpaidData) || 0,
      };
    },
    enabled: !!currentResort?.id && !!vendorId,
  });

  // Fetch payouts for a vendor
  const payoutsQuery = useQuery({
    queryKey: ['vendor-payouts', currentResort?.id, vendorId],
    queryFn: async () => {
      if (!currentResort?.id || !vendorId) return [];

      // Cast to any since types may not be regenerated yet
      const { data, error } = await (supabase as any)
        .from('vendor_payouts')
        .select('*')
        .eq('resort_id', currentResort.id)
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as VendorPayout[];
    },
    enabled: !!currentResort?.id && !!vendorId,
  });

  // Create payout
  const createPayoutMutation = useMutation({
    mutationFn: async (params: { periodStart: string; periodEnd: string }) => {
      if (!currentResort?.id || !vendorId) throw new Error('Missing context');

      // Cast to any since types may not be regenerated yet
      const { data, error } = await (supabase as any).rpc('create_vendor_payout', {
        p_vendor_id: vendorId,
        p_resort_id: currentResort.id,
        p_period_start: params.periodStart,
        p_period_end: params.periodEnd,
      });

      if (error) throw error;
      if (!data) throw new Error('No unpaid entries found for this period');

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-payouts'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-balance'] });
      toast({ title: 'Payout created successfully' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Update payout status
  const updatePayoutStatusMutation = useMutation({
    mutationFn: async (params: { payoutId: string; status: VendorPayout['status'] }) => {
      // Cast to any since types may not be regenerated yet
      const { error } = await (supabase as any)
        .from('vendor_payouts')
        .update({ status: params.status, updated_at: new Date().toISOString() })
        .eq('id', params.payoutId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payouts'] });
      toast({ title: 'Payout status updated' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  // Add manual adjustment
  const addAdjustmentMutation = useMutation({
    mutationFn: async (params: { amount: number; note: string }) => {
      if (!currentResort?.id || !vendorId) throw new Error('Missing context');

      // Cast to any since types may not be regenerated yet
      const { error } = await (supabase as any)
        .from('vendor_ledger_entries')
        .insert({
          resort_id: currentResort.id,
          vendor_id: vendorId,
          type: 'ADJUSTMENT',
          amount: params.amount,
          note: params.note,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-ledger'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-balance'] });
      toast({ title: 'Adjustment added' });
    },
    onError: (error: Error) => {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    },
  });

  return {
    ledgerEntries: ledgerQuery.data || [],
    balance: balanceQuery.data || { total: 0, unpaid: 0 },
    payouts: payoutsQuery.data || [],
    isLoading: ledgerQuery.isLoading || balanceQuery.isLoading,
    createPayout: createPayoutMutation.mutateAsync,
    updatePayoutStatus: updatePayoutStatusMutation.mutateAsync,
    addAdjustment: addAdjustmentMutation.mutateAsync,
    isCreatingPayout: createPayoutMutation.isPending,
  };
}
