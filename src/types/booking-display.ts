/**
 * Unified booking display model for the Booking Hub
 * Works across all booking types: activities, dining, spa, etc.
 */

export type BookingType = 'activity' | 'restaurant' | 'spa' | 'transfer';
export type BookingStatus = 'CONFIRMED' | 'PENDING' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface BookingDisplayModel {
  // Identity
  id: string;
  type: BookingType;
  
  // Display
  title: string;
  subtitle?: string;
  category?: string;
  imageUrl?: string;
  iconKey?: string;
  
  // Timing
  date: string;
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  timezone?: string;
  
  // Status
  status: BookingStatus;
  statusMessage?: string;
  
  // Participants
  numAdults: number;
  numChildren: number;
  bookedBy?: string;
  isOwnBooking: boolean;
  roomNumber?: string;
  
  // Location
  venueName?: string;
  meetingPoint?: string;
  coordinates?: { lat: number; lng: number };
  
  // Pricing (optional)
  pricePerPerson?: number;
  totalAmount?: number;
  discountAmount?: number;
  currency?: string;
  
  // Cancellation
  canCancel: boolean;
  canEdit: boolean;
  cancelCutoffHours?: number;
  cancelCutoffTime?: Date;
  cancellationPolicy?: string;
  guestCanCancel?: boolean;
  
  // Notes
  guestNotes?: string;
  resortNotes?: string;
  specialRequests?: string;
  
  // Timestamps for timeline
  createdAt?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  
  // Activity-specific
  sessionId?: string;
  difficulty?: string;
  includes?: string[];
  highlights?: string[];
  healthAndSafetyNotes?: string;
  
  // Restaurant-specific
  slotId?: string;
  mealPeriod?: string;
  
  // Session / Slot data for edits
  maxPaxPerBooking?: number;
}

/**
 * Extended details returned by lazy-load fetch
 */
export interface BookingDetailsExtended {
  // Rich content
  fullDescription?: string;
  shortDescription?: string;
  
  // Activity specifics
  difficultyLevel?: string;
  ageMin?: number;
  ageMax?: number;
  isSwimmingRequired?: boolean;
  suitableForNonSwimmers?: boolean;
  
  // FAQs
  faq?: Array<{ question: string; answer: string }>;
  
  // Resource info (boat, van, etc.)
  resourceName?: string;
  resourceType?: string;
  
  // Staff
  leadStaffName?: string;
  
  // Policies
  cancellationPolicyText?: string;
  
  // Session/slot notes (from staff)
  sessionNotes?: string;
}

/**
 * Get status message based on booking status
 */
export function getStatusMessage(status: BookingStatus, type: BookingType): string {
  switch (status) {
    case 'CONFIRMED':
      return type === 'restaurant' 
        ? "You're all set. Please arrive on time."
        : "You're all set. Arrive 10 minutes early.";
    case 'PENDING':
      return "Awaiting confirmation from the team.";
    case 'CANCELLED':
      return "This booking was cancelled.";
    case 'COMPLETED':
      return "Hope you loved it!";
    case 'NO_SHOW':
      return "Marked as no-show.";
    default:
      return "";
  }
}

/**
 * Map raw activity booking from RPC to BookingDisplayModel
 */
export function mapActivityToDisplayModel(
  booking: any,
  guestId: string,
  timezone?: string
): BookingDisplayModel {
  const sessionDateTime = booking.date && booking.start_time 
    ? new Date(`${booking.date}T${booking.start_time}`)
    : null;
  
  const cutoffHours = booking.guest_cancel_cutoff_hours ?? booking.guest_cancel_cutoff_minutes ?? 24;
  const cutoffTime = sessionDateTime 
    ? new Date(sessionDateTime.getTime() - cutoffHours * 60 * 60 * 1000)
    : undefined;
  
  const isOwnBooking = booking.guest_id === guestId || booking.is_own_booking;
  const canCancel = isOwnBooking 
    && (booking.status === 'CONFIRMED' || booking.status === 'PENDING')
    && booking.guest_can_cancel !== false
    && cutoffTime 
    && new Date() < cutoffTime;
  
  const canEdit = isOwnBooking 
    && (booking.status === 'CONFIRMED' || booking.status === 'PENDING');

  return {
    id: booking.id,
    type: 'activity',
    title: booking.activity_name || 'Activity',
    subtitle: booking.category,
    category: booking.category,
    imageUrl: booking.image_url,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    durationMinutes: booking.duration_minutes,
    timezone,
    status: booking.status as BookingStatus,
    statusMessage: getStatusMessage(booking.status, 'activity'),
    numAdults: booking.num_adults ?? 1,
    numChildren: booking.num_children ?? 0,
    bookedBy: booking.booked_by,
    isOwnBooking,
    roomNumber: booking.room_number,
    canCancel,
    canEdit,
    cancelCutoffHours: cutoffHours,
    cancelCutoffTime: cutoffTime,
    guestCanCancel: booking.guest_can_cancel,
    guestNotes: booking.notes,
    createdAt: booking.created_at,
    sessionId: booking.session_id,
    maxPaxPerBooking: booking.max_pax_per_booking ?? 10,
  };
}

/**
 * Map raw restaurant reservation from RPC to BookingDisplayModel
 */
export function mapRestaurantToDisplayModel(
  reservation: any,
  guestId: string,
  timezone?: string
): BookingDisplayModel {
  const slotDateTime = reservation.date && reservation.start_time 
    ? new Date(`${reservation.date}T${reservation.start_time}`)
    : null;
  
  const cutoffMinutes = reservation.guest_cancel_cutoff_minutes ?? 60;
  const cutoffTime = slotDateTime 
    ? new Date(slotDateTime.getTime() - cutoffMinutes * 60 * 1000)
    : undefined;
  
  const isOwnBooking = reservation.guest_id === guestId || reservation.is_own_booking;
  const canCancel = isOwnBooking 
    && (reservation.status === 'CONFIRMED' || reservation.status === 'PENDING')
    && reservation.guest_can_cancel !== false
    && cutoffTime 
    && new Date() < cutoffTime;
  
  const canEdit = isOwnBooking 
    && (reservation.status === 'CONFIRMED' || reservation.status === 'PENDING');

  return {
    id: reservation.id,
    type: 'restaurant',
    title: reservation.restaurant_name || 'Restaurant',
    subtitle: reservation.meal_period,
    mealPeriod: reservation.meal_period,
    date: reservation.date,
    startTime: reservation.start_time,
    endTime: reservation.end_time,
    timezone,
    status: reservation.status as BookingStatus,
    statusMessage: getStatusMessage(reservation.status, 'restaurant'),
    numAdults: reservation.num_adults ?? 2,
    numChildren: reservation.num_children ?? 0,
    bookedBy: reservation.booked_by,
    isOwnBooking,
    roomNumber: reservation.room_number,
    canCancel,
    canEdit,
    cancelCutoffHours: cutoffMinutes / 60,
    cancelCutoffTime: cutoffTime,
    guestCanCancel: reservation.guest_can_cancel,
    specialRequests: reservation.special_requests,
    createdAt: reservation.created_at,
    slotId: reservation.slot_id,
    maxPaxPerBooking: reservation.max_pax_per_booking ?? 10,
  };
}
