import { supabase } from '@/integrations/supabase/client';

/**
 * Booking source context types for tracking sales channels
 */
export type BookingSourceContext = 'NORMAL' | 'PRE_STAY' | 'IN_STAY_SUGGESTION';

/**
 * Create an activity booking from pre-arrival flow
 * Sets booking_source = 'PRE_STAY' after creation
 */
export async function createActivityBookingFromPreArrival(params: {
  guestId: string;
  sessionId: string;
  numAdults: number;
  numChildren: number;
  notes?: string;
}) {
  // Create booking via existing RPC
  const { data, error } = await supabase.rpc('guest_create_activity_booking', {
    p_guest_id: params.guestId,
    p_session_id: params.sessionId,
    p_num_adults: params.numAdults,
    p_num_children: params.numChildren,
    p_notes: params.notes || null,
  });

  if (error || !(data as any)?.success) {
    return { data, error };
  }

  const bookingId = (data as any).booking_id;

  // Tag with PRE_STAY source
  const { error: updateError } = await supabase
    .from('activity_bookings')
    .update({ booking_source: 'PRE_STAY' })
    .eq('id', bookingId);

  if (updateError) {
    console.error('Failed to tag booking with PRE_STAY source:', updateError);
  }

  return { data, error: null };
}

/**
 * Create a restaurant reservation from pre-arrival flow
 * Sets booking_source = 'PRE_STAY' after creation
 */
export async function createRestaurantReservationFromPreArrival(params: {
  guestId: string;
  slotId: string;
  numAdults: number;
  numChildren: number;
  specialRequests?: string;
}) {
  // Create reservation via existing RPC
  const { data, error } = await supabase.rpc('guest_create_restaurant_reservation', {
    p_guest_id: params.guestId,
    p_slot_id: params.slotId,
    p_num_adults: params.numAdults,
    p_num_children: params.numChildren,
    p_special_requests: params.specialRequests || null,
  });

  if (error || !(data as any)?.success) {
    return { data, error };
  }

  const reservationId = (data as any).reservation_id;

  // Tag with PRE_STAY source
  const { error: updateError } = await supabase
    .from('restaurant_reservations')
    .update({ booking_source: 'PRE_STAY' })
    .eq('id', reservationId);

  if (updateError) {
    console.error('Failed to tag reservation with PRE_STAY source:', updateError);
  }

  return { data, error: null };
}

/**
 * Create an activity booking from in-stay upsell suggestion
 * Sets booking_source = 'IN_STAY_SUGGESTION' after creation
 */
export async function createActivityBookingFromInStaySuggestion(params: {
  guestId: string;
  sessionId: string;
  numAdults: number;
  numChildren: number;
  notes?: string;
}) {
  // Create booking via existing RPC
  const { data, error } = await supabase.rpc('guest_create_activity_booking', {
    p_guest_id: params.guestId,
    p_session_id: params.sessionId,
    p_num_adults: params.numAdults,
    p_num_children: params.numChildren,
    p_notes: params.notes || null,
  });

  if (error || !(data as any)?.success) {
    return { data, error };
  }

  const bookingId = (data as any).booking_id;

  // Tag with IN_STAY_SUGGESTION source
  const { error: updateError } = await supabase
    .from('activity_bookings')
    .update({ booking_source: 'IN_STAY_SUGGESTION' })
    .eq('id', bookingId);

  if (updateError) {
    console.error('Failed to tag booking with IN_STAY_SUGGESTION source:', updateError);
  }

  return { data, error: null };
}

/**
 * Create a restaurant reservation from in-stay upsell suggestion
 * Sets booking_source = 'IN_STAY_SUGGESTION' after creation
 */
export async function createRestaurantReservationFromInStaySuggestion(params: {
  guestId: string;
  slotId: string;
  numAdults: number;
  numChildren: number;
  specialRequests?: string;
}) {
  // Create reservation via existing RPC
  const { data, error } = await supabase.rpc('guest_create_restaurant_reservation', {
    p_guest_id: params.guestId,
    p_slot_id: params.slotId,
    p_num_adults: params.numAdults,
    p_num_children: params.numChildren,
    p_special_requests: params.specialRequests || null,
  });

  if (error || !(data as any)?.success) {
    return { data, error };
  }

  const reservationId = (data as any).reservation_id;

  // Tag with IN_STAY_SUGGESTION source
  const { error: updateError } = await supabase
    .from('restaurant_reservations')
    .update({ booking_source: 'IN_STAY_SUGGESTION' })
    .eq('id', reservationId);

  if (updateError) {
    console.error('Failed to tag reservation with IN_STAY_SUGGESTION source:', updateError);
  }

  return { data, error: null };
}
