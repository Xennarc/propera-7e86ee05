

# Booking Hub: Premium Guest Portal My Bookings Upgrade

## Overview

Transform the existing `GuestMyBookings.tsx` page into a premium "Booking Hub" experience with rich details on tap, clear status messaging, and a unified UI for all booking types. This upgrade maintains full backward compatibility with existing data, APIs, and cancellation flows.

---

## Current State Analysis

### Existing Components
| Component | Purpose | Status |
|-----------|---------|--------|
| `GuestMyBookings.tsx` | Main page with list + filters | Working, ~960 lines |
| `GuestBookingCard.tsx` | Card component | Working, ~230 lines |
| `EditBookingDialog.tsx` | Edit guest count | Working |
| `KeyboardSafeDrawer.tsx` | Mobile-safe bottom sheet | Working |
| `GuestEmptyState.tsx` | Empty state component | Reusable |
| `GuestSectionHeader.tsx` | Section headers | Reusable |

### Data Available from RPC
The `guest_get_room_bookings` RPC returns:

**Activity Bookings:**
- `id`, `guest_id`, `session_id`, `status`, `num_adults`, `num_children`, `notes`, `created_at`
- Session: `id`, `date`, `start_time`, `end_time`
- Activity: `id`, `name`, `description`, `category`, `guest_can_cancel`, `guest_cancel_cutoff_hours`

**Restaurant Reservations:**
- `id`, `guest_id`, `restaurant_slot_id`, `status`, `num_adults`, `num_children`, `special_requests`, `created_at`
- Slot: `id`, `date`, `start_time`, `end_time`, `meal_period`
- Restaurant: `id`, `name`, `guest_can_cancel`, `guest_cancel_cutoff_minutes`

### Schema Fields NOT in Current RPC (Available for Lazy-Load)
From `activities` table (rich content):
- `short_description`, `full_description`, `difficulty_level`
- `age_min`, `max_age`, `is_swimming_required`, `suitable_for_non_swimmers`
- `highlights` (JSONB), `includes`, `health_and_safety_notes`
- `cancellation_policy_text`, `faq` (JSONB), `image_url`, `icon_key`
- `default_price_per_person`, `duration_minutes`

From `activity_sessions` table:
- `resource_id` (linked boat/van), `lead_staff_id`, `notes`

From `activity_bookings` table:
- `price_per_person`, `discount_amount`, `total_amount`, `source`

---

## Architecture Design

### 1. Unified Booking Display Model

Create a type-safe normalized model that works for all booking types:

```text
src/types/booking-display.ts

BookingDisplayModel {
  // Identity
  id: string
  type: 'activity' | 'restaurant' | 'spa' | 'transfer'
  
  // Display
  title: string
  subtitle?: string
  category?: string
  imageUrl?: string
  iconKey?: string
  
  // Timing
  date: string
  startTime: string
  endTime?: string
  durationMinutes?: number
  timezone: string
  
  // Status
  status: BookingStatus
  statusMessage: string  // "You're all set. Arrive 10 minutes early."
  
  // Participants
  numAdults: number
  numChildren: number
  bookedBy?: string
  isOwnBooking: boolean
  
  // Location
  venueName?: string
  meetingPoint?: string
  coordinates?: { lat: number; lng: number }
  
  // Pricing (optional)
  pricePerPerson?: number
  totalAmount?: number
  currency?: string
  
  // Cancellation
  canCancel: boolean
  cancelCutoffTime?: Date
  cancellationPolicy?: string
  
  // Notes
  guestNotes?: string
  resortNotes?: string
  
  // Timestamps for timeline
  createdAt: string
  confirmedAt?: string
  cancelledAt?: string
  completedAt?: string
}
```

### 2. Component Architecture

```text
src/pages/guest/GuestMyBookings.tsx
  |-- Updated to use URL state for open booking
  |-- Renders tabs: Upcoming / Past / Cancelled
  |-- Renders BookingCard list
  |-- Opens BookingDetailsSheet when booking selected

src/components/guest/booking-details/
  |-- BookingDetailsSheet.tsx (main container)
  |-- BookingDetailsHero.tsx (header with status)
  |-- BookingDetailsQuickActions.tsx (calendar, directions, contact, cancel)
  |-- BookingDetailsInfo.tsx (key details grid)
  |-- BookingDetailsLocation.tsx (venue + map link)
  |-- BookingDetailsItems.tsx (accordion for includes/add-ons)
  |-- BookingDetailsPolicies.tsx (cancellation, no-show)
  |-- BookingDetailsPricing.tsx (price breakdown if available)
  |-- BookingDetailsTimeline.tsx (status stepper)
  |-- BookingDetailsContact.tsx (support actions)

src/lib/calendar-utils.ts
  |-- generateICSEvent() - creates downloadable .ics file
  |-- getGoogleCalendarUrl() - returns Google Calendar link
  |-- getOutlookCalendarUrl() - returns Outlook link

src/hooks/useBookingDetails.ts
  |-- Lazy-loads full details when sheet opens
  |-- Calls new RPC: guest_get_booking_details(booking_id, booking_type)
```

