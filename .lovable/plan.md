
# Fix: GuestDetailPage Null Safety for Nested Booking Data

## Problem

The Guest Detail page at `/staff/guests/{id}` crashes with an ErrorBoundary error when:
- An `activity_booking` has a null `session` (orphaned booking, deleted session, or RLS restriction)
- A `restaurant_reservation` has a null `slot` (same causes)

The filter logic correctly excludes records with null nested data, but the TypeScript types claim `session` and `slot` are always present, which masks the issue and allows unsafe property access without compiler warnings.

---

## Root Cause

**Type mismatch between interface and Supabase reality:**

```typescript
// Current interface (lines 30-42)
interface ActivityBookingWithSession {
  session: {                    // Required - but Supabase can return null!
    id: string;
    date: string;
    activity: { name: string };
  };
}
```

When Supabase returns `session: null` for an orphaned booking, accessing `booking.session.id` throws a TypeError.

---

## Solution

1. **Update type interfaces** to make `session` and `slot` optional (nullable)
2. **Add optional chaining** to all property accesses on these nested objects
3. **Fix navigation paths** that are missing the `/staff` prefix

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/guests/GuestDetailPage.tsx` | Update types + add optional chaining + fix navigation paths |

---

## Technical Changes

### 1. Update Type Interfaces (lines 30-57)

```typescript
// Line 36: Make session optional
interface ActivityBookingWithSession {
  id: string;
  guest_id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  num_adults: number;
  num_children: number;
  session: {                          // Keep as-is for now, filter guards handle nulls
    id: string;
    date: string;
    start_time: string;
    activity: { name: string } | null;  // Make activity nullable
  } | null;                            // Make session nullable
}

// Line 50: Make slot optional  
interface ReservationWithSlot {
  id: string;
  guest_id: string;
  status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED';
  num_adults: number;
  num_children: number;
  slot: {
    id: string;
    date: string;
    start_time: string;
    meal_period: string;
    restaurant: { name: string } | null;  // Make restaurant nullable
  } | null;                              // Make slot nullable
}
```

### 2. Add Optional Chaining to Rendering (lines 575-700)

**Activity Bookings - Upcoming (lines 579-586):**
```typescript
<TableRow 
  key={booking.id}
  className="cursor-pointer hover:bg-muted/50"
  onClick={() => booking.session?.id && navigate(`/staff/activities/sessions/${booking.session.id}`)}
>
  <TableCell className="font-medium">{booking.session?.activity?.name || 'Unknown Activity'}</TableCell>
  <TableCell>{booking.session?.date ? safeFormatDate(booking.session.date, 'EEE, MMM d') : '-'}</TableCell>
  <TableCell>{booking.session?.start_time?.slice(0, 5) || '-'}</TableCell>
  <TableCell>{booking.num_adults + booking.num_children}</TableCell>
  <TableCell><StatusBadge status={booking.status} /></TableCell>
</TableRow>
```

**Activity Bookings - Past (lines 609-616):** Same pattern

**Restaurant Reservations - Upcoming (lines 657-670):**
```typescript
<TableRow 
  key={reservation.id}
  className="cursor-pointer hover:bg-muted/50"
  onClick={() => reservation.slot?.id && navigate(`/staff/restaurants/slots/${reservation.slot.id}`)}
>
  <TableCell className="font-medium">{reservation.slot?.restaurant?.name || 'Unknown Restaurant'}</TableCell>
  <TableCell>{reservation.slot?.date ? safeFormatDate(reservation.slot.date, 'EEE, MMM d') : '-'}</TableCell>
  <TableCell>{reservation.slot?.start_time?.slice(0, 5) || '-'}</TableCell>
  <TableCell><Badge variant="outline">{reservation.slot?.meal_period || '-'}</Badge></TableCell>
  <TableCell>{reservation.num_adults + reservation.num_children}</TableCell>
  <TableCell><StatusBadge status={reservation.status} /></TableCell>
</TableRow>
```

**Restaurant Reservations - Past (lines 693-701):** Same pattern

### 3. Fix Navigation Paths

| Line | Current | Fixed |
|------|---------|-------|
| 579 | `/activities/sessions/${...}` | `/staff/activities/sessions/${...}` |
| 661 | `/restaurants/slots/${...}` | `/staff/restaurants/slots/${...}` |

---

## Summary of All Changes

| Location | Change |
|----------|--------|
| Lines 36-42 | Make `session` and `session.activity` nullable in type |
| Lines 50-57 | Make `slot` and `slot.restaurant` nullable in type |
| Line 579 | Add `?.id` check + fix navigation path |
| Lines 581-583 | Add `?.` to all `booking.session` property accesses |
| Lines 611-613 | Add `?.` to all `booking.session` property accesses (past section) |
| Line 661 | Add `?.id` check + fix navigation path |
| Lines 663-666 | Add `?.` to all `reservation.slot` property accesses |
| Lines 695-698 | Add `?.` to all `reservation.slot` property accesses (past section) |

---

## Impact

- **Fixes crash**: Guest Detail page will no longer crash when bookings have null session/slot
- **Better types**: TypeScript now correctly reflects that nested data can be null
- **Fixed navigation**: Row clicks now navigate to correct `/staff/...` paths
- **No data loss**: Filter logic still excludes invalid records; fallbacks show clear "Unknown" text
- **No database changes required**

---

## Testing

After implementation:
1. Navigate to `/staff/guests/{guest-id}?debug=1`
2. Verify the page loads without errors
3. Check Error Log section in debug panel - should be empty
4. Click on an activity booking row - should navigate to `/staff/activities/sessions/{id}`
5. Click on a restaurant reservation row - should navigate to `/staff/restaurants/slots/{id}`
