/**
 * useSessionPickup – Query and create pickup trips linked to activity sessions.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface LinkedPickupTrip {
  id: string;
  status: string;
  trip_type: string;
  notes: string | null;
  start_at: string | null;
  driver_user_id: string | null;
  buggy_id: string | null;
  created_at: string;
  lifecycle_state: string | null;
  buggy_name: string | null;
  stop_count: number;
}

export const sessionPickupKeys = {
  bySession: (sessionId: string) => ['session-pickup', sessionId] as const,
};

/**
 * Fetch the pickup trip linked to a session via session_transport_links.
 */
export function useSessionPickupTrip(sessionId: string | undefined, resortId: string | undefined) {
  return useQuery({
    queryKey: sessionPickupKeys.bySession(sessionId!),
    queryFn: async (): Promise<LinkedPickupTrip | null> => {
      // Get link
      const { data: link, error: linkErr } = await supabase
        .from('session_transport_links')
        .select('trip_id')
        .eq('session_id', sessionId!)
        .eq('link_type', 'pickup')
        .maybeSingle();
      if (linkErr) throw linkErr;
      if (!link) return null;

      // Get trip details
      const { data: trip, error: tripErr } = await supabase
        .from('buggy_trips')
        .select(`
          id, status, trip_type, notes, start_at, driver_user_id, buggy_id,
          created_at, lifecycle_state,
          buggy:buggies(name),
          trip_stops:buggy_trip_stops(id)
        `)
        .eq('id', link.trip_id)
        .single();
      if (tripErr) throw tripErr;

      return {
        id: trip.id,
        status: trip.status,
        trip_type: trip.trip_type,
        notes: trip.notes,
        start_at: trip.start_at,
        driver_user_id: trip.driver_user_id,
        buggy_id: trip.buggy_id,
        created_at: trip.created_at,
        lifecycle_state: trip.lifecycle_state,
        buggy_name: (trip.buggy as any)?.name ?? null,
        stop_count: Array.isArray(trip.trip_stops) ? trip.trip_stops.length : 0,
      };
    },
    enabled: !!sessionId && !!resortId,
    staleTime: 10_000,
  });
}

export interface PickupGuest {
  bookingId: string;
  guestId: string;
  guestName: string;
  roomNumber: string;
  partySize: number;
  pickupLocation: string; // room_number as fallback
  included: boolean;
}

interface GeneratePickupParams {
  sessionId: string;
  resortId: string;
  activityName: string;
  sessionTime: string;
  meetingPoint: string;
  guests: PickupGuest[];
  pickupWindowStart: string; // HH:mm
}

/**
 * Create a pickup trip for a session.
 */
export function useGeneratePickupTrip() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: GeneratePickupParams) => {
      const { sessionId, resortId, activityName, sessionTime, meetingPoint, guests, pickupWindowStart } = params;
      const includedGuests = guests.filter(g => g.included);
      if (includedGuests.length === 0) throw new Error('No guests selected');

      // 1. Create the trip
      const tripTitle = `Pickup: ${activityName} ${sessionTime}`;
      const { data: trip, error: tripErr } = await supabase
        .from('buggy_trips')
        .insert({
          resort_id: resortId,
          trip_type: 'activity_pickup' as any,
          status: 'planning',
          notes: tripTitle,
          capacity_total: includedGuests.reduce((s, g) => s + g.partySize, 0),
          created_by_staff_id: user?.id ?? null,
          metadata: {
            session_id: sessionId,
            activity_name: activityName,
            meeting_point: meetingPoint,
          },
          start_at: null, // Will be set when driver is assigned
        })
        .select('id')
        .single();
      if (tripErr) throw tripErr;

      // 2. Create trip stops: pickup locations → meeting point (dropoff)
      // Group guests by room_number for pickup stops
      const locationGroups = new Map<string, PickupGuest[]>();
      for (const g of includedGuests) {
        const loc = g.pickupLocation || g.roomNumber;
        const group = locationGroups.get(loc) || [];
        group.push(g);
        locationGroups.set(loc, group);
      }

      const stops: Array<{
        trip_id: string;
        resort_id: string;
        sequence: number;
        stop_kind: string;
        title: string;
        status: string;
      }> = [];

      let seq = 1;
      for (const [location, groupGuests] of locationGroups) {
        const pax = groupGuests.reduce((s, g) => s + g.partySize, 0);
        stops.push({
          trip_id: trip.id,
          resort_id: resortId,
          sequence: seq++,
          stop_kind: 'pickup',
          title: `${location} (${pax} pax: ${groupGuests.map(g => g.guestName).join(', ')})`,
          status: 'pending',
        });
      }

      // Final stop: meeting point (dropoff)
      stops.push({
        trip_id: trip.id,
        resort_id: resortId,
        sequence: seq,
        stop_kind: 'dropoff',
        title: `Meeting point: ${meetingPoint}`,
        status: 'pending',
      });

      const { error: stopsErr } = await supabase
        .from('buggy_trip_stops')
        .insert(stops as any);
      if (stopsErr) throw stopsErr;

      // 3. Link trip to session
      const { error: linkErr } = await supabase
        .from('session_transport_links')
        .insert({
          session_id: sessionId,
          resort_id: resortId,
          trip_id: trip.id,
          link_type: 'pickup',
        });
      if (linkErr) throw linkErr;

      return trip.id;
    },
    onSuccess: (_, params) => {
      toast.success('Pickup run created ✅');
      qc.invalidateQueries({ queryKey: sessionPickupKeys.bySession(params.sessionId) });
      qc.invalidateQueries({ queryKey: ['transport-trips', params.resortId] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to create pickup run');
    },
  });
}
