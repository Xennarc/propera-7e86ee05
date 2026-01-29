/**
 * useResortBranding Hook
 * 
 * A centralized hook for fetching resort branding data per-resort.
 * This is the single source of truth for branding in the guest portal.
 * 
 * IMPORTANT:
 * - Branding is fetched from the DB on each page load (with short cache)
 * - After staff saves branding, the query cache is invalidated
 * - Guest portal will see updates on next navigation/refresh
 * 
 * How to refresh branding after save:
 * - Call invalidateResortBranding(resortId) after saving branding settings
 * - Or use queryClient.invalidateQueries({ queryKey: ['resort-branding', resortId] })
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ResortBranding {
  id: string;
  name: string;
  code: string;
  login_logo_url: string | null;
  login_hero_image_url: string | null;
  home_hero_image_url: string | null;
  login_primary_color: string | null;
  login_accent_color: string | null;
  guest_login_title: string | null;
  guest_login_subtitle: string | null;
  guest_login_instructions: string | null;
  brand_theme: string | null;
  brand_wordmark: string | null;
  // New enhanced branding fields
  brand_button_style: 'rounded' | 'pill' | 'squared' | null;
  brand_card_style: 'elevated' | 'outlined' | 'flat' | null;
  brand_corner_radius: number | null;
  brand_font_family: string | null;
  brand_background_tint: string | null;
  brand_success_color: string | null;
  brand_warning_color: string | null;
  favicon_url: string | null;
}

// Default branding values when no custom branding is set
// Colors are null so CSS fallbacks use Propera system colors (lime/blurple)
export const DEFAULT_BRANDING: Partial<ResortBranding> = {
  login_primary_color: null,  // Falls back to --lime-400 in CSS
  login_accent_color: null,   // Falls back to --blurple-500 in CSS
  brand_theme: 'AUTO',        // Follow system preference by default
  brand_button_style: 'rounded',
  brand_card_style: 'elevated',
  brand_corner_radius: 12,
  brand_font_family: 'Plus Jakarta Sans',
  brand_background_tint: null,
  brand_success_color: null,
  brand_warning_color: null,
  favicon_url: null,
};

/**
 * Fetch branding for a specific resort
 * Can be called with either resortId (UUID) or resortCode (string like 'oasis')
 */
async function fetchResortBranding(resortIdOrCode: string): Promise<ResortBranding | null> {
  // Determine if it's a UUID or a code
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resortIdOrCode);
  
  // Query resort directly - RLS policy restricts to active resorts only
  const query = supabase
    .from('resorts')
    .select('id, name, code, login_logo_url, login_hero_image_url, home_hero_image_url, login_primary_color, login_accent_color, guest_login_title, guest_login_subtitle, guest_login_instructions, brand_theme, brand_wordmark, brand_button_style, brand_card_style, brand_corner_radius, brand_font_family, brand_background_tint, brand_success_color, brand_warning_color, favicon_url');
  
  if (isUuid) {
    const { data, error } = await query.eq('id', resortIdOrCode).maybeSingle();
    if (error) {
      console.error('Error fetching resort branding by ID:', error);
      return null;
    }
    return data as ResortBranding | null;
  } else {
    const { data, error } = await query.ilike('code', resortIdOrCode).maybeSingle();
    if (error) {
      console.error('Error fetching resort branding by code:', error);
      return null;
    }
    return data as ResortBranding | null;
  }
}

/**
 * Hook to get resort branding data
 * - Fetches from DB with short stale time for freshness
 * - Falls back to default values when branding is missing
 */
export function useResortBranding(resortIdOrCode: string | undefined) {
  return useQuery({
    queryKey: ['resort-branding', resortIdOrCode],
    queryFn: () => fetchResortBranding(resortIdOrCode!),
    enabled: !!resortIdOrCode,
    staleTime: 30 * 1000, // Consider stale after 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (renamed from cacheTime)
    refetchOnWindowFocus: true, // Refetch when user returns to the tab
  });
}

/**
 * Get branding with defaults applied
 */
export function getBrandingWithDefaults(branding: ResortBranding | null | undefined): ResortBranding & typeof DEFAULT_BRANDING {
  if (!branding) {
    return {
      id: '',
      name: '',
      code: '',
      login_logo_url: null,
      login_hero_image_url: null,
      home_hero_image_url: null,
      guest_login_title: null,
      guest_login_subtitle: null,
      guest_login_instructions: null,
      brand_wordmark: null,
      ...DEFAULT_BRANDING,
    } as ResortBranding & typeof DEFAULT_BRANDING;
  }

  return {
    ...branding,
    // Don't override null colors - let CSS defaults handle Propera system colors
    login_primary_color: branding.login_primary_color,
    login_accent_color: branding.login_accent_color,
    brand_theme: branding.brand_theme || 'AUTO',
    // Apply defaults for new enhanced branding fields
    brand_button_style: branding.brand_button_style || 'rounded',
    brand_card_style: branding.brand_card_style || 'elevated',
    brand_corner_radius: branding.brand_corner_radius ?? 12,
    brand_font_family: branding.brand_font_family || 'Plus Jakarta Sans',
    brand_background_tint: branding.brand_background_tint,
    brand_success_color: branding.brand_success_color,
    brand_warning_color: branding.brand_warning_color,
    favicon_url: branding.favicon_url,
  };
}

/**
 * Utility hook for invalidating branding cache
 * Call this after saving branding settings
 */
export function useInvalidateResortBranding() {
  const queryClient = useQueryClient();
  
  return (resortId: string) => {
    // Invalidate by resort ID
    queryClient.invalidateQueries({ queryKey: ['resort-branding', resortId] });
    // Also invalidate any code-based queries by clearing all branding queries
    queryClient.invalidateQueries({ queryKey: ['resort-branding'] });
  };
}
