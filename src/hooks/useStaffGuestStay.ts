import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StaffGuestStay {
  id: string;
  status: 'pre_arrival' | 'in_house' | 'checked_out';
  arrivalDate: string;
  departureDate: string;
  roomNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StaffAccessLink {
  id: string;
  tokenHint: string;
  expiresAt: string;
  consumedAt: string | null;
  createdAt: string;
}

export interface PreArrivalSubmission {
  id: string;
  payload: {
    arrival_time?: string;
    arrival_flight_number?: string;
    transfer_preference?: string;
    dietary_preferences?: string[];
    allergies?: string;
    water_comfort_level?: string;
    special_occasions?: string[];
    special_requests?: string;
    room_preferences?: Record<string, unknown>;
    custom_answers_json?: Record<string, unknown>;
    num_children?: number;
  };
  completedAt: string | null;
  updatedAt: string;
}

export interface StaffGuestStayData {
  stay: StaffGuestStay | null;
  accessLinks: StaffAccessLink[];
  submission: PreArrivalSubmission | null;
  isLoading: boolean;
  refetch: () => void;
}

export function useStaffGuestStay(guestId: string, resortId: string): StaffGuestStayData {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['staff-guest-stay', guestId, resortId],
    queryFn: async () => {
      if (!guestId || !resortId) {
        return { stay: null, accessLinks: [], submission: null };
      }

      // Fetch stays for this guest, prioritizing by status
      const { data: stays, error: stayError } = await supabase
        .from('guest_stays')
        .select('*')
        .eq('guest_id', guestId)
        .eq('resort_id', resortId)
        .order('arrival_date', { ascending: false });

      if (stayError) {
        console.error('Error fetching guest stays:', stayError);
        return { stay: null, accessLinks: [], submission: null };
      }

      // Find the best stay: in_house > pre_arrival > most recent
      const activeStay = stays?.find(s => s.status === 'in_house')
        || stays?.find(s => s.status === 'pre_arrival')
        || stays?.[0];

      if (!activeStay) {
        return { stay: null, accessLinks: [], submission: null };
      }

      const stay: StaffGuestStay = {
        id: activeStay.id,
        status: activeStay.status as 'pre_arrival' | 'in_house' | 'checked_out',
        arrivalDate: activeStay.arrival_date,
        departureDate: activeStay.departure_date,
        roomNumber: activeStay.room_number,
        createdAt: activeStay.created_at,
        updatedAt: activeStay.updated_at,
      };

      // Legacy access links removed - all guest access now uses PIN-based authentication
      // The guest_access_links table will be dropped in a future migration
      const accessLinks: StaffAccessLink[] = [];

      // Fetch pre-arrival submission for this stay
      const { data: submissions, error: subError } = await supabase
        .from('pre_arrival_submissions')
        .select('*')
        .eq('stay_id', activeStay.id)
        .limit(1);

      if (subError) {
        console.error('Error fetching submission:', subError);
      }

      const submissionData = submissions?.[0];
      const submission: PreArrivalSubmission | null = submissionData ? {
        id: submissionData.id,
        payload: (submissionData.payload as PreArrivalSubmission['payload']) || {},
        completedAt: submissionData.completed_at,
        updatedAt: submissionData.updated_at,
      } : null;

      return { stay, accessLinks, submission };
    },
    enabled: !!guestId && !!resortId,
    staleTime: 30000, // 30 seconds
  });

  return {
    stay: data?.stay ?? null,
    accessLinks: data?.accessLinks ?? [],
    submission: data?.submission ?? null,
    isLoading,
    refetch,
  };
}
