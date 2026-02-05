import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// ==========================================
// DB Types
// ==========================================

interface PlanPricingRow {
  id: string;
  tier: string;
  monthly_price_cents: number;
  currency: string;
  display_price_text: string | null;
  usage_included: string | null;
  overage_text: string | null;
  is_active: boolean;
  metadata_json: Record<string, unknown>;
}

interface AddonPricingRow {
  id: string;
  key: string;
  name: string;
  monthly_price_cents: number;
  currency: string;
  description: string | null;
  is_active: boolean;
  metadata_json: Record<string, unknown>;
}

// ==========================================
// UI Types (matching PricingPage shape)
// ==========================================

export interface PlanConfig {
  id: string;
  name: string;
  badge: string;
  badgeVariant: 'default' | 'popular' | 'elite';
  price: string;
  priceUnit: string;
  description: string;
  features: string[];
  usage: string;
  overage: string;
  cta: string;
  whoItsFor: string;
}

export interface AddonConfig {
  name: string;
  price: string;
  description: string;
}

// ==========================================
// Fallback Defaults (from original PricingPage)
// ==========================================

const DEFAULT_PLANS: PlanConfig[] = [
  {
    id: 'essential',
    name: 'Essential',
    badge: 'Get started',
    badgeVariant: 'default',
    price: '$499',
    priceUnit: 'per resort / month',
    description: 'Core guest + staff operations for a single resort getting started.',
    features: [
      'Guest Portal with room-based login',
      'Activity browsing + instant booking',
      'Dining reservations + time slots',
      'My Bookings hub (room-wide view)',
      'Staff Console + guest records',
      'Live availability + capacity controls',
      'Basic reports + in-app notifications',
    ],
    usage: 'Includes up to 1,500 guest stays / month',
    overage: 'Overage: $0.10 per guest stay',
    cta: 'Start with Essential',
    whoItsFor: 'Single resort getting started with digital guest operations.',
  },
  {
    id: 'professional',
    name: 'Professional',
    badge: 'Most popular',
    badgeVariant: 'popular',
    price: '$899',
    priceUnit: 'per resort / month',
    description: 'Operations suite + transport for resorts running daily ops at scale.',
    features: [
      'Everything in Essential, plus:',
      'Guest Requests inbox (SLA lanes + timelines)',
      'Transport dispatch + Driver Portal',
      'Pre-arrival wizard + booking links',
      'Guest 360° profile + CSV import',
      'Advanced scheduling (recurring, closures, resources)',
      'Multi-language (EN/ZH) + resort branding',
      'Module reports + CSV export',
      'Staff management + role-based access',
    ],
    usage: 'Includes up to 3,000 guest stays / month',
    overage: 'Overage: $0.08 per guest stay',
    cta: 'Choose Professional',
    whoItsFor: 'Resorts running daily ops at scale across departments.',
  },
  {
    id: 'enterprise',
    name: 'Elite',
    badge: 'Premium control',
    badgeVariant: 'elite',
    price: '$1,499',
    priceUnit: 'per resort / month',
    description: 'Advanced analytics + AI insights for premium resorts optimizing performance.',
    features: [
      'Everything in Professional, plus:',
      'Loyalty program (points, tiers, rewards)',
      'AI Concierge + AI-powered insights',
      'Sales performance + trend analysis',
      'Day-of-week patterns + lead time analysis',
      'Booking health monitoring',
      'Priority support + SLA options',
    ],
    usage: 'Includes up to 6,000 guest stays / month',
    overage: 'Overage: $0.06 per guest stay',
    cta: 'Talk to Sales',
    whoItsFor: 'Premium resorts and groups optimizing performance with data.',
  },
];

const DEFAULT_ADDONS: AddonConfig[] = [
  { name: 'Loyalty Program Suite', price: '$199 / month', description: 'Guest rewards, tier management, and return visit tracking.' },
  { name: 'Analytics Plus', price: '$199 / month', description: 'Executive dashboards & deeper insights.' },
  { name: 'Premium Support', price: '$199 / month', description: 'Priority channels & extended coverage.' },
  { name: 'Managed Content', price: 'from $150 / month', description: 'We maintain your activity catalog & seasonal updates.' },
];

// ==========================================
// Tier to Plan mapping
// ==========================================

