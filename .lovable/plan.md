
# Fix Guest Portal "My Bookings" - RPC Schema Mismatch

## Root Cause Identified

The `guest_get_room_bookings` RPC function has **incorrect column names** that don't match the actual database schema:

| RPC Uses (Wrong) | Database Has (Correct) |
|------------------|------------------------|
| `rr.slot_id` | `rr.restaurant_slot_id` |
| `rr.party_size` | `rr.num_adults`, `rr.num_children` |
| `JOIN ... ON ts.id = rr.slot_id` | `JOIN ... ON ts.id = rr.restaurant_slot_id` |

This causes the RPC to fail with a "column does not exist" error, returning no data for both demo and live resorts.

## Solution

### 1. Database Migration - Fix RPC Function
Create a new migration to replace `guest_get_room_bookings` with correct column names:

```sql
-- Key changes in restaurant reservations query:

-- BEFORE (broken):
'slot_id', rr.slot_id,
'party_size', rr.party_size,
...
JOIN restaurant_time_slots ts ON ts.id = rr.slot_id

-- AFTER (fixed):
'restaurant_slot_id', rr.restaurant_slot_id,
'num_adults', rr.num_adults,
'num_children', rr.num_children,
...
JOIN restaurant_time_slots ts ON ts.id = rr.restaurant_slot_id
```

### 2. UI Update - Better Error Handling & Data Mapping

Update `GuestMyBookings.tsx` to:
1. **Throw errors instead of silently returning null** - enables proper error state display
2. **Add `isError` and `refetch`** from useQuery for error recovery UI
3. **Map restaurant data correctly** - use `num_adults`/`num_children` directly instead of `party_size`

```typescript
// BEFORE:
num_adults: r.party_size || 2,
num_children: 0,

// AFTER:
num_adults: r.num_adults ?? 2,
num_children: r.num_children ?? 0,
```

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/20260123_fix_guest_get_room_bookings_rpc.sql` | Create | Fix RPC column names |
| `src/pages/guest/GuestMyBookings.tsx` | Modify | Better error handling + correct data mapping |

## Expected Result

After implementation:
- Demo portal "My Bookings" displays seeded activity bookings and dining reservations
- Live resorts display guest bookings correctly
- Error states are visible if RPC fails (with retry button)
- Both `num_adults` and `num_children` display correctly for dining reservations
