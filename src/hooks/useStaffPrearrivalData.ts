import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toStringArray } from '@/lib/safe-array';

export interface PrearrivalProfile {
  id: string;
  prearrival_status: 'not_started' | 'partial' | 'completed';
  arrival_date: string | null;
  arrival_time: string | null;
  arrival_flight_number: string | null;
  transfer_preference: string | null;
  dietary_preferences: string[];
  allergies: string | null;
  room_preferences: Record<string, any> | null;
  water_comfort_level: string | null;
  special_occasions: string[];
  special_requests: string | null;
  custom_answers_json: Record<string, any> | null;
  policy_acknowledged_at: string | null;
  esignature_name: string | null;
  esignature_date: string | null;
  checkin_completed_at: string | null;
  staff_processed: boolean;
  staff_notes: string | null;
  stay_confirmed: boolean | null;
  baggage_count: number | null;
  pickup_notes: string | null;
  guest_names: any[] | null;
}

export interface PrearrivalSettings {
  is_enabled: boolean;
  show_arrival_details: boolean;
  show_preferences: boolean;
  show_special_occasions: boolean;
  require_policy_acknowledgement: boolean | null;
  require_esignature: boolean | null;
}

export interface PrearrivalLink {
  id: string;
  token: string;
  status: string;
  expires_at: string;
  last_opened_at: string | null;
  completed_at: string | null;
  verification_completed_at: string | null;
}

export interface StaffReview {
  id: string;
  reviewed_by: string;
  reviewed_at: string;
  internal_notes: string | null;
  reviewer_name?: string;
}

export interface StaffPrearrivalData {
  profile: PrearrivalProfile | null;
  settings: PrearrivalSettings | null;
  link: PrearrivalLink | null;
  review: StaffReview | null;
  status: 'not_started' | 'in_progress' | 'completed';
  hasAnyData: boolean;
}

interface UseStaffPrearrivalDataOptions {
  guestId: string;
  resortId: string;
  enabled?: boolean;
}

export function useStaffPrearrivalData({ guestId, resortId, enabled = true }: UseStaffPrearrivalDataOptions) {
  return useQuery({
    queryKey: ['staff-prearrival-data', guestId, resortId],
    queryFn: async (): Promise<StaffPrearrivalData> => {
      // Try unified RPC first (checks new system then falls back to legacy)
      const { data: unifiedResult } = await supabase.rpc('get_prearrival_data_unified', {
        p_guest_id: guestId,
        p_resort_id: resortId,
      });

      // Fetch other data in parallel
      const [settingsResult, linkResult, reviewResult] = await Promise.all([
        // Resort prearrival settings
        supabase
          .from('prearrival_settings')
          .select('is_enabled, show_arrival_details, show_preferences, show_special_occasions, require_policy_acknowledgement, require_esignature')
          .eq('resort_id', resortId)
          .maybeSingle(),
        
        // Active prearrival link (legacy system - for transition)
        supabase
          .from('prearrival_tokens')
          .select('id, token, status, expires_at, last_opened_at, completed_at, verification_completed_at')
          .eq('guest_id', guestId)
          .is('revoked_at', null)
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        
        // Staff review with reviewer name
        supabase
          .from('prearrival_staff_reviews')
          .select(`
            id, reviewed_by, reviewed_at, internal_notes,
            profiles:reviewed_by(full_name)
          `)
          .eq('guest_id', guestId)
          .maybeSingle(),
      ]);

      // Transform unified result to profile format
      let profile: PrearrivalProfile | null = null;
      const unified = unifiedResult as { source: string; data: any; completed_at?: string; updated_at?: string } | null;
      
      if (unified?.source !== 'none' && unified?.data) {
        const data = unified.data;
        profile = {
          id: '', // Not needed for display
          prearrival_status: unified.completed_at ? 'completed' : (Object.values(data).some(v => v) ? 'partial' : 'not_started'),
          arrival_date: null,
          arrival_time: data.arrival_time || null,
          arrival_flight_number: data.arrival_flight_number || null,
          transfer_preference: data.transfer_preference || null,
          dietary_preferences: toStringArray(data.dietary_preferences),
          allergies: data.allergies || null,
          room_preferences: data.room_preferences || null,
          water_comfort_level: data.water_comfort_level || null,
          special_occasions: toStringArray(data.special_occasions),
          special_requests: data.special_requests || null,
          custom_answers_json: data.custom_answers_json || null,
          policy_acknowledged_at: null,
          esignature_name: null,
          esignature_date: null,
          checkin_completed_at: unified.completed_at || null,
          staff_processed: false,
          staff_notes: null,
          stay_confirmed: null,
          baggage_count: null,
          pickup_notes: null,
          guest_names: null,
        };
      }

      const settings = settingsResult.data as PrearrivalSettings | null;
      const link = linkResult.data as PrearrivalLink | null;
      
      // Process review with reviewer name
      let review: StaffReview | null = null;
      if (reviewResult.data) {
        const reviewData = reviewResult.data as any;
        review = {
          id: reviewData.id,
          reviewed_by: reviewData.reviewed_by,
          reviewed_at: reviewData.reviewed_at,
          internal_notes: reviewData.internal_notes,
          reviewer_name: reviewData.profiles?.full_name || 'Staff',
        };
      }

      // Compute overall status
      let status: 'not_started' | 'in_progress' | 'completed' = 'not_started';
      
      if (profile) {
        if (profile.checkin_completed_at || profile.prearrival_status === 'completed') {
          status = 'completed';
        } else if (profile.prearrival_status === 'partial' || hasPartialData(profile)) {
          status = 'in_progress';
        }
      }

      const hasAnyData = !!(profile && hasPartialData(profile));

      return {
        profile,
        settings,
        link,
        review,
        status,
        hasAnyData,
      };
    },
    enabled: enabled && !!guestId && !!resortId,
    staleTime: 30000, // Cache for 30 seconds
  });
}

function hasPartialData(profile: PrearrivalProfile): boolean {
  return !!(
    profile.arrival_time ||
    profile.arrival_flight_number ||
    profile.transfer_preference ||
    profile.dietary_preferences.length > 0 ||
    profile.allergies ||
    profile.special_occasions.length > 0 ||
    profile.special_requests ||
    profile.policy_acknowledged_at
  );
}
