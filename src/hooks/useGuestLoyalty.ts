import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useGuestAuth } from '@/contexts/GuestAuthContext';

export interface GuestLoyaltyInfo {
  enrolled: boolean;
  member_id?: string;
  points_balance?: number;
  lifetime_points?: number;
  joined_at?: string;
  status?: string;
  program?: {
    id: string;
    name: string;
    description: string | null;
    currency_name: string;
  };
  current_tier?: {
    id: string;
    name: string;
    description: string | null;
    badge_color: string;
    badge_icon: string | null;
    perks: string[];
    is_elite: boolean;
  };
  next_tier?: {
    id: string;
    name: string;
    min_points: number;
    points_needed: number;
  };
  all_tiers?: Array<{
    id: string;
    name: string;
    min_points: number;
    perks: string[];
    badge_color: string;
    is_current: boolean;
  }>;
  recent_transactions?: Array<{
    id: string;
    type: 'earn' | 'redeem' | 'adjustment' | 'expire';
    points_change: number;
    source: string;
    note: string | null;
    created_at: string;
  }>;
}

export function useGuestLoyalty() {
  const { guest } = useGuestAuth();

  const {
    data: loyaltyInfo,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['guest-loyalty', guest?.guestId],
    queryFn: async () => {
      if (!guest?.guestId) return { enrolled: false } as GuestLoyaltyInfo;
      
      const { data, error } = await supabase.rpc('guest_get_loyalty_info', {
        p_guest_id: guest.guestId,
      });
      
      if (error) throw error;
      
      // Handle the response
      const result = data as unknown as GuestLoyaltyInfo;
      if (!result || !result.member_id) {
        return { enrolled: false } as GuestLoyaltyInfo;
      }
      
      return { ...result, enrolled: true } as GuestLoyaltyInfo;
    },
    enabled: !!guest?.guestId,
  });

  const isEnrolled = loyaltyInfo?.enrolled === true;
  const currentTier = loyaltyInfo?.current_tier;
  const nextTier = loyaltyInfo?.next_tier;
  const pointsBalance = loyaltyInfo?.points_balance ?? 0;
  const lifetimePoints = loyaltyInfo?.lifetime_points ?? 0;
  
  // Calculate progress to next tier
  const progressToNextTier = nextTier && currentTier
    ? Math.min(100, ((lifetimePoints - (currentTier ? 0 : 0)) / nextTier.min_points) * 100)
    : 100;

  return {
    loyaltyInfo,
    isLoading,
    error,
    refetch,
    isEnrolled,
    currentTier,
    nextTier,
    pointsBalance,
    lifetimePoints,
    progressToNextTier,
    program: loyaltyInfo?.program,
    allTiers: loyaltyInfo?.all_tiers ?? [],
    recentTransactions: loyaltyInfo?.recent_transactions ?? [],
  };
}
