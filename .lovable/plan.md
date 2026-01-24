
# Enable Pre-Arrival Activity Bookings

## Overview

This plan enables pre-arrival guests to book activities through the Guest Portal, ensuring their bookings appear immediately in "My Bookings" and are visible to staff for management. The implementation maintains backwards compatibility and preserves all existing booking rules.

---

## Current State Analysis

| Component | Current Behavior |
|-----------|-----------------|
| `guest_create_activity_booking` RPC | Blocks booking if `CURRENT_DATE < check_in_date` (line 179-182) |
| `activity_bookings` table | Has `booking_source` enum (`PRE_STAY`, `NORMAL`, `IN_STAY_SUGGESTION`) but no `stay_id` |
| Guest Portal booking page | CTAs enabled, but RPC returns error for pre-arrival guests |
| My Bookings page | Already shows all bookings regardless of `booking_source` |
| Staff session detail | Shows bookings with "Source" column but no pre-arrival indicator |

**Key blocker**: The RPC check `CURRENT_DATE < check_in_date` prevents pre-arrival booking.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRE-ARRIVAL BOOKING FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Guest Portal (Pre-arrival)                                                 │
│       │                                                                     │
│       ├── Browse Activities (/guest/activities)                             │
│       │      • Date picker: arrival_date → departure_date                   │
│       │      • Sessions filtered to stay dates ✓ (already works)            │
│       │                                                                     │
│       ├── Book Activity (/guest/activities/book/:sessionId)                 │
│       │      • Calls modified RPC with p_is_prearrival flag                 │
│       │      • Sets booking_source = 'PRE_STAY'                             │
│       │      • Sets stay_id = guest's active stay                           │
│       │      • Shows confirmation: "Reserved for your stay"                 │
│       │                                                                     │
│       └── My Bookings (/guest/bookings)                                     │
│              • Shows all bookings (pre-arrival + in-house)                  │
│              • Badge: "Planned" for PRE_STAY bookings                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Staff Console                                                              │
│       │                                                                     │
│       ├── Session Detail (/staff/activities/sessions/:id)                   │
│       │      • Shows "Pre-arrival" badge on bookings                        │
│       │      • Displays stay dates in tooltip                               │
│       │                                                                     │
│       └── Guest Profile (/staff/guests/:id)                                 │
│              • Bookings section shows both stages                           │
│              • Filter by stage available                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Database Schema Changes

### 1.1 Add `stay_id` Column to `activity_bookings`

```sql
-- Add stay_id column (nullable for backwards compatibility)
ALTER TABLE public.activity_bookings 
ADD COLUMN IF NOT EXISTS stay_id UUID REFERENCES public.guest_stays(id) ON DELETE SET NULL;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_activity_bookings_stay_id 
ON public.activity_bookings(stay_id);

-- Create composite index for pre-arrival queries
CREATE INDEX IF NOT EXISTS idx_activity_bookings_resort_guest_source 
ON public.activity_bookings(resort_id, guest_id, booking_source);
```

### 1.2 Update `booking_source_context` Enum Usage

The enum already exists with `PRE_STAY` value. We'll use this consistently for all pre-arrival bookings instead of adding a new `booking_stage` column (uses existing infrastructure).

---

## Phase 2: RPC Updates

### 2.1 Modify `guest_create_activity_booking` RPC

Update the RPC to accept an optional `p_stay_id` parameter and relax the date check for pre-arrival guests:

```sql
CREATE OR REPLACE FUNCTION public.guest_create_activity_booking(
  p_guest_id uuid,
  p_session_id uuid,
  p_num_adults integer,
  p_num_children integer,
  p_notes text DEFAULT NULL,
  p_stay_id uuid DEFAULT NULL  -- NEW: Optional stay context
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guest guests%ROWTYPE;
  v_session activity_sessions%ROWTYPE;
  v_activity activities%ROWTYPE;
  v_stay guest_stays%ROWTYPE;
  v_is_prearrival boolean := false;
  v_booking_source booking_source_context := 'NORMAL';
  -- ... existing declarations
BEGIN
  -- Get guest record
  SELECT * INTO v_guest FROM guests WHERE id = p_guest_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Guest not found');
  END IF;
  
  -- Determine if this is a pre-arrival booking
  IF p_stay_id IS NOT NULL THEN
    SELECT * INTO v_stay FROM guest_stays WHERE id = p_stay_id;
    IF FOUND AND v_stay.status = 'pre_arrival' THEN
      v_is_prearrival := true;
      v_booking_source := 'PRE_STAY';
    END IF;
  ELSIF CURRENT_DATE < v_guest.check_in_date THEN
    -- Auto-detect pre-arrival status from guest dates
    v_is_prearrival := true;
    v_booking_source := 'PRE_STAY';
    
    -- Try to find matching stay
    SELECT id INTO p_stay_id
    FROM guest_stays
    WHERE guest_id = p_guest_id AND resort_id = v_guest.resort_id
    ORDER BY CASE status WHEN 'pre_arrival' THEN 1 ELSE 2 END, arrival_date
    LIMIT 1;
  END IF;
  
  -- MODIFIED: Only block if not in-house AND not pre-arrival
  IF NOT v_is_prearrival AND 
     (CURRENT_DATE < v_guest.check_in_date OR CURRENT_DATE > v_guest.check_out_date) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Booking is only available during your stay');
  END IF;
  
  -- ... rest of validation unchanged ...
  
  -- Session date must be within stay dates (applies to BOTH pre-arrival and in-house)
  IF v_session.date < v_guest.check_in_date OR v_session.date > v_guest.check_out_date THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session date is outside your stay period');
  END IF;
  
  -- Session must not have started (applies to ALL bookings)
  v_session_datetime := session_start_timestamptz(v_session.date, v_session.start_time, v_guest.resort_id);
  IF v_session_datetime <= now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This session has already started');
  END IF;
  
  -- ... capacity, overlap checks unchanged ...
  
  -- Insert booking with stay context
  INSERT INTO activity_bookings (
    resort_id, session_id, guest_id, room_number,
    num_adults, num_children, notes, source, status,
    booking_source, stay_id,  -- NEW columns
    price_per_person, total_amount
  ) VALUES (
    v_guest.resort_id, p_session_id, p_guest_id, v_guest.room_number,
    p_num_adults, p_num_children, p_notes, 'GUEST_PORTAL', v_booking_status,
    v_booking_source, p_stay_id,  -- NEW values
    v_price, v_total_pax * v_price
  )
  RETURNING id INTO v_booking_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'status', v_booking_status,
    'requires_approval', v_activity.requires_approval,
    'is_prearrival', v_is_prearrival  -- NEW: Return flag for UI
  );
END;
$$;
```

