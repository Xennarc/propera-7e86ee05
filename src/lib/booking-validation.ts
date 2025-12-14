/**
 * Centralized booking validation logic
 * 
 * These utilities enforce all business rules for activity bookings and restaurant reservations.
 * Both staff and guest flows should call these validators before creating/modifying bookings.
 */

import { supabase } from '@/integrations/supabase/client';
import { toZonedTime } from 'date-fns-tz';
import {
  BookingValidationResult,
  createValidationError,
  createValidationSuccess,
} from './booking-errors';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidateActivityBookingParams {
  resortId: string;
  guestId: string;
  sessionId: string;
  numAdults: number;
  numChildren: number;
  source: 'STAFF_FRONT_DESK' | 'STAFF_DIVE' | 'STAFF_FNB' | 'GUEST_PORTAL';
}

export interface ValidateRestaurantReservationParams {
  resortId: string;
  guestId: string;
  slotId: string;
  numAdults: number;
  numChildren: number;
  source: 'STAFF_FRONT_DESK' | 'STAFF_DIVE' | 'STAFF_FNB' | 'GUEST_PORTAL';
}

export interface ValidateCancellationParams {
  bookingId: string;
  guestId: string;
  type: 'activity' | 'restaurant';
}

// ============================================================================
// ACTIVITY BOOKING VALIDATION
// ============================================================================

export async function validateActivityBooking(
  params: ValidateActivityBookingParams
): Promise<BookingValidationResult> {
  const { resortId, guestId, sessionId, numAdults, numChildren, source } = params;
  const totalPax = numAdults + numChildren;
  const isGuestPortal = source === 'GUEST_PORTAL';

  // 1. Basic pax validation
  if (numAdults < 1 || numChildren < 0 || totalPax < 1) {
    return createValidationError('INVALID_PAX');
  }

  // 2. Fetch session with activity and resort details
  const { data: session, error: sessionError } = await supabase
    .from('activity_sessions')
    .select(`
      id, resort_id, date, start_time, end_time, capacity, status,
      activity:activities(
        id, name, guest_can_book, guest_cutoff_hours, max_pax_per_booking, requires_approval
      ),
      resort:resorts(timezone)
    `)
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionError || !session) {
    return createValidationError('SESSION_NOT_FOUND');
  }

  // 3. Resort match
  if (session.resort_id !== resortId) {
    return createValidationError('RESORT_MISMATCH');
  }

  // 4. Session must be SCHEDULED
  if (session.status !== 'SCHEDULED') {
    return createValidationError('SESSION_NOT_SCHEDULED');
  }

  const activity = session.activity as any;
  const resortTimezone = (session.resort as any)?.timezone || 'UTC';
  // 5. Max pax per booking
  if (activity?.max_pax_per_booking && totalPax > activity.max_pax_per_booking) {
    return createValidationError('MAX_PAX_EXCEEDED', `Maximum ${activity.max_pax_per_booking} guests per booking`);
  }

  // 6. Guest portal specific checks
  if (isGuestPortal) {
    // Check if guest can book this activity
    if (!activity?.guest_can_book) {
      return createValidationError('GUEST_BOOKING_DISABLED');
    }

    // Check cutoff time using resort timezone
    const sessionDateTime = new Date(`${session.date}T${session.start_time}`);
    const cutoffHours = activity?.guest_cutoff_hours || 0;
    const cutoffTime = new Date(sessionDateTime.getTime() - cutoffHours * 60 * 60 * 1000);
    
    // Get current time in resort timezone
    const nowInResort = toZonedTime(new Date(), resortTimezone);
    
    if (nowInResort > cutoffTime) {
      return createValidationError('CUTOFF_PAST');
    }
  }

  // 7. Fetch guest details
  const { data: guest, error: guestError } = await supabase
    .from('guests')
    .select('id, resort_id, check_in_date, check_out_date')
    .eq('id', guestId)
    .maybeSingle();

  if (guestError || !guest) {
    return createValidationError('GUEST_NOT_FOUND');
  }

  // 8. Guest resort match
  if (guest.resort_id !== resortId) {
    return createValidationError('RESORT_MISMATCH');
  }

  // 9. Stay dates check (only if guest has dates defined)
  if (guest.check_in_date && guest.check_out_date) {
    const sessionDate = session.date;
    if (sessionDate < guest.check_in_date || sessionDate > guest.check_out_date) {
      return createValidationError('OUTSIDE_STAY_DATES');
    }
  }

  // 10. Capacity check - sum CONFIRMED + COMPLETED bookings
  const { data: existingBookings, error: bookingsError } = await supabase
    .from('activity_bookings')
    .select('num_adults, num_children')
    .eq('session_id', sessionId)
    .in('status', ['CONFIRMED', 'COMPLETED']);

  if (bookingsError) {
    return createValidationError('UNKNOWN_ERROR', bookingsError.message);
  }

  const bookedPax = existingBookings?.reduce((sum, b) => sum + b.num_adults + b.num_children, 0) || 0;
  const remainingCapacity = session.capacity - bookedPax;

  if (totalPax > remainingCapacity) {
    return createValidationError('SESSION_FULL', `Only ${remainingCapacity} spots available`);
  }

  // 11. Overlap check - guest cannot have overlapping CONFIRMED bookings
  const { data: guestBookings, error: overlapError } = await supabase
    .from('activity_bookings')
    .select(`
      id,
      session:activity_sessions(date, start_time, end_time)
    `)
    .eq('guest_id', guestId)
    .in('status', ['CONFIRMED', 'PENDING']);

  if (!overlapError && guestBookings) {
    const hasOverlap = guestBookings.some((booking) => {
      const bookingSession = booking.session as any;
      if (!bookingSession || bookingSession.date !== session.date) return false;

      // Time overlap check
      const newStart = session.start_time;
      const newEnd = session.end_time;
      const existingStart = bookingSession.start_time;
      const existingEnd = bookingSession.end_time;

      return newStart < existingEnd && newEnd > existingStart;
    });

    if (hasOverlap) {
      return createValidationError('OVERLAPPING_BOOKING');
    }
  }

  return createValidationSuccess();
}

