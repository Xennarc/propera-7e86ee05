

# Enhance Booking Tables with Inline Detail Previews

## Summary

Add **side sheet previews** to booking tables on the Guest Detail page, enabling staff to view expanded booking details (pax, notes, status, policy) and perform quick actions (cancel/navigate) without navigating away from the current page. Navigation to session/slot detail pages remains available.

---

## Current State

| Component | Behavior |
|-----------|----------|
| Activity Bookings table | Row click navigates to `/staff/activities/sessions/:id` |
| Restaurant Reservations table | Row click navigates to `/staff/restaurants/slots/:id` |
| Detail preview | Not available - requires full page navigation |
| Quick actions | Only available on detail pages |

---

## Design Decision: Side Sheet vs Expandable Row

| Option | Pros | Cons |
|--------|------|------|
| **Side Sheet** ✓ | More space for details, consistent with `RequestDetailDrawer` pattern, supports quick actions | Extra click to open |
| Expandable Row | Inline, no overlay | Limited space, harder to show actions, complex table state |

**Recommendation**: Use **Side Sheet** (following `RequestDetailDrawer` pattern) - it provides adequate space for pax details, notes, status, policy snippets, and quick actions while keeping navigation to detail pages intact.

---

## Architecture

```text
┌───────────────────────────────────────────────────────────────────────────┐
│ GuestDetailPage                                                           │
│                                                                           │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │ Activity Bookings Table                                              │ │
│  │ ┌─────────┬──────────┬──────┬─────┬────────┬────────┬─────────────┐ │ │
│  │ │ Activity│ Date     │ Time │ Pax │ Source │ Status │ Actions  ⋮  │ │ │
│  │ ├─────────┼──────────┼──────┼─────┼────────┼────────┼─────────────┤ │ │
│  │ │ Snorkel │ Mon, Jan │10:00 │ 2   │ Portal │ ✓ Conf │ [Eye] [→]   │ │ │
│  │ └─────────┴──────────┴──────┴─────┴────────┴────────┴─────────────┘ │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
                           │ Click [Eye]
                           ▼
┌───────────────────────────────────────────────────────────────────────────┐
│ StaffBookingPreviewSheet (Side Panel)                                     │
├───────────────────────────────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ Snorkeling Trip                                    [CONFIRMED]        │ │
│ │ Monday, January 27 • 10:00 - 12:00                                    │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ 👤 Guest       John Smith (Room 101)                                  │ │
│ │ 👥 Party       2 adults, 1 child                                      │ │
│ │ 📅 Booked      Jan 20 via Guest Portal                                │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ ┌ Notes ────────────────────────────────────────────────────────────────┐ │
│ │ "Need snorkel gear for beginner"                                      │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ ┌ Cancellation Policy ──────────────────────────────────────────────────┐ │
│ │ Cancel before 24 hours for full refund                                │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ [View Full Session →]    [Cancel Booking]                             │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Plan

### 1. New Component: `StaffBookingPreviewSheet`

**File:** `src/components/staff/StaffBookingPreviewSheet.tsx`

A unified preview sheet for both activity bookings and restaurant reservations.

**Props Interface:**
```typescript
interface StaffBookingPreviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  
  // One of these will be provided
  activityBooking?: ActivityBookingWithSession | null;
  restaurantReservation?: ReservationWithSlot | null;
  
  // Callbacks
  onNavigateToDetail?: () => void;
  onCancelBooking?: () => void;
  onRefresh?: () => void;
  
  // Permissions
  canCancel?: boolean;
}
```

**Content Sections:**
1. **Header**: Title (activity/restaurant name), status badge, date/time
2. **Guest Info**: Name, room number, party size (adults/children)
3. **Booking Source**: Portal, Pre-arrival, or Staff-created with creator name
4. **Notes Section**: Display `notes` (activities) or `special_requests` (restaurants)
5. **Policy Snippet**: Show cancellation window if applicable
6. **Quick Actions**:
   - "View Full Session/Slot" button (navigates to detail page)
   - "Cancel Booking" button (if canCancel and status allows)

**UI Pattern**: Uses `Sheet` component (consistent with `RequestDetailDrawer`)

---

### 2. New Hook: `useStaffBookingCancel`

**File:** `src/hooks/useStaffBookingCancel.ts`

A mutation hook for staff-side booking cancellations.

**Features:**
- Calls `cancelActivityBooking` or `cancelRestaurantReservation` from `booking-service.ts`
- Returns `isLoading`, `error`, and `mutateAsync` for the cancel operation
- Provides toast feedback on success/failure
- Includes `canCancelBooking` helper to check if cancellation is allowed

**Interface:**
```typescript
export function useStaffBookingCancel() {
  return {
    cancelActivity: (bookingId: string, guestId: string) => Promise<void>,
    cancelReservation: (reservationId: string, guestId: string) => Promise<void>,
    isCancelling: boolean,
  };
}