### 2.2 Update `validateActivityBooking` (Client-side)

Modify `src/lib/booking-validation.ts` to handle pre-arrival context:

```typescript
export async function validateActivityBooking(
  params: ValidateActivityBookingParams & { stayId?: string }
): Promise<BookingValidationResult> {
  // ... existing code ...
  
  // 9. Stay dates check - MODIFIED for pre-arrival
  // For pre-arrival guests, allow booking before check-in date
  // but session must still be within stay dates
  const isPrearrival = guest.check_in_date && 
    new Date().toISOString().split('T')[0] < guest.check_in_date;
  
  if (guest.check_in_date && guest.check_out_date) {
    const sessionDate = session.date;
    // Session must be within stay dates (regardless of pre-arrival status)
    if (sessionDate < guest.check_in_date || sessionDate > guest.check_out_date) {
      return createValidationError('OUTSIDE_STAY_DATES');
    }
  }
  
  // ... rest unchanged ...
}
```

---

## Phase 3: Guest Portal UI Updates

### 3.1 Update `GuestActivityBookingPage.tsx`

Pass the active stay context when booking:

```typescript
// In GuestActivityBookingPage.tsx
import { useActiveStay } from '@/hooks/useActiveStay';

export default function GuestActivityBookingPage() {
  const { guest } = useGuestAuth();
  const { activeStay } = useActiveStay();
  
  // Determine if this is a pre-arrival booking
  const isPrearrival = activeStay?.status === 'pre_arrival';
  
  const bookMutation = useMutation({
    mutationFn: async () => {
      // Include stay_id in the RPC call
      const { data, error } = await supabase.rpc('guest_create_activity_booking', {
        p_guest_id: guest.guestId,
        p_session_id: selectedSessionId,
        p_num_adults: numAdults,
        p_num_children: numChildren,
        p_notes: notes.trim() || null,
        p_stay_id: activeStay?.id || null,  // NEW: Pass stay context
      });
      // ...
    },
  });
  
  // Add pre-arrival confirmation message in the booking form
  {isPrearrival && (
    <Alert className="bg-primary/5 border-primary/20">
      <Info className="h-4 w-4 text-primary" />
      <AlertDescription className="text-sm">
        This will be reserved for your upcoming stay. You can modify it later.
      </AlertDescription>
    </Alert>
  )}
}
```

### 3.2 Update Success Screen

Show appropriate messaging for pre-arrival bookings:

```typescript
// In success screen
<h2 className="text-xl font-bold text-foreground mb-2">
  {bookingResult.requiresApproval 
    ? 'Request Sent!' 
    : isPrearrival 
      ? 'Reserved for Your Stay!' 
      : "You're Booked!"}
</h2>
<p className="text-muted-foreground mb-2">
  {isPrearrival
    ? `We've reserved ${session.activity_name} for ${format(parseISO(session.date), 'EEE, MMM d')} at ${session.start_time.slice(0, 5)}. See you soon!`
    : `Your booking for ${session.activity_name} is confirmed.`}
</p>
```

---

## Phase 4: My Bookings Page Updates

### 4.1 Add Pre-arrival Badge to Booking Cards

Update `GuestMyBookings.tsx` to show a "Planned" badge for pre-arrival bookings:

```typescript
// Add to booking card rendering
const isPrearrivalBooking = booking.booking_source === 'PRE_STAY';

