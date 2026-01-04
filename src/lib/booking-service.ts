/**
 * Centralized BookingService for Activities + Restaurants
 * 
 * Provides idempotent, validated booking operations with:
 * - Resort scope validation
 * - Capacity checking
 * - Audit logging
 * - Duplicate prevention
 * - Optimistic concurrency
 */

import { supabase } from '@/integrations/supabase/client';
import { logAudit, AuditAction } from './audit-utils';
import {
  validateActivityBooking,
  validateRestaurantReservation,
  validateActivityCancellation,
  validateRestaurantCancellation,
} from './booking-validation';
import { BookingErrorCode, createValidationError, createValidationSuccess, BookingValidationResult } from './booking-errors';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateActivityBookingParams {
  resortId: string;
  sessionId: string;
  guestId: string;
  roomNumber: string;
  numAdults: number;
  numChildren: number;
  notes?: string;
  source: 'STAFF_FRONT_DESK' | 'STAFF_DIVE' | 'STAFF_FNB' | 'GUEST_PORTAL';
  createdByUserId?: string;
}

export interface CreateRestaurantReservationParams {
  resortId: string;
  slotId: string;
  guestId: string;
  roomNumber: string;
  numAdults: number;
  numChildren: number;
  specialRequests?: string;
  source: 'STAFF_FRONT_DESK' | 'STAFF_DIVE' | 'STAFF_FNB' | 'GUEST_PORTAL';
  createdByUserId?: string;
}

export interface CancelActivityBookingParams {
  bookingId: string;
  guestId: string;
  cancelledByUserId?: string;
  expectedVersion?: number;
}

export interface CancelRestaurantReservationParams {
  reservationId: string;
  guestId: string;
  cancelledByUserId?: string;
  expectedVersion?: number;
}

export interface BookingResult {
  success: boolean;
  bookingId?: string;
  reservationId?: string;
  status?: string;
  requiresApproval?: boolean;
  alreadyExists?: boolean;
  error?: string;
  errorCode?: BookingErrorCode;
}

// ============================================================================
// ACTIVITY BOOKING SERVICE
// ============================================================================

/**
 * Create an activity booking with full validation and duplicate prevention.
 * Uses idempotent database function to prevent double-booking.
 */
export async function createActivityBooking(
  params: CreateActivityBookingParams
): Promise<BookingResult> {
  const {
    resortId,
    sessionId,
    guestId,
    roomNumber,
    numAdults,
    numChildren,
    notes,
    source,
    createdByUserId,
  } = params;

  // 1. Client-side validation
  const validation = await validateActivityBooking({
    resortId,
    guestId,
    sessionId,
    numAdults,
    numChildren,
    source,
  });

  if (!validation.ok) {
    return {
      success: false,
      error: validation.details || 'Validation failed',
      errorCode: validation.errorCode,
    };
  }

  // 2. Call idempotent database function
  const { data, error } = await supabase.rpc('create_activity_booking_idempotent', {
    p_resort_id: resortId,
    p_session_id: sessionId,
    p_guest_id: guestId,
    p_room_number: roomNumber,
    p_num_adults: numAdults,
    p_num_children: numChildren,
    p_notes: notes || null,
    p_source: source,
    p_created_by_user_id: createdByUserId || null,
  });

  if (error) {
    console.error('Create activity booking error:', error);
    return {
      success: false,
      error: error.message,
      errorCode: 'UNKNOWN_ERROR',
    };
  }

  const result = data as any;
  
  if (!result?.success) {
    return {
      success: false,
      error: result?.error || 'Failed to create booking',
      errorCode: 'UNKNOWN_ERROR',
    };
  }

  // 3. Log audit (fire and forget) - database triggers handle most audit logging
  // but we log here for explicit client-side tracking
  if (!result.already_exists) {
    logAudit({
      action: 'BOOKING_CREATED' as AuditAction,
      entity: 'activity_bookings',
      entityId: result.booking_id,
      after: {
        session_id: sessionId,
        guest_id: guestId,
        num_adults: numAdults,
        num_children: numChildren,
        status: result.status,
      },
      resortId,
    }).catch(console.error);
  }

  return {
    success: true,
    bookingId: result.booking_id,
    status: result.status,
    requiresApproval: result.requires_approval,
    alreadyExists: result.already_exists,
  };
}

/**
 * Cancel an activity booking with validation and optimistic concurrency.
 */
export async function cancelActivityBooking(
  params: CancelActivityBookingParams
): Promise<BookingResult> {
  const { bookingId, guestId, cancelledByUserId, expectedVersion } = params;

  // 1. Validate cancellation is allowed
  const validation = await validateActivityCancellation({
    bookingId,
    guestId,
  });

  if (!validation.ok) {
    return {
      success: false,
      error: validation.details || 'Cancellation not allowed',
      errorCode: validation.errorCode,
    };
  }

  // 2. Get booking state before cancellation for audit
  const { data: beforeState } = await supabase
    .from('activity_bookings')
    .select('*')
    .eq('id', bookingId)
    .single();

  // 3. Call safe cancel function
  const { data, error } = await supabase.rpc('cancel_activity_booking_safe', {
    p_booking_id: bookingId,
    p_cancelled_by_user_id: cancelledByUserId || null,
    p_expected_version: expectedVersion || null,
  });

  if (error) {
    console.error('Cancel activity booking error:', error);
    return {
      success: false,
      error: error.message,
      errorCode: 'UNKNOWN_ERROR',
    };
  }

  const result = data as any;

  if (!result?.success) {
    return {
      success: false,
      error: result?.error || 'Failed to cancel booking',
      errorCode: 'BOOKING_NOT_CANCELLABLE',
    };
  }

  // 4. Log audit - database triggers also log this
  logAudit({
    action: 'BOOKING_CANCELLED' as AuditAction,
    entity: 'activity_bookings',
    entityId: bookingId,
    before: beforeState,
    after: { ...beforeState, status: 'CANCELLED' },
    resortId: beforeState?.resort_id,
  }).catch(console.error);

  return {
    success: true,
    bookingId,
  };
}