const TIER_TO_PLAN_MAP: Record<string, { 
  id: string; 
  badge: string; 
  badgeVariant: 'default' | 'popular' | 'elite';
  description: string;
  features: string[];
  cta: string;
  whoItsFor: string;
}> = {
  ESSENTIAL: {
    id: 'essential',
    badge: 'Get started',
    badgeVariant: 'default',
    description: 'Core guest + staff operations for a single resort getting started.',
    features: [
      'Guest Portal with room-based login',
      'Activity browsing + instant booking',
      'Dining reservations + time slots',
      'My Bookings hub (room-wide view)',
      'Staff Console + guest records',
      'Live availability + capacity controls',
      'Basic reports + in-app notifications',
    ],
    cta: 'Start with Essential',
    whoItsFor: 'Single resort getting started with digital guest operations.',
  },
  PROFESSIONAL: {
    id: 'professional',
    badge: 'Most popular',
    badgeVariant: 'popular',
    description: 'Operations suite + transport for resorts running daily ops at scale.',
    features: [
      'Everything in Essential, plus:',
      'Guest Requests inbox (SLA lanes + timelines)',
      'Transport dispatch + Driver Portal',
      'Pre-arrival wizard + booking links',
      'Guest 360° profile + CSV import',
      'Advanced scheduling (recurring, closures, resources)',
      'Multi-language (EN/ZH) + resort branding',
      'Module reports + CSV export',
      'Staff management + role-based access',
    ],
    cta: 'Choose Professional',
    whoItsFor: 'Resorts running daily ops at scale across departments.',
  },
  ELITE: {
    id: 'enterprise',
    badge: 'Premium control',
    badgeVariant: 'elite',
    description: 'Advanced analytics + AI insights for premium resorts optimizing performance.',
    features: [
      'Everything in Professional, plus:',
      'Loyalty program (points, tiers, rewards)',
      'AI Concierge + AI-powered insights',
      'Sales performance + trend analysis',
      'Day-of-week patterns + lead time analysis',
      'Booking health monitoring',
      'Priority support + SLA options',
    ],
    cta: 'Talk to Sales',
    whoItsFor: 'Premium resorts and groups optimizing performance with data.',
  },
};

// ==========================================
// Helper: Format cents to display price
// ==========================================

function formatCentsToPrice(cents: number, currency: string = 'USD'): string {
  const dollars = cents / 100;
  if (currency === 'USD') {
    return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(dollars);
}

// ==========================================
// Hook: usePricingConfig
// ==========================================

export function usePricingConfig() {
  // Fetch plan pricing
  const plansQuery = useQuery({
    queryKey: ['pricing', 'plans'],
    queryFn: async (): Promise<PlanConfig[]> => {
      const { data, error } = await supabase
        .from('plan_pricing')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price_cents', { ascending: true });

      if (error) {
        console.warn('[usePricingConfig] Failed to fetch plan pricing:', error.message);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('[usePricingConfig] No active plan pricing found, using defaults');
        return DEFAULT_PLANS;
      }

      // Map DB rows to UI shape
      return (data as PlanPricingRow[]).map((row) => {
        const tierConfig = TIER_TO_PLAN_MAP[row.tier] || TIER_TO_PLAN_MAP.ESSENTIAL;
        const tierName = row.tier === 'ELITE' ? 'Elite' : 
                         row.tier === 'PROFESSIONAL' ? 'Professional' : 'Essential';

        return {
          id: tierConfig.id,
          name: tierName,
          badge: tierConfig.badge,
          badgeVariant: tierConfig.badgeVariant,
          price: row.display_price_text || formatCentsToPrice(row.monthly_price_cents, row.currency),
          priceUnit: 'per resort / month',
          description: tierConfig.description,
          features: tierConfig.features,
          usage: row.usage_included || '',
          overage: row.overage_text ? `Overage: ${row.overage_text}` : '',
          cta: tierConfig.cta,
          whoItsFor: tierConfig.whoItsFor,
        };
      });
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
    retry: 1,
  });

  // Fetch addon pricing
  const addonsQuery = useQuery({
    queryKey: ['pricing', 'addons'],
    queryFn: async (): Promise<AddonConfig[]> => {
      const { data, error } = await supabase
        .from('addon_pricing')
        .select('*')
        .eq('is_active', true)
        .order('monthly_price_cents', { ascending: true });

      if (error) {
        console.warn('[usePricingConfig] Failed to fetch addon pricing:', error.message);
        throw error;
      }

      if (!data || data.length === 0) {
        console.warn('[usePricingConfig] No active addon pricing found, using defaults');
        return DEFAULT_ADDONS;
      }

      // Map DB rows to UI shape
      return (data as AddonPricingRow[]).map((row) => ({
        name: row.name,
        price: `${formatCentsToPrice(row.monthly_price_cents, row.currency)} / month`,
        description: row.description || '',
      }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });

  // Return with safe fallbacks
  return {
    plans: plansQuery.data ?? DEFAULT_PLANS,
    addons: addonsQuery.data ?? DEFAULT_ADDONS,
    isLoading: plansQuery.isLoading || addonsQuery.isLoading,
    isError: plansQuery.isError && addonsQuery.isError,
  };
}
