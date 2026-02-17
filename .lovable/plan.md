
# Fix: Confirm Booking Button Hidden Behind Bottom Navigation

## Problem
On the activity booking page (`GuestActivityBookingPage`), the "Confirm Booking" button sits at the very bottom of a Card. On mobile, the bottom navigation bar covers this button, making it impossible to scroll to or tap it.

## Root Cause
The button (lines 793-808) is rendered inline inside the booking form Card. There is no bottom spacer or sticky action bar to ensure it remains accessible above the fixed bottom navigation.

## Solution
Use the existing `StickyActionBar` and `StickyActionBarSpacer` components (already built for this exact pattern in the Guest Portal) to pin the confirm button above the bottom nav on mobile.

### Changes (1 file)

**File:** `src/pages/guest/GuestActivityBookingPage.tsx`

1. **Import** `StickyActionBar` and `StickyActionBarSpacer` from `@/components/guest/StickyActionBar`.

2. **Remove** the inline `<Button>` (lines 793-808) from inside the Card.

3. **Add** `<StickyActionBarSpacer />` after the closing `</Card>` to prevent content overlap.

4. **Add** `<StickyActionBar>` after the spacer containing the confirm button. This will pin the button above the bottom nav on mobile and hide on desktop (where it's not needed since the page scrolls normally).

5. **Keep the button inside the Card on desktop** by rendering it in both places: inside the card with `hidden lg:block` and in the sticky bar with `lg:hidden` (which `StickyActionBar` already handles).

### What This Looks Like

```
Before:                          After:
+------------------+            +------------------+
| Card             |            | Card             |
|  Guest count     |            |  Guest count     |
|  Pricing         |            |  Pricing         |
|  Notes           |            |  Notes           |
|  [Confirm] <--   |            |  [Confirm]       | (desktop only)
+--HIDDEN--+       |            +------------------+
| Bottom Nav       |            | Spacer (mobile)  |
+------------------+            +==================+
                                | [Confirm Booking]| (sticky, mobile)
                                +------------------+
                                | Bottom Nav       |
                                +------------------+
```

### No Business Logic Changes
- Mutation, validation, disabled states, and button labels remain identical.
- Desktop rendering is unchanged (button stays inline in the card).
- Only the mobile presentation is adjusted.
