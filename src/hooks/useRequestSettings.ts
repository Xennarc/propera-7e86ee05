import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Settings for guest request feature, configurable per resort
 */
export interface RequestSettings {
  // SLA times (in minutes)
  asapResponseMin: number;
  asapResponseMax: number;
  scheduledResponseMin: number;
  scheduledResponseMax: number;
  
  // Operating hours (0-23)
  requestsStartHour: number;
  requestsEndHour: number;
  
  // Limits
  maxBundleItems: number;
  maxTotalQuantity: number;
  
  // Quick suggestions
  quickSuggestions: string[];
  
  // UI Microcopy
  headerTagline: string;
  emptyStateTitle: string;
  emptyStateDescription: string;
  footerResponseText: string;
}

/**
 * Default values when no resort settings are configured
 */
export const DEFAULT_REQUEST_SETTINGS: RequestSettings = {
  asapResponseMin: 10,
  asapResponseMax: 15,
  scheduledResponseMin: 30,
  scheduledResponseMax: 60,
  requestsStartHour: 6,
  requestsEndHour: 23,
  maxBundleItems: 10,
  maxTotalQuantity: 20,
  quickSuggestions: [
    'Extra towels',
    'Room cleaning',
    'Extra pillows',
    'Wake-up call',
    'Iron & board',
    'Extra toiletries',
  ],
  headerTagline: 'Tap what you need — we\'ll notify the team.',
  emptyStateTitle: 'Your personal concierge',
  emptyStateDescription: 'We\'re setting up your request options. In the meantime, our team is here to help with anything you need.',
  footerResponseText: 'Our team typically responds within {min}-{max} minutes during operating hours',
};

interface RpcResponse {
  asap_response_min: number;
  asap_response_max: number;
  scheduled_response_min: number;
  scheduled_response_max: number;
  requests_start_hour: number;
  requests_end_hour: number;
  max_bundle_items: number;
  max_total_quantity: number;
  quick_suggestions: string[];
  header_tagline: string;
  empty_state_title: string;
  empty_state_description: string;
  footer_response_text: string;
}

function mapToRequestSettings(data: RpcResponse | null): RequestSettings {
  if (!data) return DEFAULT_REQUEST_SETTINGS;
  
  return {
    asapResponseMin: data.asap_response_min ?? DEFAULT_REQUEST_SETTINGS.asapResponseMin,
    asapResponseMax: data.asap_response_max ?? DEFAULT_REQUEST_SETTINGS.asapResponseMax,
    scheduledResponseMin: data.scheduled_response_min ?? DEFAULT_REQUEST_SETTINGS.scheduledResponseMin,
    scheduledResponseMax: data.scheduled_response_max ?? DEFAULT_REQUEST_SETTINGS.scheduledResponseMax,
    requestsStartHour: data.requests_start_hour ?? DEFAULT_REQUEST_SETTINGS.requestsStartHour,
    requestsEndHour: data.requests_end_hour ?? DEFAULT_REQUEST_SETTINGS.requestsEndHour,
    maxBundleItems: data.max_bundle_items ?? DEFAULT_REQUEST_SETTINGS.maxBundleItems,
    maxTotalQuantity: data.max_total_quantity ?? DEFAULT_REQUEST_SETTINGS.maxTotalQuantity,
    quickSuggestions: Array.isArray(data.quick_suggestions) 
      ? data.quick_suggestions 
      : DEFAULT_REQUEST_SETTINGS.quickSuggestions,
    headerTagline: data.header_tagline ?? DEFAULT_REQUEST_SETTINGS.headerTagline,
    emptyStateTitle: data.empty_state_title ?? DEFAULT_REQUEST_SETTINGS.emptyStateTitle,
    emptyStateDescription: data.empty_state_description ?? DEFAULT_REQUEST_SETTINGS.emptyStateDescription,
    footerResponseText: data.footer_response_text ?? DEFAULT_REQUEST_SETTINGS.footerResponseText,
  };
}

/**
 * Format response time text by replacing {min} and {max} placeholders
 */
export function formatResponseTime(template: string, min: number, max: number): string {
  return template
    .replace('{min}', String(min))
    .replace('{max}', String(max));
}

/**
 * Hook to fetch resort-specific request settings
 * Returns default values if no settings are configured
 */
export function useRequestSettings(resortId: string, enabled = true) {
  const query = useQuery({
    queryKey: ['request-settings', resortId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('guest_get_request_settings', {
        p_resort_id: resortId,
      });

      if (error) {
        console.error('Error fetching request settings:', error);
        return DEFAULT_REQUEST_SETTINGS;
      }
      
      return mapToRequestSettings(data as unknown as RpcResponse | null);
    },
    enabled: enabled && !!resortId,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    gcTime: 30 * 60 * 1000,
  });

  return {
    settings: query.data ?? DEFAULT_REQUEST_SETTINGS,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
