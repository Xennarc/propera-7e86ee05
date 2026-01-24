/**
 * useGuestDetailContext - Unified data composition layer for Guest Detail page.
 * 
 * PURPOSE:
 * - Aggregates data from existing hooks into a single normalized object
 * - Provides safe defaults (empty arrays, nulls) to prevent crashes
 * - Enables future features without modifying existing hooks
 * 
 * IMPORTANT:
 * - This hook is ADDITIVE ONLY - does not replace existing hooks
 * - All existing hooks remain active and unchanged
 * - UI components should NOT use this hook yet (Phase 2)
 */

import { useMemo } from 'react';
import { useStaffGuestStay, StaffGuestStay, StaffAccessLink, PreArrivalSubmission } from './useStaffGuestStay';
import { useStaffPrearrivalData, PrearrivalProfile, PrearrivalSettings, PrearrivalLink, StaffReview } from './useStaffPrearrivalData';
import { toStringArray } from '@/lib/safe-array';

// ============================================================================
// TYPES - Future-ready interfaces for upcoming features
// ============================================================================

/** Travel party member (mirrors useTravelParty but for staff context) */
export interface GuestPartyMember {
  id: string;
  displayName: string;
  memberType: 'adult' | 'child';
  birthYear: number | null;
  roomNumber: string | null;
  relationshipLabel: string | null;
  isLead: boolean;
  linkedGuestId: string | null;
}

/** Structured guest preferences (future: extracted from notes/prearrival) */
export interface GuestPreference {
  id: string;
  category: 'room' | 'dining' | 'activity' | 'general';
  key: string;
  value: string;
  source: 'prearrival' | 'staff' | 'system';
  createdAt: string;
}

/** Guest service request (concierge, housekeeping, etc.) */
export interface GuestRequest {
  id: string;
  type: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  description: string;
  createdAt: string;
  resolvedAt: string | null;
}

/** Guest document (passport scan, ID, etc.) */
export interface GuestDocument {
  id: string;
  type: 'passport' | 'id' | 'visa' | 'other';
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  expiresAt: string | null;
}

/** Normalized activity booking for display */
export interface NormalizedActivityBooking {
  id: string;
  activityName: string;
  sessionDate: string;
  sessionTime: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  numAdults: number;
  numChildren: number;
  bookingSource: string | null;
  isUpcoming: boolean;
}

/** Normalized restaurant reservation for display */
export interface NormalizedRestaurantReservation {
  id: string;
  restaurantName: string;
  reservationDate: string;
  reservationTime: string;
  mealPeriod: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  numAdults: number;
  numChildren: number;
  isUpcoming: boolean;
}

/** Stay information with safe defaults */
export interface NormalizedStay {
  id: string;
  status: 'pre_arrival' | 'in_house' | 'checked_out';
  arrivalDate: string;
  departureDate: string;
  roomNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Pre-arrival data with safe array fields */
export interface NormalizedPrearrival {
  arrivalTime: string | null;
  arrivalFlightNumber: string | null;
  transferPreference: string | null;
  dietaryPreferences: string[];
  allergies: string | null;
  waterComfortLevel: string | null;
  specialOccasions: string[];
  specialRequests: string | null;
  roomPreferences: Record<string, unknown>;
  customAnswers: Record<string, unknown>;
  policyAcknowledged: boolean;
  status: 'not_started' | 'in_progress' | 'completed';
}

/** Complete guest detail context */
export interface GuestDetailContext {
  // Core identifiers
  guestId: string;
  resortId: string;
  
  // Stay information
  stay: NormalizedStay | null;
  accessLinks: StaffAccessLink[];
  submission: PreArrivalSubmission | null;
  
  // Pre-arrival normalized data
  prearrival: NormalizedPrearrival;
  prearrivalSettings: PrearrivalSettings | null;
  prearrivalLink: PrearrivalLink | null;
  staffReview: StaffReview | null;
  
  // Future features (empty/null by default)
  partyMembers: GuestPartyMember[];
  preferences: GuestPreference[];
  activeRequests: GuestRequest[];
  documents: GuestDocument[];
  
  // Loading states
  isLoading: boolean;
  isStayLoading: boolean;
  isPrearrivalLoading: boolean;
  
  // Computed flags
  hasActiveStay: boolean;
  hasPrearrivalData: boolean;
  hasKidsInParty: boolean;
  isLateArrival: boolean;
  
