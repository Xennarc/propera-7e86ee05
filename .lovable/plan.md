
# Update Demo Reset to Re-seed Sample Guest Requests

## Problem
The recent UI improvements to Guest Requests (minimal icons, keyboard-safe drawer, rate limiting) are deployed, but the **demo-reset** function does not maintain sample service requests. After a reset cycle:
- Activity bookings and restaurant reservations are re-seeded if counts drop below threshold
- Guest requests are **deleted** but **never re-seeded**

This means demo visitors won't see the "My Requests" feature populated, missing the showcase of the new minimal icon design and status tracking.

## Solution
Add a **Pass 6: Service Requests Auto-Heal** step to `demo-reset` that mirrors the logic from `provision-demo/seedSampleServiceRequests`, ensuring the demo always has sample requests in NEW, IN_PROGRESS, and COMPLETED states.

## Technical Changes

### File: `supabase/functions/demo-reset/index.ts`

**1. Add to results tracking object (line ~146):**
```typescript
seeded: { 
  activity_bookings: 0, 
  restaurant_reservations: 0,
  service_requests: 0  // NEW
}
```

**2. Add Pass 6 after Pass 5 (after line ~533):**
```typescript
// ============================================================
// PASS 6: SERVICE REQUESTS - Ensure sample requests exist
// ============================================================
console.log("Pass 6: Auto-healing sample service requests...");

// Count existing seed service requests
const { count: seedRequestsCount } = await supabase
  .from("service_requests")
  .select("id", { count: "exact", head: true })
  .eq("resort_id", demoResortId)
  .eq("origin", "seed");

const needsRequests = (seedRequestsCount || 0) < 3;

if (needsRequests && !isDryRun) {
  // Get an in-house guest for requests
  const { data: demoGuest } = await supabase
    .from("guests")
    .select("id, room_number")
    .eq("resort_id", demoResortId)
    .lte("check_in_date", todayStr)
    .gte("check_out_date", todayStr)
    .limit(1)
    .single();

  if (demoGuest) {
    // Get catalog items
    const { data: catalogItems } = await supabase
      .from("request_catalog")
      .select("id, title, department_key")
      .eq("resort_id", demoResortId)
      .limit(10);

    if (catalogItems?.length >= 3) {
      const housekeepingItem = catalogItems.find(c => c.department_key === "HOUSEKEEPING");
      const minibarItem = catalogItems.find(c => c.department_key === "MINIBAR");
      const engineeringItem = catalogItems.find(c => c.department_key === "ENGINEERING") || catalogItems[2];

      if (housekeepingItem && minibarItem) {
        const now = new Date();
        const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);

        const sampleRequests = [
          {
            resort_id: demoResortId,
            guest_id: demoGuest.id,
            catalog_id: minibarItem.id,
            title: minibarItem.title,
            department_key: minibarItem.department_key,
            notes: "Could we get 2 bottles please?",
            is_asap: true,
            priority: "NORMAL",
            status: "NEW",
            origin: "seed",
            created_at: thirtyMinAgo.toISOString(),
          },
          {
            resort_id: demoResortId,
            guest_id: demoGuest.id,
            catalog_id: housekeepingItem.id,
            title: housekeepingItem.title,
            department_key: housekeepingItem.department_key,
            notes: "Thank you!",
            is_asap: true,
            priority: "NORMAL",
            status: "IN_PROGRESS",
            origin: "seed",
            created_at: twoHoursAgo.toISOString(),
            acknowledged_at: new Date(twoHoursAgo.getTime() + 5 * 60 * 1000).toISOString(),
            assigned_at: new Date(twoHoursAgo.getTime() + 10 * 60 * 1000).toISOString(),
          },
          {
            resort_id: demoResortId,
            guest_id: demoGuest.id,
            catalog_id: engineeringItem.id,
            title: engineeringItem.title,
            department_key: engineeringItem.department_key,
            notes: "The bathroom light was flickering",
            internal_notes: "Replaced bulb, all working now",
            is_asap: false,
            requested_for_at: new Date(fourHoursAgo.getTime() + 60 * 60 * 1000).toISOString(),
            priority: "HIGH",
            status: "COMPLETED",
            origin: "seed",
            created_at: fourHoursAgo.toISOString(),
            acknowledged_at: new Date(fourHoursAgo.getTime() + 3 * 60 * 1000).toISOString(),
            completed_at: new Date(fourHoursAgo.getTime() + 45 * 60 * 1000).toISOString(),
          },
        ];

        const { error } = await supabase
          .from("service_requests")
          .insert(sampleRequests);

        if (!error) {
          results.seeded.service_requests = sampleRequests.length;
        }
      }
    }
  }
}

console.log(`Service requests seeded: ${results.seeded.service_requests}`);
```

**3. Update results logging (line ~549):**
Add `seeded_requests_json` to the log update if needed.

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/demo-reset/index.ts` | Add Pass 6 to auto-heal sample service requests |

## Why This Matters
- Demo visitors will see the **new minimal ring icons** on the "My Requests" page
- The **keyboard-safe drawer** can be tested with real sample data
- The **status tracking** (NEW → IN_PROGRESS → COMPLETED) is showcased
- All recent UI work becomes visible in the demo environment

## No Breaking Changes
- Adds new functionality without affecting existing passes
- Uses `origin: "seed"` to distinguish from user-generated data
- Idempotent: only seeds if count < 3
