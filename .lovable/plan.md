
# Fix Guest Portal "My Bookings" Display Logic

## Current State Analysis

After thorough investigation, I found that:

1. **The RPC is now working correctly** - No database errors are occurring
2. **Upcoming bookings display correctly** - The guest has 3 upcoming bookings (1 restaurant today, 2 activities future)
3. **Past bookings exist but have wrong status** - 13 bookings from past dates still have `CONFIRMED` status (not `COMPLETED`)
4. **No cancelled bookings exist** - Demo seeding only creates `CONFIRMED` status bookings

## Root Cause

The "My Bookings" page has correct filtering logic, but there are two issues:

| Issue | Impact | Solution |
|-------|--------|----------|
| Demo seeding doesn't create `CANCELLED` or `COMPLETED` bookings | Users never see those sections with demo data | Enhance demo seeding to create realistic test data |
| Past `CONFIRMED` bookings show in "Completed" collapsible | This is correct behavior, but section is collapsed by default | No change needed - working as designed |

## Implementation Plan

### 1. Enhance Demo Seeding (`src/lib/demo-seed.ts`)

Add varied booking statuses to make the demo more realistic:

```typescript
// Create mix of statuses for realism
const statuses = ['CONFIRMED', 'CONFIRMED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'];
const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
```

Create bookings with:
- **CONFIRMED/PENDING**: For upcoming sessions
- **COMPLETED**: For past sessions  
- **CANCELLED**: 1-2 random bookings to demonstrate cancelled section

### 2. Add Past Booking Seeding

Create explicit past-date sessions and bookings for the "Completed" section:
- Add 2-3 activity bookings with `COMPLETED` status for dates before today
- Add 1-2 restaurant reservations with `COMPLETED` status

### 3. Add Cancelled Booking Seeding

Create 1-2 cancelled bookings to populate the "Cancelled" section:
- 1 cancelled activity booking
- 1 cancelled restaurant reservation

## Technical Changes

### File: `src/lib/demo-seed.ts`

**Modify activity booking creation (lines 221-262):**
```typescript
// Create realistic booking mix
confirmedGuests.forEach((guest, idx) => {
  const guestCheckIn = new Date(guest.check_in_date);
  const guestCheckOut = new Date(guest.check_out_date);
  
  const validSessions = createdSessions?.filter(s => {
    const sessionDate = new Date(s.date);
    return sessionDate >= guestCheckIn && sessionDate <= guestCheckOut;
  }) || [];

  validSessions.slice(0, 3).forEach((session, sIdx) => {
    const sessionDate = new Date(session.date);
    const isPast = sessionDate < today;
    
    // Determine status based on date and randomness
    let status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'PENDING' = 'CONFIRMED';
    if (isPast) {
      status = sIdx === 0 && idx === 0 ? 'CANCELLED' : 'COMPLETED';
    } else if (sIdx === 0 && idx === 1) {
      status = 'PENDING'; // One pending for approval demo
    }
    
    // ... rest of booking creation
  });
});
```

**Modify restaurant reservation creation (lines 264-299):**
Apply same logic for restaurant reservations to create COMPLETED and CANCELLED examples.

## Expected Results After Implementation

### Demo Guest Portal "My Bookings" will show:

| Section | Count | Content |
|---------|-------|---------|
| **Upcoming** | 3+ | Future CONFIRMED/PENDING bookings |
| **Completed** (collapsible) | 10+ | Past sessions that were attended |
| **Cancelled** (collapsible) | 2+ | Bookings the guest cancelled |

### Visual Verification:
- Upcoming section shows activity/dining cards with edit/cancel buttons
- Completed section expands to show past bookings with checkmark icons
- Cancelled section expands to show cancelled bookings with X icons
- Filter tabs work correctly for Activities/Dining/All

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/demo-seed.ts` | Enhance booking creation with varied statuses (COMPLETED, CANCELLED, PENDING) |

## Why This Approach

1. **No UI changes needed** - The filtering logic in `GuestMyBookings.tsx` is already correct
2. **Demo data becomes realistic** - Users can see all three sections populate naturally
3. **Matches real-world usage** - Actual resorts will have completed and cancelled bookings from normal operations
