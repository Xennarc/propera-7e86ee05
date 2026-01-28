
# Update Demo Guest Portal to Reflect Recent Changes

## Overview

This plan ensures the demo guest portal (accessed via `/demo/login?token=XXX` or directly at `/resort/DEMO/guest`) reflects all the recent updates made to the Guest Portal system, including premium styling, UI refinements, and seeding logic alignment.

Based on my analysis, the **demo guest portal already incorporates most recent changes** through shared components and styling. However, there are a few areas that need alignment to ensure the demo experience fully showcases the latest features.

---

## Current State Analysis

### What's Already Working
The demo guest portal inherits these improvements automatically:
- Premium hero card with gradient overlays and glassmorphism (`guest-hero-card`)
- Quick action grid with hover/lift effects (`guest-quick-action`)
- Stay badges with accent styling (`guest-stay-badge`)
- Bottom navigation with elevated glass blur (`guest-nav-elevated`)
- Page background with gradient and vignette (`guest-page-bg`)
- Resort branding cascade via CSS variables
- Service requests UI with luxury-minimal accordion design
- Travel party card and smart suggestions

### Areas Requiring Updates

1. **Demo Seeding Alignment (Room 101 vs Room 201 Mismatch)**
   - The `provision-demo` function creates the demo guest as "Room 101 - Demo Guest" for the shared DEMO resort
   - However, in individual tenant demos, it seeds with "Room 201 - Emma Miller" as the primary guest
   - The `demo-reset` function targets Room 101 (James Wilson) for auto-healing
   - This inconsistency means some demo prospects may see fewer pre-seeded bookings

2. **Demo Guest Name Consistency**
   - Shared demo uses generic "Demo Guest" (Room 101)
   - Full seeding uses "James Wilson" (Room 101) with realistic guest patterns
   - Need to align the shared demo guest to match the richer demo data

3. **Seeded Data Freshness**
   - The demo-reset function should be triggered more reliably to keep demo data fresh
   - Activity bookings, restaurant reservations, and service requests need to be present

---

## Implementation Plan

### Phase 1: Align Demo Guest Configuration

**File: `supabase/functions/provision-demo/index.ts`**

Update the shared demo guest creation (lines 1314-1340) to use realistic guest data:

```typescript
// Change DEMO_GUEST_NAME from "Demo Guest" to "James Wilson"
const DEMO_GUEST_NAME = "James Wilson";
// Keep DEMO_GUEST_ROOM as "101"
```

Ensure the guest is created with proper details:
- `full_name`: "James Wilson" (matches demo-reset expectations)
- `room_number`: "101"
- `nationality`: "United Kingdom"
- `email`: "james.wilson@example.com"
- Stay dates: check-in 2 days ago, check-out in 5 days (in-house guest)

### Phase 2: Strengthen Demo Data Auto-Healing

**File: `supabase/functions/provision-demo/index.ts`**

In the `start-demo-singleton` mode, after creating/updating the demo guest:

1. Add explicit call to seed activity bookings if count is below threshold
2. Add explicit call to seed restaurant reservations
3. Ensure service requests are seeded (already in place via `seedSampleServiceRequests`)

Add a quick auto-heal check similar to `demo-reset`:

```typescript
// After guest creation/update, check and seed bookings if missing
const todayStr = formatDate(today);
const next7Days = formatDate(addDays(today, 7));

// Check activity bookings for demo guest
const { count: bookingsCount } = await supabaseAdmin
  .from("activity_bookings")
  .select("id", { count: "exact", head: true })
  .eq("resort_id", demoResort.id)
  .eq("guest_id", demoGuest.id)
  .gte("created_at", todayStr);

if (!bookingsCount || bookingsCount < 3) {
  // Seed 3-5 activity bookings
  await seedDemoBookings(supabaseAdmin, demoResort.id, demoGuest.id);
}
```

### Phase 3: Ensure Session/Slot Availability

In `start-demo-singleton`, add a call to refresh future availability:

```typescript
// Ensure 14-day activity sessions and restaurant slots exist
await refreshDemoData(supabaseAdmin, demoResort.id);
```

This is already partially implemented but should be called consistently.

### Phase 4: Demo Login Page Redirect Refinement

**File: `src/pages/demo/DemoLoginPage.tsx`**

Ensure the redirect after successful guest token consumption goes to the correct resort-scoped URL:

```typescript
// Current (correct):
window.location.href = `/resort/${resortCode}/guest`;

// Verify resortCode fallback:
const resortCode = guestData.resort_code || DEMO_RESORT_CODE; // "DEMO"
```

This is already in place - no changes needed.

---

## Technical Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/functions/provision-demo/index.ts` | Modify | Update `DEMO_GUEST_NAME` to "James Wilson" and add auto-heal booking seeding in `start-demo-singleton` mode |
| `supabase/functions/demo-reset/index.ts` | No changes | Already correctly targets Room 101 (James Wilson) |

---

## Validation Checklist

After implementation:

1. **Demo Guest Portal Entry**
   - Start demo via `/book-demo` → Email received with login links
   - Click guest login link → Auto-redirects to `/resort/DEMO/guest`
   - Guest home shows "James Wilson" or configured name

2. **Data Presence**
   - Home screen shows pre-arrival form nudge (if not completed) or today's schedule
   - "My Bookings" shows 3-5 activity bookings across categories
   - "My Bookings" shows 2-3 restaurant reservations
   - "Requests" shows 3 sample service requests (NEW, IN_PROGRESS, COMPLETED)

3. **Visual Polish**
   - Hero card displays with resort image gradient
   - Quick actions have hover lift animation
   - Bottom nav shows elevated glass effect with active indicator glow
   - Stay badges show check-in/out dates

4. **Staff Portal Alignment**
   - Staff login shows TodayHub with arrivals/departures
   - Guest 101 (James Wilson) visible in guest list
   - Bookings visible in Today's Sessions

---

## Risk Assessment

- **Low Risk**: Changes are additive data seeding, no breaking changes to auth flows
- **No UI Changes**: All styling already deployed via shared components
- **Idempotent**: Seeding functions already handle duplicate prevention

---

## Alternative: Manual Demo Reset

If immediate fix is needed before code deployment, trigger the demo-reset edge function:

```bash
curl -X POST https://dstxrbmetabgbijjeoyf.supabase.co/functions/v1/demo-reset \
  -H "Authorization: Bearer SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "run"}'
```

This will refresh guest dates, seed bookings, and ensure the demo portal has populated data.