// ============================================================================
// RESTAURANT RESERVATION VALIDATION
// ============================================================================

export async function validateRestaurantReservation(
  params: ValidateRestaurantReservationParams
): Promise<BookingValidationResult> {
  const { resortId, guestId, slotId, numAdults, numChildren, source } = params;
  const totalPax = numAdults + numChildren;
  const isGuestPortal = source === 'GUEST_PORTAL';

  // 1. Basic pax validation
  if (numAdults < 1 || numChildren < 0 || totalPax < 1) {
    return createValidationError('INVALID_PAX');
  }

  // 2. Fetch slot with restaurant and resort details
  const { data: slot, error: slotError } = await supabase
    .from('restaurant_time_slots')
    .select(`
      id, resort_id, date, start_time, end_time, capacity, status,
      restaurant:restaurants(
        id, name, guest_can_book, guest_cutoff_minutes, max_pax_per_booking, requires_approval
      ),
      resort:resorts(timezone)
    `)
    .eq('id', slotId)
    .maybeSingle();

  if (slotError || !slot) {
    return createValidationError('SLOT_NOT_FOUND');
  }

  // 3. Resort match
  if (slot.resort_id !== resortId) {
    return createValidationError('RESORT_MISMATCH');
  }

  // 4. Slot must be OPEN
  if (slot.status !== 'OPEN') {
    return createValidationError('SLOT_NOT_OPEN');
  }

  const restaurant = slot.restaurant as any;
  const resortTimezone = (slot.resort as any)?.timezone || 'UTC';
  // 5. Max pax per booking
  if (restaurant?.max_pax_per_booking && totalPax > restaurant.max_pax_per_booking) {
    return createValidationError('MAX_PAX_EXCEEDED', `Maximum ${restaurant.max_pax_per_booking} guests per booking`);
  }

  // 6. Guest portal specific checks
  if (isGuestPortal) {
    // Check if guest can book this restaurant
    if (!restaurant?.guest_can_book) {
      return createValidationError('GUEST_BOOKING_DISABLED');
    }

    // Check cutoff time using resort timezone
    const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
    const cutoffMinutes = restaurant?.guest_cutoff_minutes || 0;
    const cutoffTime = new Date(slotDateTime.getTime() - cutoffMinutes * 60 * 1000);
    
    // Get current time in resort timezone
    const nowInResort = toZonedTime(new Date(), resortTimezone);
    
    if (nowInResort > cutoffTime) {
      return createValidationError('CUTOFF_PAST');
    }
  }

  // 7. Fetch guest details
  const { data: guest, error: guestError } = await supabase
    .from('guests')
    .select('id, resort_id, check_in_date, check_out_date')
    .eq('id', guestId)
    .maybeSingle();

  if (guestError || !guest) {
    return createValidationError('GUEST_NOT_FOUND');
  }

  // 8. Guest resort match
  if (guest.resort_id !== resortId) {
    return createValidationError('RESORT_MISMATCH');
  }

  // 9. Stay dates check (only if guest has dates defined)
  if (guest.check_in_date && guest.check_out_date) {
    const slotDate = slot.date;
    if (slotDate < guest.check_in_date || slotDate > guest.check_out_date) {
      return createValidationError('OUTSIDE_STAY_DATES');
    }
  }

  // 10. Capacity check - sum CONFIRMED + COMPLETED reservations
  const { data: existingReservations, error: reservationsError } = await supabase
    .from('restaurant_reservations')
    .select('num_adults, num_children')
    .eq('restaurant_slot_id', slotId)
    .in('status', ['CONFIRMED', 'COMPLETED']);

  if (reservationsError) {
    return createValidationError('UNKNOWN_ERROR', reservationsError.message);
  }

  const bookedCovers = existingReservations?.reduce((sum, r) => sum + r.num_adults + r.num_children, 0) || 0;
  const remainingCapacity = slot.capacity - bookedCovers;

  if (totalPax > remainingCapacity) {
    return createValidationError('SLOT_FULL', `Only ${remainingCapacity} covers available`);
  }

  return createValidationSuccess();
}

