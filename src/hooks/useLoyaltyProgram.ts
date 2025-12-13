import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useResort } from '@/contexts/ResortContext';
import { useTierAccess } from '@/hooks/useTierAccess';
import { useToast } from '@/hooks/use-toast';

export interface LoyaltyProgram {
  id: string;
  resort_id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  tier_mode: 'points' | 'nights' | 'spend';
  base_earn_rate: number;
  currency_name: string;
  welcome_bonus_points: number;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyTier {
  id: string;
  program_id: string;
  resort_id: string;
  name: string;
  description: string | null;
  min_points: number;
  priority: number;
  perks_json: string[];
  badge_color: string;
  badge_icon: string | null;
  is_default: boolean;
  is_elite: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoyaltyMember {
  id: string;
  resort_id: string;
  program_id: string;
  guest_id: string;
  current_tier_id: string | null;
  points_balance: number;
  lifetime_points: number;
  status: string;
  joined_at: string;
  updated_at: string;
  guest?: {
    id: string;
    full_name: string;
    room_number: string;
    email: string | null;
    check_in_date: string;
    check_out_date: string;
  };
  current_tier?: LoyaltyTier;
}

export interface LoyaltyTransaction {
  id: string;
  member_id: string;
  resort_id: string;
  type: 'earn' | 'redeem' | 'adjustment' | 'expire';
  points_change: number;
  points_balance_after: number;
  source: string;
  reference_id: string | null;
  reference_type: string | null;
  note: string | null;
  created_by_user_id: string | null;
  created_at: string;
}

export interface LoyaltyEarnRule {
  id: string;
  program_id: string;
  resort_id: string;
  category: string;
  earn_type: string;
  earn_rate: number;
  is_active: boolean;
}

export function useLoyaltyProgram() {
  const { currentResort } = useResort();
  const { hasFeature, isAtLeastElite } = useTierAccess();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isLoyaltyEnabled = hasFeature('loyalty_program');

  // Fetch loyalty program for current resort
  const {
    data: program,
    isLoading: programLoading,
    error: programError,
  } = useQuery({
    queryKey: ['loyalty-program', currentResort?.id],
    queryFn: async () => {
      if (!currentResort?.id) return null;
      const { data, error } = await supabase
        .from('loyalty_programs')
        .select('*')
        .eq('resort_id', currentResort.id)
        .maybeSingle();
      if (error) throw error;
      return data as LoyaltyProgram | null;
    },
    enabled: !!currentResort?.id && isLoyaltyEnabled,
  });

  // Fetch loyalty tiers
  const { data: tiers = [], isLoading: tiersLoading } = useQuery({
    queryKey: ['loyalty-tiers', program?.id],
    queryFn: async () => {
      if (!program?.id) return [];
      const { data, error } = await supabase
        .from('loyalty_tiers')
        .select('*')
        .eq('program_id', program.id)
        .order('min_points', { ascending: true });
      if (error) throw error;
      return data as LoyaltyTier[];
    },
    enabled: !!program?.id,
  });

  // Fetch earn rules
  const { data: earnRules = [], isLoading: earnRulesLoading } = useQuery({
    queryKey: ['loyalty-earn-rules', program?.id],
    queryFn: async () => {
      if (!program?.id) return [];
      const { data, error } = await supabase
        .from('loyalty_earn_rules')
        .select('*')
        .eq('program_id', program.id);
      if (error) throw error;
      return data as LoyaltyEarnRule[];
    },
    enabled: !!program?.id,
  });

  // Create or update program
  const upsertProgramMutation = useMutation({
    mutationFn: async (programData: Partial<LoyaltyProgram>) => {
      if (!currentResort?.id) throw new Error('No resort selected');
      
      if (program?.id) {
        const { error } = await supabase
          .from('loyalty_programs')
          .update(programData)
          .eq('id', program.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('loyalty_programs')
          .insert({
            resort_id: currentResort.id,
            ...programData,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-program'] });
      toast({ title: 'Saved', description: 'Loyalty program settings updated.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Create tier
  const createTierMutation = useMutation({
    mutationFn: async (tierData: Partial<LoyaltyTier>) => {
      if (!program?.id || !currentResort?.id) throw new Error('No program');
      const { error } = await supabase
        .from('loyalty_tiers')
        .insert({
          program_id: program.id,
          resort_id: currentResort.id,
          name: tierData.name || 'New Tier',
          min_points: tierData.min_points ?? 0,
          badge_color: tierData.badge_color || '#6B7280',
          is_default: tierData.is_default ?? false,
          is_elite: tierData.is_elite ?? false,
          description: tierData.description || null,
          perks_json: tierData.perks_json || [],
          priority: tierData.priority ?? 0,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-tiers'] });
      toast({ title: 'Created', description: 'New tier added.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update tier
  const updateTierMutation = useMutation({
    mutationFn: async ({ id, ...tierData }: Partial<LoyaltyTier> & { id: string }) => {
      const { error } = await supabase
        .from('loyalty_tiers')
        .update(tierData)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-tiers'] });
      toast({ title: 'Updated', description: 'Tier updated.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Delete tier
  const deleteTierMutation = useMutation({
    mutationFn: async (tierId: string) => {
      const { error } = await supabase
        .from('loyalty_tiers')
        .delete()
        .eq('id', tierId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-tiers'] });
      toast({ title: 'Deleted', description: 'Tier removed.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Upsert earn rule
  const upsertEarnRuleMutation = useMutation({
    mutationFn: async (ruleData: Partial<LoyaltyEarnRule>) => {
      if (!program?.id || !currentResort?.id) throw new Error('No program');
      
      const existingRule = earnRules.find(r => r.category === ruleData.category);
      
      if (existingRule) {
        const { error } = await supabase
          .from('loyalty_earn_rules')
          .update({
            earn_rate: ruleData.earn_rate,
            earn_type: ruleData.earn_type,
            is_active: ruleData.is_active,
          })
          .eq('id', existingRule.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('loyalty_earn_rules')
          .insert({
            program_id: program.id,
            resort_id: currentResort.id,
            category: ruleData.category!,
            earn_rate: ruleData.earn_rate ?? 10,
            earn_type: ruleData.earn_type ?? 'per_booking',
            is_active: ruleData.is_active ?? true,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-earn-rules'] });
      toast({ title: 'Saved', description: 'Earn rule updated.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    isLoyaltyEnabled,
    isAtLeastElite,
    program,
    programLoading,
    programError,
    tiers,
    tiersLoading,
    earnRules,
    earnRulesLoading,
    upsertProgram: upsertProgramMutation.mutate,
    upsertProgramPending: upsertProgramMutation.isPending,
    createTier: createTierMutation.mutate,
    createTierPending: createTierMutation.isPending,
    updateTier: updateTierMutation.mutate,
    updateTierPending: updateTierMutation.isPending,
    deleteTier: deleteTierMutation.mutate,
    deleteTierPending: deleteTierMutation.isPending,
    upsertEarnRule: upsertEarnRuleMutation.mutate,
    upsertEarnRulePending: upsertEarnRuleMutation.isPending,
  };
}

// Hook for fetching loyalty members
export function useLoyaltyMembers() {
  const { currentResort } = useResort();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['loyalty-members', currentResort?.id],
    queryFn: async () => {
      if (!currentResort?.id) return [];
      const { data, error } = await supabase
        .from('loyalty_members')
        .select(`
          *,
          guest:guests(id, full_name, room_number, email, check_in_date, check_out_date),
          current_tier:loyalty_tiers(*)
        `)
        .eq('resort_id', currentResort.id)
        .order('lifetime_points', { ascending: false });
      if (error) throw error;
      return data as LoyaltyMember[];
    },
    enabled: !!currentResort?.id,
  });

  // Adjust points mutation
  const adjustPointsMutation = useMutation({
    mutationFn: async ({ memberId, points, note }: { memberId: string; points: number; note?: string }) => {
      const { data, error } = await supabase.rpc('adjust_loyalty_points', {
        p_member_id: memberId,
        p_points: points,
        p_note: note || null,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error || 'Failed to adjust points');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-members'] });
      queryClient.invalidateQueries({ queryKey: ['loyalty-transactions'] });
      toast({ title: 'Points Adjusted', description: 'Member points updated successfully.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  // Update tier mutation
  const updateMemberTierMutation = useMutation({
    mutationFn: async ({ memberId, tierId }: { memberId: string; tierId: string }) => {
      const { error } = await supabase
        .from('loyalty_members')
        .update({ current_tier_id: tierId })
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loyalty-members'] });
      toast({ title: 'Tier Updated', description: 'Member tier changed.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    },
  });

  return {
    members,
    isLoading,
    adjustPoints: adjustPointsMutation.mutate,
    adjustPointsPending: adjustPointsMutation.isPending,
    updateMemberTier: updateMemberTierMutation.mutate,
    updateMemberTierPending: updateMemberTierMutation.isPending,
  };
}

// Hook for fetching member transactions
export function useLoyaltyTransactions(memberId: string | undefined) {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['loyalty-transactions', memberId],
    queryFn: async () => {
      if (!memberId) return [];
      const { data, error } = await supabase
        .from('loyalty_transactions')
        .select('*')
        .eq('member_id', memberId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as LoyaltyTransaction[];
    },
    enabled: !!memberId,
  });

  return { transactions, isLoading };
}

type LoyaltyEarnSource = 'activity_booking' | 'dining_booking' | 'room_night' | 'spa_booking' | 'manual_adjustment' | 'welcome_bonus' | 'tier_bonus' | 'referral';

// Helper to award points (for booking flows)
export async function awardLoyaltyPoints(
  guestId: string,
  resortId: string,
  source: LoyaltyEarnSource,
  points: number,
  referenceId?: string,
  referenceType?: string,
  note?: string
) {
  try {
    const { data, error } = await supabase.rpc('award_loyalty_points', {
      p_guest_id: guestId,
      p_resort_id: resortId,
      p_source: source,
      p_points: points,
      p_reference_id: referenceId || null,
      p_reference_type: referenceType || null,
      p_note: note || null,
    });
    if (error) {
      console.error('Failed to award loyalty points:', error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Failed to award loyalty points:', err);
    return null;
  }
}