// In the card header
{isPrearrivalBooking && (
  <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
    Planned
  </Badge>
)}
```

### 4.2 Update Data Fetching

Ensure the `guest_get_room_bookings` RPC returns `booking_source`:

```sql
-- In guest_get_room_bookings RPC, add booking_source to select
SELECT 
  ab.id, ab.guest_id, ab.num_adults, ab.num_children, ab.status, ab.notes,
  ab.booking_source,  -- ADD THIS
  -- ... rest of fields
```

---

## Phase 5: Staff Console Updates

### 5.1 Session Detail Page - Pre-arrival Badge

Update `ActivitySessionDetailPage.tsx` to show pre-arrival indicator:

```typescript
// In bookings table
<TableCell className="text-xs">
  {booking.booking_source === 'PRE_STAY' ? (
    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
      Pre-arrival
    </Badge>
  ) : (
    booking.source.replace('STAFF_', '')
  )}
</TableCell>
```

### 5.2 Guest Profile - Bookings Filter

Add filter option to `GuestDetailPage.tsx` for booking stage:

```typescript
// Add state for filter
const [bookingStageFilter, setBookingStageFilter] = useState<'all' | 'pre_arrival' | 'in_house'>('all');

// Filter bookings
const filteredBookings = activityBookings.filter(b => {
  if (bookingStageFilter === 'all') return true;
  if (bookingStageFilter === 'pre_arrival') return b.booking_source === 'PRE_STAY';
  return b.booking_source !== 'PRE_STAY';
});

// Add filter UI
<div className="flex gap-2 mb-3">
  <Button 
    variant={bookingStageFilter === 'all' ? 'default' : 'outline'} 
    size="sm"
    onClick={() => setBookingStageFilter('all')}
  >
    All
  </Button>
  <Button 
    variant={bookingStageFilter === 'pre_arrival' ? 'default' : 'outline'} 
    size="sm"
    onClick={() => setBookingStageFilter('pre_arrival')}
  >
    Pre-arrival
  </Button>
  <Button 
    variant={bookingStageFilter === 'in_house' ? 'default' : 'outline'} 
    size="sm"
    onClick={() => setBookingStageFilter('in_house')}
  >
    In-house
  </Button>
</div>
```

---

## Phase 6: Real-time Sync

The existing real-time sync hooks (`useGuestActivitySync`, `useActivityBookingSync`) already handle booking updates correctly. No changes needed - they invalidate queries on any booking change for the guest/session.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/migrations/...` | Add `stay_id` column, update RPC |
| `src/lib/booking-validation.ts` | Handle pre-arrival context in validation |
| `src/pages/guest/GuestActivityBookingPage.tsx` | Pass `stay_id`, show pre-arrival messaging |
| `src/pages/guest/GuestMyBookings.tsx` | Add "Planned" badge for pre-arrival bookings |
| `src/pages/activities/ActivitySessionDetailPage.tsx` | Show pre-arrival badge in bookings table |
| `src/pages/guests/GuestDetailPage.tsx` | Add booking stage filter |

---

## Implementation Order

1. **Database Migration** - Add `stay_id` column and index
2. **Update RPC** - Modify `guest_create_activity_booking` to accept pre-arrival bookings
3. **Update client validation** - `booking-validation.ts`
4. **Update booking page** - Pass stay context, show pre-arrival UI
5. **Update My Bookings** - Add "Planned" badge
6. **Update Staff Session Detail** - Show pre-arrival indicator
7. **Update Guest Profile** - Add stage filter

---

## Testing Scenarios

| Scenario | Expected Behavior |
|----------|-------------------|
| Pre-arrival guest books activity within stay dates | ✅ Booking created with `booking_source='PRE_STAY'` |
| Pre-arrival guest books activity outside stay dates | ❌ Error: "Session date is outside your stay period" |
| Pre-arrival guest books session that has started | ❌ Error: "This session has already started" |
| In-house guest books activity | ✅ Booking created with `booking_source='NORMAL'` (unchanged) |
| Pre-arrival booking appears in My Bookings | ✅ Shows with "Planned" badge |
| Staff sees pre-arrival booking in session detail | ✅ Shows "Pre-arrival" badge |
| Staff cancels pre-arrival booking | ✅ Guest sees status change in My Bookings |
| Pre-arrival booking respects capacity limits | ✅ Same capacity validation as in-house |
| Pre-arrival booking respects cutoff time | ✅ Same cutoff validation as in-house |

---

## What Remains Unchanged

| Component | Status |
|-----------|--------|
| In-house booking flow | Unchanged |
| Capacity validation logic | Unchanged |
| Cutoff time validation | Unchanged |
| Overlap detection | Unchanged |
| Approval workflow | Unchanged |
| Staff booking creation | Unchanged |
| Cancellation flow | Unchanged |
| Real-time sync | Unchanged |
| RLS policies | Unchanged |

---

## Backwards Compatibility

- **Existing bookings**: `stay_id` is nullable, so existing bookings continue to work
- **Legacy guests without `guest_stays`**: RPC auto-detects pre-arrival from guest dates
- **`booking_source` NULL**: Treated as `NORMAL` (in-house)
- **Staff workflows**: All existing staff operations work unchanged