// ============================================================================
// RESTAURANT RESERVATION SERVICE
// ============================================================================

/**
 * Create a restaurant reservation with full validation and duplicate prevention.
 */
export async function createRestaurantReservation(
  params: CreateRestaurantReservationParams
): Promise<BookingResult> {
  const {
    resortId,
    slotId,
    guestId,
    roomNumber,
    numAdults,
    numChildren,
    specialRequests,
    source,
    createdByUserId,
  } = params;

  // 1. Client-side validation
  const validation = await validateRestaurantReservation({
    resortId,
    guestId,
    slotId,
    numAdults,
    numChildren,
    source,
  });

  if (!validation.ok) {
    return {
      success: false,
      error: validation.details || 'Validation failed',
      errorCode: validation.errorCode,
    };
  }

  // 2. Call idempotent database function
  const { data, error } = await supabase.rpc('create_restaurant_reservation_idempotent', {
    p_resort_id: resortId,
    p_slot_id: slotId,
    p_guest_id: guestId,
    p_room_number: roomNumber,
    p_num_adults: numAdults,
    p_num_children: numChildren,
    p_special_requests: specialRequests || null,
    p_source: source,
    p_created_by_user_id: createdByUserId || null,
  });

  if (error) {
    console.error('Create restaurant reservation error:', error);
    return {
      success: false,
      error: error.message,
      errorCode: 'UNKNOWN_ERROR',
    };
  }

  const result = data as any;

  if (!result?.success) {
    return {
      success: false,
      error: result?.error || 'Failed to create reservation',
      errorCode: 'UNKNOWN_ERROR',
    };
  }

  // 3. Log audit (fire and forget)
  if (!result.already_exists) {
    logAudit({
      action: 'RESERVATION_CREATED' as AuditAction,
      entity: 'restaurant_reservations',
      entityId: result.reservation_id,
      after: {
        restaurant_slot_id: slotId,
        guest_id: guestId,
        num_adults: numAdults,
        num_children: numChildren,
        status: result.status,
      },
      resortId,
    }).catch(console.error);
  }

  return {
    success: true,
    reservationId: result.reservation_id,
    status: result.status,
    requiresApproval: result.requires_approval,
    alreadyExists: result.already_exists,
  };
}

/**
 * Cancel a restaurant reservation with validation and optimistic concurrency.
 */
export async function cancelRestaurantReservation(
  params: CancelRestaurantReservationParams
): Promise<BookingResult> {
  const { reservationId, guestId, cancelledByUserId, expectedVersion } = params;

  // 1. Validate cancellation is allowed
  const validation = await validateRestaurantCancellation({
    reservationId,
    guestId,
  });

  if (!validation.ok) {
    return {
      success: false,
      error: validation.details || 'Cancellation not allowed',
      errorCode: validation.errorCode,
    };
  }

  // 2. Get reservation state before cancellation for audit
  const { data: beforeState } = await supabase
    .from('restaurant_reservations')
    .select('*')
    .eq('id', reservationId)
    .single();

  // 3. Call safe cancel function
  const { data, error } = await supabase.rpc('cancel_restaurant_reservation_safe', {
    p_reservation_id: reservationId,
    p_cancelled_by_user_id: cancelledByUserId || null,
    p_expected_version: expectedVersion || null,
  });

  if (error) {
    console.error('Cancel restaurant reservation error:', error);
    return {
      success: false,
      error: error.message,
      errorCode: 'UNKNOWN_ERROR',
    };
  }

  const result = data as any;

  if (!result?.success) {
    return {
      success: false,
      error: result?.error || 'Failed to cancel reservation',
      errorCode: 'BOOKING_NOT_CANCELLABLE',
    };
  }

  // 4. Log audit
  logAudit({
    action: 'RESERVATION_CANCELLED' as AuditAction,
    entity: 'restaurant_reservations',
    entityId: reservationId,
    before: beforeState,
    after: { ...beforeState, status: 'CANCELLED' },
    resortId: beforeState?.resort_id,
  }).catch(console.error);

  return {
    success: true,
    reservationId,
  };
}

// ============================================================================
// HOOKS FOR SUBMIT LOCKING (prevents double-click)
// ============================================================================

const pendingSubmissions = new Set<string>();

/**
 * Wrap a booking operation with submit lock to prevent double-clicks.
 * Returns a function that will only execute if no pending submission exists.
 */
export function withSubmitLock<T extends (...args: any[]) => Promise<BookingResult>>(
  key: string,
  fn: T
): T {
  return (async (...args: Parameters<T>) => {
    if (pendingSubmissions.has(key)) {
      return {
        success: false,
        error: 'Request already in progress',
        errorCode: 'UNKNOWN_ERROR' as BookingErrorCode,
      };
    }

    pendingSubmissions.add(key);
    try {
      return await fn(...args);
    } finally {
      pendingSubmissions.delete(key);
    }
  }) as T;
}

/**
 * Check if a submission is currently pending.
 */
export function isSubmissionPending(key: string): boolean {
  return pendingSubmissions.has(key);
}
