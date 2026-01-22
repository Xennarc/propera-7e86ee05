
# Fix Demo Seeding to Target Room 101 (James Wilson)

## Problem

The demo guest portal auto-login uses **Room 101 (James Wilson)** as defined in both:
- `src/lib/demoSingleton.ts` line 13: `DEMO_GUEST_ROOM = "101"`
- `supabase/functions/provision-demo/index.ts` line 1067: `DEMO_GUEST_ROOM = "101"`

However, the recent seeding implementation I added incorrectly targets **Room 201 (Emma Miller)**, causing:
- Activity bookings to be assigned to the wrong guest
- Restaurant reservations to be assigned to the wrong guest
- Service requests seeding to grab a random first guest (inconsistent)

This means when you log into the demo portal as James Wilson (101), your "My Bookings" and "My Requests" pages are empty.

## Solution

Update all seeding logic to explicitly target **Room 101** for consistency with the demo login configuration.

## Technical Changes

### File 1: `supabase/functions/demo-reset/index.ts`

**Change 1 - Line 464: Fix activity/restaurant seeding guest priority**
```typescript
// FROM:
const demoPortalGuest = inHouseGuests.find(g => g.room_number === "201") || inHouseGuests[0];

// TO:
const demoPortalGuest = inHouseGuests.find(g => g.room_number === "101") || inHouseGuests[0];
```

**Change 2 - Lines 591-598: Fix service requests to use the same room**
```typescript
// FROM (grabs random first guest):
const { data: demoGuest } = await supabase
  .from("guests")
  .select("id, room_number")
  .eq("resort_id", demoResortId)
  .lte("check_in_date", todayStr)
  .gte("check_out_date", todayStr)
  .limit(1)
  .single();

// TO (explicitly targets room 101):
const { data: demoGuest } = await supabase
  .from("guests")
  .select("id, room_number")
  .eq("resort_id", demoResortId)
  .eq("room_number", "101")
  .lte("check_in_date", todayStr)
  .gte("check_out_date", todayStr)
  .single();
```

### File 2: `supabase/functions/provision-demo/index.ts` 

Apply the same fix if `refreshDemoData` contains similar prioritization logic targeting room 201.

## Files Modified

| File | Line(s) | Change |
|------|---------|--------|
| `supabase/functions/demo-reset/index.ts` | 464 | Change `"201"` to `"101"` |
| `supabase/functions/demo-reset/index.ts` | 591-598 | Add `.eq("room_number", "101")` filter |
| `supabase/functions/provision-demo/index.ts` | (if applicable) | Same room 101 prioritization |

## Expected Result

After this fix:
- Demo portal login (Room 101 / James Wilson) will show pre-seeded activity bookings
- Demo portal "My Bookings" will display 5 activities + 3 dining reservations
- Demo portal "My Requests" will show 3 sample service requests
- Staff portal will show the same bookings with guest name "James Wilson" and room "101"

## No Breaking Changes

- Simply corrects room number from 201 to 101
- All other seeding logic remains identical
- Aligns with existing demo configuration constants
