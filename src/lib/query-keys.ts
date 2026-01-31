/**
 * Centralized query key factories for consistent cache management.
 * All keys include resortId for multi-tenant scoping.
 */

export const queryKeys = {
  // ==================== DINING ====================
  dining: {
    // Restaurant slots listing
    slots: (resortId: string, date?: string, restaurantId?: string) => 
      ['dining-slots', resortId, date, restaurantId].filter(Boolean),
    
    // Single slot availability (covers remaining)
    slotAvailability: (resortId: string, slotId: string) => 
      ['dining-slot-availability', resortId, slotId],
    
    // Guest's bookings (for My Bookings page)
    guestBookings: (resortId: string, guestId: string) => 
      ['dining-bookings', resortId, guestId],
    
    // Room bookings (for shared room visibility)
    roomBookings: (resortId: string, roomNumber: string, guestIds?: string) => 
      ['guest-room-bookings', resortId, roomNumber, guestIds].filter(Boolean),
    
    // Guest available slots (for browsing)
    guestAvailableSlots: (resortId: string, date: string) => 
      ['guest-available-slots', resortId, date],
    
    // Staff slot detail with reservations
    staffSlotDetail: (slotId: string) => 
      ['dining-slot-detail', slotId],
    
    // Restaurant list
    restaurants: (resortId: string) => 
      ['restaurants', resortId],
  },

  // ==================== ACTIVITIES ====================
  activities: {
    // Session list
    sessions: (resortId: string, date?: string, activityId?: string) => 
      ['activity-sessions', resortId, date, activityId].filter(Boolean),
    
    // Single session detail
    session: (sessionId: string) => 
      ['activity-session', sessionId],
    
    // Session bookings
    sessionBookings: (sessionId: string) => 
      ['session-bookings', sessionId],
    
    // Guest available sessions
    guestAvailableSessions: (resortId: string) => 
      ['guest-available-sessions', resortId],
    
    // Guest's activity bookings
    guestBookings: (guestId: string) => 
      ['guest-bookings', guestId],
    
    // Waitlist for a session
    waitlist: (sessionId: string) => 
      ['session-waitlist', sessionId],
  },

  // ==================== PRE-ARRIVAL ====================
  prearrival: {
    // Single guest's pre-arrival profile
    profile: (resortId: string, guestId: string) => 
      ['prearrival-profile', resortId, guestId],
    
    // Staff pre-arrival data (includes more fields)
    staffData: (guestId: string) => 
      ['staff-prearrival-data', guestId],
    
    // Guest-facing pre-arrival data
    guestData: (guestId: string) => 
      ['prearrival-data', guestId],
    
    // Pre-arrival statuses for guest list
    statuses: (resortId: string) => 
      ['prearrival-statuses', resortId],
    
    // Pre-arrival history/events
    history: (guestId: string) => 
      ['prearrival-history', guestId],
    
    // Pre-arrival settings
    settings: (resortId: string) => 
      ['prearrival-settings', resortId],
  },

  // ==================== GUEST REQUESTS ====================
  requests: {
    // Guest's own requests
    guest: (resortId: string, guestId: string) => 
      ['guest-requests', resortId, guestId],
    
    // Staff request queue
    staff: (resortId: string, statusFilter?: string, sourceFilter?: string) => 
      ['staff-requests', resortId, statusFilter, sourceFilter].filter(Boolean),
    
    // Pending activity approvals
    pendingActivities: (resortId: string) => 
      ['pending-activity-requests', resortId],
    
    // Pending restaurant approvals
    pendingRestaurants: (resortId: string) => 
      ['pending-restaurant-requests', resortId],
  },

  // ==================== GUESTS ====================
  guests: {
    // Guest list for staff
    list: (resortId: string) => 
      ['guests', resortId],
    
    // Single guest detail
    detail: (resortId: string, guestId: string) => 
      ['guest', resortId, guestId],
    
    // Room guests
    roomGuests: (resortId: string, roomNumber: string) => 
      ['room-guests', resortId, roomNumber],
    
    // Guest auth lookup (for login validation)
    authLookup: (resortId: string, roomNumber: string, lastName: string) =>
      ['guest-auth', resortId, roomNumber, lastName],
    
    // Arrivals list
    arrivals: (resortId: string, date?: string) =>
      ['guest-arrivals', resortId, date].filter(Boolean),
    
    // In-house guests
    inHouse: (resortId: string) =>
      ['guests-in-house', resortId],
  },

  // ==================== NOTIFICATIONS ====================
  notifications: {
    guest: (guestId: string) => 
      ['guest-notifications', guestId],
    
    staff: (userId: string) => 
      ['staff-notifications', userId],
  },

  // ==================== TRAVEL PARTY ====================
  travelParty: {
    // Staff-facing travel party for a guest
    staffParty: (resortId: string, guestId: string) => 
      ['staff-travel-party', resortId, guestId],
  },

  // ==================== PREFERENCES ====================
  preferences: {
    // Staff-facing guest preferences
    staffPreferences: (resortId: string, guestId: string) => 
      ['staff-guest-preferences', resortId, guestId],
  },

  // ==================== TRANSPORT ====================
  transport: {
    // Request queue for staff
    queue: (resortId: string) => 
      ['transport-queue', resortId],
    
    // Active trips
    trips: (resortId: string) => 
      ['transport-trips', resortId],
    
    // Trip stops
    tripStops: (tripId: string) => 
      ['trip-stops', tripId],
    
    // Trip requests (membership)
    tripRequests: (tripId: string) => 
      ['trip-requests', tripId],
    
    // Buggies fleet
    buggies: (resortId: string) => 
      ['buggies', resortId],
    
    // Drivers
    drivers: (resortId: string) => 
      ['buggy-drivers', resortId],
    
    // Stops
    stops: (resortId: string) => 
      ['buggy-stops', resortId],
    
    // Routes
    routes: (resortId: string) => 
      ['buggy-routes', resortId],
    
    // Guest's buggy requests
    guestRequests: (guestId: string) => 
      ['guest-buggy-requests', guestId],
  },

  // ==================== SUPERADMIN PRICING ====================
  pricing: {
    // Plan pricing list
    plans: () => ['superadmin', 'plan-pricing'],
    
    // Addon pricing list
    addons: () => ['superadmin', 'addon-pricing'],
    
    // Addon feature category mappings
    addonCategories: () => ['superadmin', 'addon-feature-categories'],
    
    // Feature flags grouped by category (for entitlements UI)
    featureFlagsByCategory: () => ['superadmin', 'feature-flags-by-category'],
    
    // Category to addon mappings with pricing info
    categoryAddonMappings: () => ['superadmin', 'category-addon-mappings'],
    
    // Addons with their category mappings (for selection UI)
    addonsWithCategories: () => ['superadmin', 'addons-with-categories'],
    
    // Pricing change log
    changeLog: () => ['superadmin', 'pricing-change-log'],
    
    // Tier statistics
    tierStats: () => ['superadmin', 'tier-stats'],
    
    // Public pricing (for invalidation)
    public: () => ['pricing'],
  },

  // ==================== RESORT ADDONS ====================
  resorts: {
    // Resort add-ons
    addons: (resortId: string) => ['resort', resortId, 'addons'],
    
    // Resort entitled categories
    entitledCategories: (resortId: string) => ['resort', resortId, 'entitled-categories'],
  },

  // ==================== SUBSCRIPTION ALERTS ====================
  subscriptionAlerts: {
    // Alert list with optional filters
    list: (filters?: Record<string, unknown>) => 
      ['superadmin', 'subscription-alerts', filters].filter(Boolean),
    
    // Alert stats summary
    stats: () => ['superadmin', 'subscription-alerts', 'stats'],
  },
};

/**
 * Helper to create a stable query key array
 */
export function createQueryKey(...parts: (string | undefined | null)[]): string[] {
  return parts.filter((p): p is string => Boolean(p));
}
