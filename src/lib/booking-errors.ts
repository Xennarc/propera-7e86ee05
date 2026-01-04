/**
 * Centralized booking error codes and user-friendly messages
 * 
 * BOOKING FLOW INVENTORY:
 * 
 * Staff-side flows:
 * - ActivityBookingDialog: From guest detail or session detail → creates activity booking
 * - RestaurantReservationDialog: From slot detail → creates restaurant reservation
 * - GuestRequestsPage: Approves/rejects PENDING guest portal bookings
 * 
 * Guest portal flows:
 * - GuestActivityBookingPage: From activities browser → select session → book
 * - GuestRestaurantBookingPage: From restaurant browser → select slot → book
 * - GuestMyBookings: View and cancel bookings
 */

export type BookingErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'SLOT_NOT_FOUND'
  | 'GUEST_NOT_FOUND'
  | 'SESSION_FULL'
  | 'SLOT_FULL'
  | 'OUTSIDE_STAY_DATES'
  | 'OVERLAPPING_BOOKING'
  | 'CUTOFF_PAST'
  | 'GUEST_BOOKING_DISABLED'
  | 'MAX_PAX_EXCEEDED'
  | 'INVALID_PAX'
  | 'SESSION_NOT_SCHEDULED'
  | 'SLOT_NOT_OPEN'
  | 'RESORT_MISMATCH'
  | 'CANCEL_CUTOFF_PAST'
  | 'CANCEL_DISABLED'
  | 'BOOKING_NOT_CANCELLABLE'
  | 'DUPLICATE_BOOKING'
  | 'CONCURRENT_MODIFICATION'
  | 'UNKNOWN_ERROR';

interface ErrorMessage {
  staff: string;
  guest: string;
}

const ERROR_MESSAGES: Record<BookingErrorCode, ErrorMessage> = {
  SESSION_NOT_FOUND: {
    staff: 'Activity session not found.',
    guest: 'This activity is no longer available.',
  },
  SLOT_NOT_FOUND: {
    staff: 'Restaurant time slot not found.',
    guest: 'This time slot is no longer available.',
  },
  GUEST_NOT_FOUND: {
    staff: 'Guest record not found.',
    guest: 'Your guest information could not be found. Please contact reception.',
  },
  SESSION_FULL: {
    staff: 'This session is fully booked. Please choose another time or reduce the party size.',
    guest: 'This trip is full. Please choose another time or activity.',
  },
  SLOT_FULL: {
    staff: 'This time slot is fully booked. Please choose another time or reduce the party size.',
    guest: 'This time slot is fully booked. Please choose another time.',
  },
  OUTSIDE_STAY_DATES: {
    staff: 'This booking is outside the guest\'s stay dates (check-in to check-out).',
    guest: 'This booking is outside your stay dates. Please contact reception if you need assistance.',
  },
  OVERLAPPING_BOOKING: {
    staff: 'The guest already has another booking that overlaps with this time.',
    guest: 'You already have another booking during this time. Please check your schedule.',
  },
  CUTOFF_PAST: {
    staff: 'The booking cutoff time has passed.',
    guest: 'Online booking is no longer available for this time. Please contact reception to arrange it.',
  },
  GUEST_BOOKING_DISABLED: {
    staff: 'This item is not available for guest self-service booking.',
    guest: 'This option is not available for online booking. Please contact reception to arrange it.',
  },
  MAX_PAX_EXCEEDED: {
    staff: 'The requested party size exceeds the maximum allowed per booking.',
    guest: 'Your party size exceeds the maximum allowed. Please reduce the number of guests or contact reception for a larger booking.',
  },
  INVALID_PAX: {
    staff: 'Please enter a valid number of guests (at least 1 adult).',
    guest: 'Please enter a valid number of guests.',
  },
  SESSION_NOT_SCHEDULED: {
    staff: 'This session is not in SCHEDULED status and cannot accept new bookings.',
    guest: 'This activity session is no longer available for booking.',
  },
  SLOT_NOT_OPEN: {
    staff: 'This slot is not OPEN and cannot accept new reservations.',
    guest: 'This time slot is no longer available for booking.',
  },
  RESORT_MISMATCH: {
    staff: 'Resort mismatch between guest and booking target.',
    guest: 'There was an issue with your booking. Please try again or contact reception.',
  },
  CANCEL_CUTOFF_PAST: {
    staff: 'The cancellation cutoff time has passed.',
    guest: 'Online cancellation is no longer available for this booking. Please contact reception if you need to change your plans.',
  },
  CANCEL_DISABLED: {
    staff: 'Cancellation is not enabled for this booking type.',
    guest: 'Online cancellation is not available for this booking. Please contact reception.',
  },
  BOOKING_NOT_CANCELLABLE: {
    staff: 'This booking cannot be cancelled in its current status.',
    guest: 'This booking cannot be cancelled. Please contact reception for assistance.',
  },
  DUPLICATE_BOOKING: {
    staff: 'This guest already has an active booking for this session/slot.',
    guest: 'You already have a booking for this time. Check "My Bookings" to view it.',
  },
  CONCURRENT_MODIFICATION: {
    staff: 'This booking was modified by another user. Please refresh and try again.',
    guest: 'Your booking was updated elsewhere. Please refresh the page.',
  },
  UNKNOWN_ERROR: {
    staff: 'An unexpected error occurred. Please try again.',
    guest: 'Something went wrong. Please try again or contact reception.',
  },
};

export interface BookingValidationResult {
  ok: boolean;
  errorCode?: BookingErrorCode;
  details?: string;
}

export function getBookingErrorMessage(
  code: BookingErrorCode,
  context: 'staff' | 'guest' = 'staff'
): string {
  const messages = ERROR_MESSAGES[code];
  return messages ? messages[context] : ERROR_MESSAGES.UNKNOWN_ERROR[context];
}

export function createValidationError(
  code: BookingErrorCode,
  details?: string
): BookingValidationResult {
  return { ok: false, errorCode: code, details };
}

export function createValidationSuccess(): BookingValidationResult {
  return { ok: true };
}