---

## Implementation Phases

### Phase 1: List UI Upgrade (No Data Changes)

**Files Modified:**
- `src/pages/guest/GuestMyBookings.tsx`

**Changes:**
1. Replace filter tabs with segmented tabs: `Upcoming | Past | Cancelled`
2. Upgrade `BookingCard` internal component with enhanced styling:
   - Add chevron indicator (clickable affordance)
   - Improve status bar visual hierarchy
   - Add "Pending approval" vs "Confirmed" micro-copy
3. Add premium empty state micro-copy:
   - "No upcoming bookings - time to treat yourself"
4. Add sorting logic:
   - Upcoming: soonest first (already implemented)
   - Past: most recent first (already implemented)

**Tabs Structure:**
```typescript
const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
```

---

### Phase 2: Booking Details Sheet UI

**Files Created:**
- `src/components/guest/booking-details/BookingDetailsSheet.tsx`
- `src/components/guest/booking-details/index.ts` (barrel export)
- `src/types/booking-display.ts`

**BookingDetailsSheet Features:**

1. **Hero Header**
   - Large status badge with icon
   - Booking title + type icon
   - Date/time prominently displayed
   - "What's next" contextual message based on status

2. **Quick Actions Row**
   - "Add to Calendar" button (ICS download)
   - "Get Directions" (if coordinates exist)
   - "Cancel" (if allowed per policy)
   - Actions use icon buttons with labels below

3. **Key Details Section**
   - Two-column grid on desktop, stacked on mobile
   - Booking reference, room number, guests, duration
   - Graceful fallbacks for missing fields

4. **Skeleton Loading**
   - Sheet opens immediately with skeleton
   - Details populated after lazy fetch

**Sheet Props:**
```typescript
interface BookingDetailsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingDisplayModel | null;
  onCancel?: () => void;
  onEdit?: () => void;
}
```

---

### Phase 3: Lazy Details Fetch

**Files Created:**
- `src/hooks/useBookingDetails.ts`

**Files Modified (DB Migration):**
- Create new RPC: `guest_get_booking_details(p_guest_id, p_booking_id, p_booking_type)`

**RPC Returns (additive - no schema changes):**
```sql
-- For activities, joins:
-- activity_bookings -> activity_sessions -> activities
-- Optionally: resources (for boat/van name), profiles (for lead staff name)

-- Returns extended fields not in list query:
-- activity.full_description, activity.includes, activity.highlights
-- activity.health_and_safety_notes, activity.cancellation_policy_text
-- activity.image_url, activity.difficulty_level
-- session.notes (staff notes), session.resource.name
-- booking.price_per_person, booking.total_amount, booking.created_at
```

**Hook Interface:**
```typescript
function useBookingDetails(
  bookingId: string | null,
  bookingType: 'activity' | 'restaurant' | null
) {
  // Returns { data, isLoading, error }
  // Only fetches when bookingId is provided
}
```

---

### Phase 4: Calendar Integration

**Files Created:**
- `src/lib/calendar-utils.ts`

**Implementation (frontend-only, no dependencies):**

```typescript
interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
}

// Generate ICS file content
function generateICSContent(event: CalendarEvent): string {
  // VCALENDAR format with VEVENT
}

// Download ICS file
function downloadICSFile(event: CalendarEvent): void {
  const content = generateICSContent(event);
  const blob = new Blob([content], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  // Create download link and click
}

// Generate Google Calendar URL
function getGoogleCalendarUrl(event: CalendarEvent): string {
  // https://calendar.google.com/calendar/render?action=TEMPLATE&...
}
```

---

### Phase 5: URL Deep-Linking

**Files Modified:**
- `src/pages/guest/GuestMyBookings.tsx`

**URL State Pattern:**
```typescript
// Read booking ID from URL
const [searchParams, setSearchParams] = useSearchParams();
const openBookingId = searchParams.get('open');
const openBookingType = searchParams.get('type');

// Find booking and open sheet
useEffect(() => {
  if (openBookingId && openBookingType && bookings) {
    const booking = findBooking(openBookingId, openBookingType);
    if (booking) setSelectedBooking(booking);
  }
}, [openBookingId, openBookingType, bookings]);

// Update URL when sheet opens/closes
const handleOpenBooking = (booking: BookingDisplayModel) => {
  setSearchParams({ open: booking.id, type: booking.type });
  setSelectedBooking(booking);
};

const handleCloseSheet = () => {
  setSearchParams({});
  setSelectedBooking(null);
};
```

---

### Phase 6: Timeline, Policies, Contact (Conditional)

**Components Added:**
- `BookingDetailsTimeline.tsx`
- `BookingDetailsPolicies.tsx`
- `BookingDetailsContact.tsx`