  // Refresh functions
  refetchStay: () => void;
  refetchPrearrival: () => void;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

interface UseGuestDetailContextOptions {
  guestId: string;
  resortId: string;
  enabled?: boolean;
}

/**
 * Unified data composition hook for Guest Detail page.
 * Aggregates existing hooks into a single normalized object with safe defaults.
 */
export function useGuestDetailContext({
  guestId,
  resortId,
  enabled = true,
}: UseGuestDetailContextOptions): GuestDetailContext {
  // Call existing hooks (unchanged behavior)
  const {
    stay,
    accessLinks,
    submission,
    isLoading: isStayLoading,
    refetch: refetchStay,
  } = useStaffGuestStay(guestId, resortId);
  
  const {
    data: prearrivalData,
    isLoading: isPrearrivalLoading,
    refetch: refetchPrearrival,
  } = useStaffPrearrivalData({
    guestId,
    resortId,
    enabled: enabled && !!guestId && !!resortId,
  });

  // Normalize pre-arrival data with safe defaults
  const normalizedPrearrival = useMemo<NormalizedPrearrival>(() => {
    const profile = prearrivalData?.profile;
    
    return {
      arrivalTime: profile?.arrival_time ?? null,
      arrivalFlightNumber: profile?.arrival_flight_number ?? null,
      transferPreference: profile?.transfer_preference ?? null,
      dietaryPreferences: toStringArray(profile?.dietary_preferences),
      allergies: profile?.allergies ?? null,
      waterComfortLevel: profile?.water_comfort_level ?? null,
      specialOccasions: toStringArray(profile?.special_occasions),
      specialRequests: profile?.special_requests ?? null,
      roomPreferences: (profile?.room_preferences as Record<string, unknown>) ?? {},
      customAnswers: (profile?.custom_answers_json as Record<string, unknown>) ?? {},
      policyAcknowledged: profile?.policy_acknowledged_at != null,
      status: prearrivalData?.status ?? 'not_started',
    };
  }, [prearrivalData]);

  // Compute derived flags
  const hasActiveStay = stay != null && (stay.status === 'pre_arrival' || stay.status === 'in_house');
  const hasPrearrivalData = prearrivalData?.hasAnyData ?? false;
  
  // Check if party has kids from available data sources
  const hasKidsInParty = useMemo(() => {
    const payload = submission?.payload;
    if (!payload) return false;

    // Priority 1: Check for explicit num_children in payload
    if (typeof payload.num_children === 'number' && payload.num_children > 0) {
      return true;
    }

    // Priority 2: Check custom_answers_json for children-related fields
    const customAnswers = payload.custom_answers_json;
    if (customAnswers) {
      const childrenKeys = ['num_children', 'children_count', 'number_of_children', 'kids'];
      for (const key of childrenKeys) {
        const value = customAnswers[key];
        if (typeof value === 'number' && value > 0) {
          return true;
        }
        if (typeof value === 'string' && parseInt(value, 10) > 0) {
          return true;
        }
      }
    }

    // Fallback: no children info available
    return false;
  }, [submission]);

  // Check for late arrival (after 20:00)
  const isLateArrival = useMemo(() => {
    const arrivalTime = normalizedPrearrival.arrivalTime;
    if (!arrivalTime) return false;
    const hour = parseInt(arrivalTime.slice(0, 2), 10);
    return !isNaN(hour) && hour >= 20;
  }, [normalizedPrearrival.arrivalTime]);

  return {
    // Core identifiers
    guestId,
    resortId,
    
    // Stay information (passthrough with safe defaults)
    stay: stay ?? null,
    accessLinks: accessLinks ?? [],
    submission: submission ?? null,
    
    // Pre-arrival normalized data
    prearrival: normalizedPrearrival,
    prearrivalSettings: prearrivalData?.settings ?? null,
    prearrivalLink: prearrivalData?.link ?? null,
    staffReview: prearrivalData?.review ?? null,
    
    // Future features (empty by default - will be populated in Phase 2)
    partyMembers: [],
    preferences: [],
    activeRequests: [],
    documents: [],
    
    // Loading states
    isLoading: isStayLoading || isPrearrivalLoading,
    isStayLoading,
    isPrearrivalLoading,
    
    // Computed flags
    hasActiveStay,
    hasPrearrivalData,
    hasKidsInParty,
    isLateArrival,
    
    // Refresh functions
    refetchStay,
    refetchPrearrival: () => refetchPrearrival(),
  };
}

// ============================================================================
// EMPTY DEFAULTS - For components that need standalone defaults
// ============================================================================

export const EMPTY_PREARRIVAL: NormalizedPrearrival = {
  arrivalTime: null,
  arrivalFlightNumber: null,
  transferPreference: null,
  dietaryPreferences: [],
  allergies: null,
  waterComfortLevel: null,
  specialOccasions: [],
  specialRequests: null,
  roomPreferences: {},
  customAnswers: {},
  policyAcknowledged: false,
  status: 'not_started',
};

export const EMPTY_CONTEXT: Omit<GuestDetailContext, 'guestId' | 'resortId' | 'refetchStay' | 'refetchPrearrival'> = {
  stay: null,
  accessLinks: [],
  submission: null,
  prearrival: EMPTY_PREARRIVAL,
  prearrivalSettings: null,
  prearrivalLink: null,
  staffReview: null,
  partyMembers: [],
  preferences: [],
  activeRequests: [],
  documents: [],
  isLoading: false,
  isStayLoading: false,
  isPrearrivalLoading: false,
  hasActiveStay: false,
  hasPrearrivalData: false,
  hasKidsInParty: false,
  isLateArrival: false,
};
