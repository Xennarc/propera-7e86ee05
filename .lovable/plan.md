

# Add "Make Restaurant Reservation" Action to Guest Detail Page

## Summary

Add a **"Make Reservation" button** to the Restaurant Reservations card on the Guest Detail page, matching the Activity Booking pattern. This requires enhancing the existing `RestaurantReservationDialog` to support restaurant/date/slot selection when no slot is pre-selected.

---

## Current State Analysis

| Feature | Activity Bookings | Restaurant Reservations |
|---------|-------------------|------------------------|
| Card header button | ✅ "Book Activity" | ❌ Missing |
| Dialog state variable | ✅ `activityBookingDialogOpen` | ❌ Missing |
| Dialog component | ✅ Full selection flow | ⚠️ Requires slot pre-selection |
| Inline selection | ✅ Activity → Date → Session | ❌ Not implemented |

---

## Implementation Approach

### Pattern Alignment

The `ActivityBookingDialog` (lines 76-115) provides the template:

1. When opened with a guest but no session:
   - Fetch active activities for the resort
   - Show activity dropdown
   - Show date picker
   - Fetch and display available sessions for selected activity/date
   - User selects a session

2. When opened with a pre-selected session:
   - Skip selection, show session summary only

The `RestaurantReservationDialog` will be enhanced to follow this exact pattern.

---

## Files to Modify

### 1. `src/pages/restaurants/RestaurantReservationDialog.tsx`

**Changes:**
- Add state for restaurant selection: `selectedRestaurantId`, `selectedDate`
- Add state for slot list: `slots`, `restaurants`
- Add `useEffect` to fetch active restaurants when dialog opens without a slot
- Add `useEffect` to fetch available slots when restaurant/date selected
- Add restaurant dropdown, date picker, and slot selection UI (mirroring activity dialog)
- Keep existing slot summary when slot is pre-selected

**New UI Flow (when no slot provided):**
```text
┌────────────────────────────────────────────────────────────┐
│ New Restaurant Reservation                                 │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Guest                                                     │
│  ┌────────────────────────────────────────────────────┐   │
│  │ John Smith                       Room 101  [Change]│   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  Restaurant *                                              │
│  [ Select restaurant ▾ ]                                   │
│                                                            │
│  Date *                                                    │
│  [ 2026-01-24 ]                                            │
│                                                            │
│  Available Slots *                                         │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 18:00 - 20:00  │  DINNER  │  24 remaining          │   │
│  └────────────────────────────────────────────────────┘   │
│  ┌────────────────────────────────────────────────────┐   │
│  │ 19:00 - 21:00  │  DINNER  │  12 remaining          │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  Adults *                Children                          │
│  [ 1 ]                   [ 0 ]                             │
│                                                            │
│  Special Requests                                          │
│  [                                                     ]   │
│                                                            │
│                         [Cancel]  [Create Reservation]     │
└────────────────────────────────────────────────────────────┘
```

---

### 2. `src/pages/guests/GuestDetailPage.tsx`

**Changes:**
- Add state: `const [restaurantReservationDialogOpen, setRestaurantReservationDialogOpen] = useState(false);`
- Add button to Restaurant Reservations card header (matching Activity Bookings)
- Render `RestaurantReservationDialog` at bottom of component

**Location:** Lines 688-695 (Restaurant Reservations CardHeader)

```typescript
// Current (line 690-695):
<CardHeader className="flex flex-row items-center justify-between">
  <CardTitle className="flex items-center gap-2">
    <Utensils className="h-5 w-5" />
    Restaurant Reservations
  </CardTitle>
</CardHeader>

// Updated:
<CardHeader className="flex flex-row items-center justify-between">
  <CardTitle className="flex items-center gap-2">
    <Utensils className="h-5 w-5" />
    Restaurant Reservations
  </CardTitle>
  {canEdit && (
    <Button onClick={() => setRestaurantReservationDialogOpen(true)}>
      Make Reservation
    </Button>
  )}
</CardHeader>
```

**Add dialog render (after ActivityBookingDialog, around line 790):**
```typescript
{/* Restaurant Reservation Dialog */}
<RestaurantReservationDialog
  open={restaurantReservationDialogOpen}
  onOpenChange={setRestaurantReservationDialogOpen}
  guest={guest}
  onSuccess={fetchGuest}
/>
```

---

## Technical Details

### Restaurant Fetch Query
```typescript
const fetchRestaurants = async () => {
  if (!currentResort) return;
  const { data } = await supabase
    .from('restaurants')
    .select('*')
    .eq('resort_id', currentResort.id)
    .eq('is_active', true)
    .order('name');
  if (data) setRestaurants(data);
};
```

### Slot Fetch Query (with remaining capacity)
```typescript
const fetchAvailableSlots = async () => {
  if (!currentResort || !selectedRestaurantId || !selectedDate) return;
  
  // Fetch slots
  const { data: slotsData } = await supabase
    .from('restaurant_time_slots')
    .select(`*, restaurant:restaurants(*)`)
    .eq('resort_id', currentResort.id)
    .eq('restaurant_id', selectedRestaurantId)
    .eq('date', selectedDate)
    .eq('status', 'OPEN')
    .order('start_time');
  
  if (!slotsData) return;
  
  // Fetch booked covers for these slots
  const slotIds = slotsData.map(s => s.id);
  const { data: reservationsData } = await supabase
    .from('restaurant_reservations')
    .select('restaurant_slot_id, num_adults, num_children')
    .in('restaurant_slot_id', slotIds)
    .in('status', ['PENDING', 'CONFIRMED']);
  
  // Calculate remaining capacity
  const slotsWithCapacity = slotsData.map(slot => {
    const slotReservations = reservationsData?.filter(r => r.restaurant_slot_id === slot.id) || [];
    const bookedCovers = slotReservations.reduce((sum, r) => sum + r.num_adults + r.num_children, 0);
    return { ...slot, bookedCovers, remaining: slot.capacity - bookedCovers };
  });
  
  setSlots(slotsWithCapacity);
};
```

---

## Permissions

Using the same permission check as Activity Booking:

```typescript
// Line 108 in GuestDetailPage.tsx
const canEdit = hasWriteAccess(canAccessGuests);
```

This ensures:
- RESORT_ADMIN ✅
- MANAGER ✅
- FRONT_OFFICE ✅
- RESERVATIONS ✅

---

## Post-Action Behavior

| Action | Behavior |
|--------|----------|
| Reservation created | Toast: "Reservation created successfully" |
| Duplicate detected | Toast: "Existing Reservation Found" |
| Dialog closes | Automatically via `onOpenChange(false)` |
| Data refresh | `fetchGuest()` called via `onSuccess` prop |
| Navigation | Optional - user can click new row to navigate to slot detail |

---

## What This Does NOT Change

- ✅ Existing reservation list display (unchanged)
- ✅ Existing slot detail page behavior (unchanged)
- ✅ Database tables (no modifications)
- ✅ RLS policies (no modifications)
- ✅ Booking service logic (reuses existing `createRestaurantReservation`)
- ✅ Loyalty points awarding (already implemented in dialog)

---

## Testing Checklist

1. Open Guest Detail page for a guest
2. Verify "Make Reservation" button appears in Restaurant Reservations card header
3. Click button - dialog opens with guest pre-filled
4. Select a restaurant from dropdown
5. Select a date
6. Verify available slots appear with remaining capacity
7. Select a slot
8. Enter pax count and optional special requests
9. Click "Create Reservation"
10. Verify toast appears and reservation shows in list immediately