**Timeline Logic:**
```typescript
// Derive timeline from available timestamps
const timelineSteps = [
  { label: 'Booked', timestamp: booking.createdAt, status: 'complete' },
  { label: 'Confirmed', timestamp: booking.confirmedAt, status: booking.status === 'CONFIRMED' ? 'complete' : 'pending' },
  { label: 'Completed', timestamp: booking.completedAt, status: booking.status === 'COMPLETED' ? 'complete' : 'upcoming' },
];
// Only show if we have at least createdAt
```

**Policies Rendering:**
```typescript
// Use activity.cancellation_policy_text if available
// Otherwise show generic: "Free cancellation until X hours before"
// If no policy data exists, hide section entirely
```

**Contact Actions:**
```typescript
// Only show if resort has contact info configured
// Check resort.contact_phone, resort.contact_whatsapp
// Fallback: hide entire section
```

---

## File Changes Summary

### New Files (Create)
| File | Purpose |
|------|---------|
| `src/types/booking-display.ts` | Unified booking display model |
| `src/components/guest/booking-details/BookingDetailsSheet.tsx` | Main details sheet |
| `src/components/guest/booking-details/BookingDetailsHero.tsx` | Header with status |
| `src/components/guest/booking-details/BookingDetailsQuickActions.tsx` | Action buttons |
| `src/components/guest/booking-details/BookingDetailsInfo.tsx` | Key details grid |
| `src/components/guest/booking-details/BookingDetailsPolicies.tsx` | Cancellation policy |
| `src/components/guest/booking-details/BookingDetailsTimeline.tsx` | Status stepper |
| `src/components/guest/booking-details/index.ts` | Barrel export |
| `src/lib/calendar-utils.ts` | ICS generation |
| `src/hooks/useBookingDetails.ts` | Lazy fetch hook |

### Modified Files
| File | Changes |
|------|---------|
| `src/pages/guest/GuestMyBookings.tsx` | Add tabs, URL state, sheet integration |
| `supabase/migrations/xxx.sql` | Add `guest_get_booking_details` RPC |

### Unchanged (No Modifications)
| File | Reason |
|------|--------|
| `src/components/guest/GuestBookingCard.tsx` | May enhance later but not required |
| `guest_get_room_bookings` RPC | Keep list query lean |
| `EditBookingDialog.tsx` | Already working |
| Existing RLS policies | No changes needed |

---

## Security Considerations

1. **RLS Enforcement:**
   - New `guest_get_booking_details` RPC is `SECURITY DEFINER`
   - Validates `p_guest_id` owns the booking before returning data
   - Scopes all queries by `resort_id`

2. **No Cross-Guest Visibility:**
   - Details fetch validates ownership
   - URL deep-link only works for logged-in guest's own bookings

3. **Defensive Rendering:**
   - All UI fields use optional chaining (`?.`)
   - Missing fields render graceful fallbacks or are hidden
   - No errors for incomplete data

---

## Acceptance Criteria

| Test | Expected Result |
|------|-----------------|
| Demo guest sees upcoming bookings | List shows seeded activity + restaurant bookings |
| Tap booking opens details sheet | Sheet slides up with skeleton, then content |
| Sheet shows correct status badge | CONFIRMED = green, PENDING = amber, etc. |
| "Add to Calendar" downloads .ics | File downloads with correct event details |
| Missing fields gracefully hidden | No broken layouts for incomplete data |
| Cancel button respects policy | Only shows when within cancellation window |
| URL deep-link works | `/guest/bookings?open=<id>&type=activity` opens sheet |
| Mobile keyboard doesn't cover CTA | Sheet footer stays above keyboard |
| Past bookings are read-only | No edit/cancel buttons on completed bookings |

---

## Technical Considerations

### Performance
- List query unchanged (fast initial load)
- Details fetched lazily only when sheet opens
- Sheet uses skeleton loading (no layout shift)
- `staleTime: 5 * 60 * 1000` for details cache

### Backward Compatibility
- Existing booking data works without changes
- Missing optional fields render gracefully
- No schema migrations that break existing rows
- Demo seeding continues to work

### Mobile UX
- Uses existing `KeyboardSafeDrawer` pattern
- Sheet height: `90vh` with scrollable body
- Action buttons use `tap-target` (48px min)
- Footer CTA stays above keyboard

---

## Implementation Order

1. **Phase 1:** List UI tabs upgrade (no new files)
2. **Phase 2:** Create `BookingDetailsSheet` with static content
3. **Phase 3:** Add `useBookingDetails` hook + RPC
4. **Phase 4:** Add calendar utils + download
5. **Phase 5:** URL deep-linking with `useSearchParams`
6. **Phase 6:** Conditional timeline/policies/contact sections
7. **Polish:** Animations, empty states, accessibility

---

## Estimated Scope

| Phase | New Lines | Modified Lines |
|-------|-----------|----------------|
| Phase 1 | 0 | ~100 |
| Phase 2 | ~400 | ~50 |
| Phase 3 | ~150 | ~30 (RPC) |
| Phase 4 | ~100 | 0 |
| Phase 5 | 0 | ~50 |
| Phase 6 | ~200 | 0 |
| **Total** | ~850 | ~230 |

