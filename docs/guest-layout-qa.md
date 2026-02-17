# Guest Portal Layout QA Checklist

> Repeatable test plan for verifying bottom-safe padding, scroll behaviour, and sticky bar stacking across the Guest Portal.

## Debug Mode

Add `?debugLayout=1` to any guest URL to activate the layout debug overlay:
- Shows all CSS variable values (nav height, safe-area, overlay height, keyboard inset)
- Draws a translucent red band at the bottom showing the reserved safe zone
- Works alongside `?debug=1` (general debug console)

---

## Device Matrix

| Device | Viewport | Safe-area? | Notes |
|---|---|---|---|
| iPhone SE (3rd gen) | 375×667 | No notch | Smallest supported |
| iPhone 14/15 | 390×844 | Notch/Dynamic Island | Home indicator safe-area |
| iPhone 15 Pro Max | 430×932 | Dynamic Island | Large screen + safe-area |
| Android small (Pixel 4a) | 393×851 | No | Standard Android |
| Android large (Pixel 7 Pro) | 412×892 | No | Large Android |

---

## Pages to Test

### 1. Activities Booking Confirm
**Route:** `/guest/activities/:id` → tap "Book Now"
- [ ] StickyActionBar visible above bottom nav
- [ ] With keyboard open (party size input), CTA still tappable
- [ ] Last form field scrollable into view above sticky bar
- [ ] No double safe-area gap on notched devices

### 2. Requests Selection + Review
**Route:** `/guest/requests`
- [ ] Select 2+ items → RequestsStickyBar appears with animation
- [ ] Bar sits above bottom nav, not overlapping
- [ ] "Send now" and "Review" buttons tappable
- [ ] Deselect all → bar dismisses cleanly
- [ ] Page content scrolls fully to bottom (last item visible)

### 3. Buggy Request Form
**Route:** `/guest/buggy`
- [ ] Form fields all reachable by scrolling
- [ ] Submit button visible (in card, not behind nav)
- [ ] With keyboard open on text inputs, form doesn't jump/flash

### 4. My Bookings List
**Route:** `/guest/my-bookings`
- [ ] Last booking card fully visible when scrolled to bottom
- [ ] No content hidden behind bottom nav
- [ ] Tab switching doesn't cause scroll position issues

### 5. Restaurant Booking
**Route:** `/guest/restaurants/:id`
- [ ] Full page scrollable to bottom
- [ ] CTA button accessible
- [ ] Date/time pickers don't cause layout shift

### 6. Profile Page
**Route:** `/guest/profile`
- [ ] All sections visible by scrolling
- [ ] Bottom of page has breathing room above nav

---

## Keyboard Tests (iOS + Android)

For each page with text inputs:

1. [ ] Tap input → keyboard opens → focused input visible (not behind sticky bar)
2. [ ] StickyActionBar translates up above keyboard (if present)
3. [ ] Tap outside / press Done → keyboard closes → layout returns to normal
4. [ ] No jitter/flash during keyboard open/close animation
5. [ ] Rotating device while keyboard is open doesn't break layout

---

## Common Failures to Watch For

| Symptom | Likely Cause |
|---|---|
| Content hidden behind nav | Missing `GuestPageShell` wrapper |
| Double gap on notched devices | Safe-area applied twice (check CSS vars) |
| Sticky bar overlaps nav | Wrong `bottom` value (should use `--guest-overlay-bottom`) |
| Input zooms page on iOS | Font size < 16px on mobile |
| Scroll stuck / bounces | Nested `overflow-y-auto` containers (scroll trap) |
| Layout jumps on keyboard open | Using `100vh` instead of `100dvh` |

---

## How to Verify with Debug Overlay

1. Navigate to page with `?debugLayout=1`
2. Check the overlay panel values:
   - `nav-h` should be `72px`
   - `safe-area-b` should be `0px` (non-notched) or ~`34px` (notched)
   - `overlay-h` should match active sticky bar height (0/64/80)
   - `safe-bottom` should equal `nav-h + safe-area-b + 32px + overlay-h`
3. The red band at bottom should cover exactly the reserved zone
4. Scroll to bottom — last content item should be fully above the red band