export function canCancelBooking(
  status: BookingStatus,
  bookingDate: string,
  bookingTime: string,
  cutoffHours?: number
): boolean;
```

---

### 3. Update Table in GuestDetailPage

**File:** `src/pages/guests/GuestDetailPage.tsx`

**Changes:**

1. **Add State for Preview Sheet:**
```typescript
const [previewBooking, setPreviewBooking] = useState<{
  type: 'activity' | 'restaurant';
  booking: ActivityBookingWithSession | null;
  reservation: ReservationWithSlot | null;
} | null>(null);
```

2. **Add Actions Column to Tables:**

Replace current row `onClick` with explicit action buttons:

| Column | Content |
|--------|---------|
| ... existing columns ... | |
| Actions | `[Eye icon]` Preview, `[ArrowRight icon]` Navigate |

**Activity Table Row:**
```typescript
<TableRow key={booking.id}>
  {/* ... existing cells ... */}
  <TableCell className="text-right">
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={(e) => {
          e.stopPropagation();
          setPreviewBooking({ type: 'activity', booking, reservation: null });
        }}
      >
        <Eye className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={() => navigate(`/staff/activities/sessions/${booking.session?.id}`)}
      >
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  </TableCell>
</TableRow>
```

3. **Render Preview Sheet:**
```typescript
<StaffBookingPreviewSheet
  open={!!previewBooking}
  onOpenChange={(open) => !open && setPreviewBooking(null)}
  activityBooking={previewBooking?.type === 'activity' ? previewBooking.booking : null}
  restaurantReservation={previewBooking?.type === 'restaurant' ? previewBooking.reservation : null}
  onNavigateToDetail={() => {
    if (previewBooking?.type === 'activity') {
      navigate(`/staff/activities/sessions/${previewBooking.booking?.session?.id}`);
    } else {
      navigate(`/staff/restaurants/slots/${previewBooking?.reservation?.slot?.id}`);
    }
    setPreviewBooking(null);
  }}
  onCancelBooking={async () => {
    // Handle cancel via useStaffBookingCancel
  }}
  onRefresh={fetchGuest}
  canCancel={canEdit}
/>
```

---

### 4. Fetch Additional Data for Previews

The current `GuestDetailPage` already fetches bookings with sessions/slots. To support the preview, we need to ensure `notes` and `special_requests` are included in the queries.

**Lines 130-140 (Activity Bookings Query):**
- Already includes `session:activity_sessions(*, activity:activities(*))`
- Verify `notes` field is selected (implicit in `*`)

**Lines 165-175 (Restaurant Reservations Query):**
- Already includes `slot:restaurant_time_slots(*, restaurant:restaurants(*))`
- Verify `special_requests` field is selected (implicit in `*`)

**Additional fields needed for policy display:**
- Activity: `session.activity.guest_can_cancel`, `session.activity.guest_cancel_cutoff_hours`, `session.activity.cancellation_policy_text`
- Restaurant: `slot.restaurant.guest_can_cancel`, `slot.restaurant.guest_cancel_cutoff_minutes`

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/staff/StaffBookingPreviewSheet.tsx` | Unified booking preview side sheet |
| `src/hooks/useStaffBookingCancel.ts` | Staff cancellation mutation hook |

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/guests/GuestDetailPage.tsx` | Add preview state, action buttons, render sheet |

---

## What This Does NOT Change

- **Navigation preserved**: Arrow button still navigates to session/slot detail pages
- **Existing table data**: Same columns, same sorting
- **Detail pages**: `ActivitySessionDetailPage` and `RestaurantSlotDetailPage` remain unchanged
- **Booking service logic**: Uses existing `cancelActivityBooking` / `cancelRestaurantReservation`
- **Database/RLS**: No changes required

---

## Permission Handling

| Action | Requirement |
|--------|-------------|
| View preview | Any staff with resort access |
| Cancel booking | `canEdit` permission (RESORT_ADMIN, MANAGER, FRONT_OFFICE, RESERVATIONS) |
| Navigate to detail | Any staff with resort access |

---

## Quick Actions Availability

| Action | Condition |
|--------|-----------|
| Cancel Activity | `status IN (PENDING, CONFIRMED)` AND within cutoff window |
| Cancel Reservation | `status IN (PENDING, CONFIRMED)` AND within cutoff window |
| View Full Session | Always available (navigates to detail page) |
| Edit Booking | Future enhancement (currently only on detail pages) |

---

## Preview Sheet Content Breakdown

### Activity Booking Preview

| Section | Data Source |
|---------|-------------|
| Title | `booking.session.activity.name` |
| Date/Time | `booking.session.date`, `booking.session.start_time` |
| Status | `booking.status` (via `StatusBadge`) |
| Guest | `guest.full_name` from context |
| Room | `booking.room_number` |
| Party | `booking.num_adults`, `booking.num_children` |
| Source | `booking.booking_source` |
| Notes | `booking.notes` |
| Policy | `booking.session.activity.cancellation_policy_text` |

### Restaurant Reservation Preview

| Section | Data Source |
|---------|-------------|
| Title | `reservation.slot.restaurant.name` |
| Date/Time | `reservation.slot.date`, `reservation.slot.start_time` |
| Meal Period | `reservation.slot.meal_period` |
| Status | `reservation.status` (via `StatusBadge`) |
| Guest | `guest.full_name` from context |
| Room | `reservation.room_number` |
| Party | `reservation.num_adults`, `reservation.num_children` |
| Special Requests | `reservation.special_requests` |
| Policy | Derived from `slot.restaurant.guest_cancel_cutoff_minutes` |

---

## Testing Checklist

1. Open GuestDetailPage for a guest with activity bookings
2. Click Eye icon on a booking row
3. Verify preview sheet opens with correct data:
   - Activity name, date, time, status
   - Guest party size (adults/children)
   - Notes if present
   - Policy snippet if available
4. Click "View Full Session" - navigates to session detail page
5. Click "Cancel Booking" (if allowed) - booking cancelled, list refreshes
6. Close sheet and verify table row still has arrow navigation
7. Repeat for restaurant reservations
8. Test with past bookings (cancel button should be hidden)
9. Test with different statuses (PENDING, CONFIRMED, CANCELLED)