// ============================================================================
// CANCELLATION VALIDATION
// ============================================================================

export async function validateActivityCancellation(
  params: { bookingId: string; guestId: string }
): Promise<BookingValidationResult> {
  const { bookingId, guestId } = params;

  // Fetch booking with session and activity details
  const { data: booking, error } = await supabase
    .from('activity_bookings')
    .select(`
      id, guest_id, status,
      session:activity_sessions(
        date, start_time,
        activity:activities(guest_can_cancel, guest_cancel_cutoff_hours)
      )
    `)
    .eq('id', bookingId)
    .eq('guest_id', guestId)
    .maybeSingle();

  if (error || !booking) {
    return createValidationError('SESSION_NOT_FOUND');
  }

  // Check status is cancellable
  if (booking.status !== 'CONFIRMED' && booking.status !== 'PENDING') {
    return createValidationError('BOOKING_NOT_CANCELLABLE');
  }

  const session = booking.session as any;
  const activity = session?.activity;

  // Check if cancellation is enabled
  if (!activity?.guest_can_cancel) {
    return createValidationError('CANCEL_DISABLED');
  }

  // Check cutoff time
  const sessionDateTime = new Date(`${session.date}T${session.start_time}`);
  const cutoffHours = activity.guest_cancel_cutoff_hours || 0;
  const cutoffTime = new Date(sessionDateTime.getTime() - cutoffHours * 60 * 60 * 1000);

  if (new Date() > cutoffTime) {
    return createValidationError('CANCEL_CUTOFF_PAST');
  }

  return createValidationSuccess();
}

export async function validateRestaurantCancellation(
  params: { reservationId: string; guestId: string }
): Promise<BookingValidationResult> {
  const { reservationId, guestId } = params;

  // Fetch reservation with slot and restaurant details
  const { data: reservation, error } = await supabase
    .from('restaurant_reservations')
    .select(`
      id, guest_id, status,
      slot:restaurant_time_slots(
        date, start_time,
        restaurant:restaurants(guest_can_cancel, guest_cancel_cutoff_minutes)
      )
    `)
    .eq('id', reservationId)
    .eq('guest_id', guestId)
    .maybeSingle();

  if (error || !reservation) {
    return createValidationError('SLOT_NOT_FOUND');
  }

  // Check status is cancellable
  if (reservation.status !== 'CONFIRMED' && reservation.status !== 'PENDING') {
    return createValidationError('BOOKING_NOT_CANCELLABLE');
  }

  const slot = reservation.slot as any;
  const restaurant = slot?.restaurant;

  // Check if cancellation is enabled
  if (!restaurant?.guest_can_cancel) {
    return createValidationError('CANCEL_DISABLED');
  }

  // Check cutoff time
  const slotDateTime = new Date(`${slot.date}T${slot.start_time}`);
  const cutoffMinutes = restaurant.guest_cancel_cutoff_minutes || 0;
  const cutoffTime = new Date(slotDateTime.getTime() - cutoffMinutes * 60 * 1000);

  if (new Date() > cutoffTime) {
    return createValidationError('CANCEL_CUTOFF_PAST');
  }

  return createValidationSuccess();
}

// ============================================================================
// CAPACITY HELPERS
// ============================================================================

export async function getSessionRemainingCapacity(sessionId: string): Promise<number> {
  const { data: session } = await supabase
    .from('activity_sessions')
    .select('capacity')
    .eq('id', sessionId)
    .single();

  const { data: bookings } = await supabase
    .from('activity_bookings')
    .select('num_adults, num_children')
    .eq('session_id', sessionId)
    .in('status', ['CONFIRMED', 'COMPLETED']);

  const bookedPax = bookings?.reduce((sum, b) => sum + b.num_adults + b.num_children, 0) || 0;
  return (session?.capacity || 0) - bookedPax;
}

export async function getSlotRemainingCapacity(slotId: string): Promise<number> {
  const { data: slot } = await supabase
    .from('restaurant_time_slots')
    .select('capacity')
    .eq('id', slotId)
    .single();

  const { data: reservations } = await supabase
    .from('restaurant_reservations')
    .select('num_adults, num_children')
    .eq('restaurant_slot_id', slotId)
    .in('status', ['CONFIRMED', 'COMPLETED']);

  const bookedCovers = reservations?.reduce((sum, r) => sum + r.num_adults + r.num_children, 0) || 0;
  return (slot?.capacity || 0) - bookedCovers;
}
