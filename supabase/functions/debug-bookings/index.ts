import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEMO_RESORT_CODE = 'DEMO';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { guest_id, resort_id } = await req.json();

    if (!guest_id || !resort_id) {
      return new Response(
        JSON.stringify({ error: 'Missing guest_id or resort_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Security: Only allow for DEMO resort
    const { data: resort, error: resortError } = await supabase
      .from('resorts')
      .select('id, code')
      .eq('id', resort_id)
      .single();

    if (resortError || !resort) {
      return new Response(
        JSON.stringify({ error: 'Resort not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (resort.code !== DEMO_RESORT_CODE) {
      return new Response(
        JSON.stringify({ error: 'Debug endpoint only available for demo resort' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify guest exists and belongs to this resort
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, full_name, room_number, resort_id')
      .eq('id', guest_id)
      .eq('resort_id', resort_id)
      .single();

    if (guestError || !guest) {
      return new Response(
        JSON.stringify({ 
          error: 'Guest not found or does not belong to this resort',
          guest_id,
          resort_id,
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get all guest IDs for this room (for room-based booking lookup)
    const { data: roomGuests } = await supabase
      .from('guests')
      .select('id')
      .eq('resort_id', resort_id)
      .eq('room_number', guest.room_number);

    const roomGuestIds = roomGuests?.map(g => g.id) || [guest_id];

    // Count total activity bookings for resort
    const { count: totalActivityBookings } = await supabase
      .from('activity_bookings')
      .select('*', { count: 'exact', head: true })
      .eq('resort_id', resort_id);

    // Count total restaurant reservations for resort
    const { count: totalRestaurantReservations } = await supabase
      .from('restaurant_reservations')
      .select('*', { count: 'exact', head: true })
      .eq('resort_id', resort_id);

    // Activity bookings for this guest/room
    const { data: guestActivityBookings, error: activityError } = await supabase
      .from('activity_bookings')
      .select('id, status, created_at, guest_id, session_id')
      .eq('resort_id', resort_id)
      .in('guest_id', roomGuestIds)
      .order('created_at', { ascending: false })
      .limit(10);

    // Restaurant reservations for this guest/room
    const { data: guestReservations, error: reservationError } = await supabase
      .from('restaurant_reservations')
      .select('id, status, created_at, guest_id, restaurant_slot_id')
      .eq('resort_id', resort_id)
      .in('guest_id', roomGuestIds)
      .order('created_at', { ascending: false })
      .limit(10);

    // Group by status
    const activityStatusCounts: Record<string, number> = {};
    (guestActivityBookings || []).forEach((b: any) => {
      activityStatusCounts[b.status] = (activityStatusCounts[b.status] || 0) + 1;
    });

    const reservationStatusCounts: Record<string, number> = {};
    (guestReservations || []).forEach((r: any) => {
      reservationStatusCounts[r.status] = (reservationStatusCounts[r.status] || 0) + 1;
    });

    // Test RPC execution
    let rpcResult: { success: boolean; error?: string; activityCount?: number; reservationCount?: number } = {
      success: false,
    };

    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('guest_get_room_bookings', {
        p_guest_id: guest_id,
      });

      if (rpcError) {
        rpcResult = { success: false, error: rpcError.message };
      } else if (rpcData?.error) {
        rpcResult = { success: false, error: rpcData.error };
      } else {
        rpcResult = {
          success: true,
          activityCount: rpcData?.activity_bookings?.length ?? 0,
          reservationCount: rpcData?.restaurant_reservations?.length ?? 0,
        };
      }
    } catch (e: any) {
      rpcResult = { success: false, error: e.message };
    }

    const response = {
      verified_at: new Date().toISOString(),
      resort: {
        id: resort.id,
        code: resort.code,
      },
      guest: {
        id: guest.id,
        room_number: guest.room_number,
        full_name: guest.full_name,
      },
      room_guest_ids: roomGuestIds,
      totals_by_table: {
        activity_bookings: totalActivityBookings ?? 0,
        restaurant_reservations: totalRestaurantReservations ?? 0,
      },
      totals_for_guest: {
        activity_bookings: guestActivityBookings?.length ?? 0,
        restaurant_reservations: guestReservations?.length ?? 0,
        activity_by_status: activityStatusCounts,
        reservation_by_status: reservationStatusCounts,
      },
      sample_activity_bookings: (guestActivityBookings || []).slice(0, 3).map((b: any) => ({
        id: b.id,
        status: b.status,
        created_at: b.created_at,
        session_id: b.session_id,
      })),
      sample_reservations: (guestReservations || []).slice(0, 3).map((r: any) => ({
        id: r.id,
        status: r.status,
        created_at: r.created_at,
        slot_id: r.restaurant_slot_id,
      })),
      rpc_test: rpcResult,
      errors: {
        activity_query: activityError?.message || null,
        reservation_query: reservationError?.message || null,
      },
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Debug bookings error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
