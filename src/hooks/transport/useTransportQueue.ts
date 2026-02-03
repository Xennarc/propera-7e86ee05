import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BuggyRequestStatus, BuggyRequestType, BuggyPriority } from '@/types/database';

export interface TransportQueueRequest {
  id: string;
  resort_id: string;
  guest_id: string | null;
  created_by_staff_user_id: string | null;
  request_source: string;
  request_type: string;
  party_size: number;
  needs_accessible: boolean;
  pickup_stop_id: string | null;
  pickup_text: string | null;
  pickup_location: unknown;
  dropoff_stop_id: string | null;
  dropoff_text: string | null;
  dropoff_location: unknown;
  scheduled_for: string | null;
  route_id: string | null;
  priority: string;
  status: string;
  status_reason: string | null;
  eta_minutes: number | null;
  idempotency_key: string | null;
  created_at: string;
  updated_at: string;
  guest_name: string | null;
  room_number: string | null;
  pickup_stop?: { id: string; name: string } | null;
  dropoff_stop?: { id: string; name: string } | null;
}

// Only show requests that are actionable in dispatch queue
const QUEUE_STATUSES: BuggyRequestStatus[] = [
  'requested',
  'queued',
];

export function useTransportQueue(resortId: string | undefined) {
  return useQuery({
    queryKey: ['transport-queue', resortId],
    queryFn: async () => {
      if (!resortId) return [];
      
      const { data, error } = await supabase
        .from('buggy_requests')
        .select(`
          *,
          guest:guests(full_name, room_number),
          pickup_stop:buggy_stops!buggy_requests_pickup_stop_id_fkey(id, name),
          dropoff_stop:buggy_stops!buggy_requests_dropoff_stop_id_fkey(id, name)
        `)
        .eq('resort_id', resortId)
        .in('status', QUEUE_STATUSES)
        // Phase 7: Integrity filters - only unattached, non-cancelled requests
        .is('cancelled_at', null)
        .is('attached_trip_id', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform to include flattened guest info
      return (data || []).map(req => ({
        ...req,
        guest_name: (req.guest as any)?.full_name || null,
        room_number: (req.guest as any)?.room_number || req.pickup_text || null,
        pickup_stop: req.pickup_stop || null,
        dropoff_stop: req.dropoff_stop || null,
      })) as TransportQueueRequest[];
    },
    enabled: !!resortId,
    refetchInterval: 10000, // Real-time polling every 10s
  });
}

export interface TransportQueueFilters {
  types?: BuggyRequestType[];
  priorities?: BuggyPriority[];
  needsAccessible?: boolean;
}

export function filterQueueRequests(
  requests: TransportQueueRequest[],
  filters: TransportQueueFilters
): TransportQueueRequest[] {
  return requests.filter(req => {
    if (filters.types?.length && !filters.types.includes(req.request_type as BuggyRequestType)) {
      return false;
    }
    if (filters.priorities?.length && !filters.priorities.includes(req.priority as BuggyPriority)) {
      return false;
    }
    if (filters.needsAccessible && !req.needs_accessible) {
      return false;
    }
    return true;
  });
}
