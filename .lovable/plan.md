

## Audit Summary and Cleanup Plan

### Per-Page Findings

| Page | GuestPageShell? | Legacy Code Found | Issues |
|------|----------------|-------------------|--------|
| **GuestHome** | Yes | None | Clean |
| **GuestActivitiesBrowser** | Yes | None | Clean |
| **GuestBuggyRequestPage** | Yes (main return) | None | Early returns (pre-arrival, feature-disabled, loading) are NOT wrapped in GuestPageShell -- content may lack proper bottom padding on those states |
| **GuestRestaurantBrowser (Dining)** | Yes | None | Clean |
| **GuestRequestsPage** | Yes, with dynamic overlay | None | Clean |
| **GuestMyBookings** | Yes | None | Clean |
| **GuestActivityBookingPage** | Yes, overlay="action" | `StickyActionBarSpacer` on line 815 | Redundant spacer -- GuestPageShell already handles bottom padding via `overlay="action"` |

### Changes Required

#### 1. GuestActivityBookingPage -- Remove redundant StickyActionBarSpacer

- **Line 815**: Remove `<StickyActionBarSpacer />` -- it is unnecessary because `GuestPageShell overlay="action"` already provides the correct bottom padding.
- **Line 31**: Remove `StickyActionBarSpacer` from the import (keep `StickyActionBar`).

#### 2. GuestBuggyRequestPage -- Wrap early returns in GuestPageShell

Three early-return branches (pre-arrival, feature-disabled, loading) render content without `GuestPageShell`, meaning they lack safe bottom padding on mobile. Wrap each in `<GuestPageShell>` so the layout contract applies uniformly.

#### 3. Legacy CSS classes -- Safe to keep (no action)

`.guest-safe-bottom` and `.guest-safe-bottom-extended` are defined in `index.css` but are NOT used by any component or page. They exist only for backward compatibility per the additive philosophy. No removal needed now.

#### 4. StickyActionBarSpacer export -- Safe to keep (no action)

The `StickyActionBarSpacer` component in `StickyActionBar.tsx` still exports the spacer function. After this cleanup it will have zero usages, but per the additive-only philosophy, we keep it (it already has a deprecation note in its JSDoc).

### Technical Details

**File: `src/pages/guest/GuestActivityBookingPage.tsx`**
- Line 31: Change import from `{ StickyActionBar, StickyActionBarSpacer }` to `{ StickyActionBar }`
- Line 815: Delete `<StickyActionBarSpacer />`

**File: `src/pages/guest/GuestBuggyRequestPage.tsx`**
- Lines 57-72 (pre-arrival return): Wrap `<motion.div>` in `<GuestPageShell>`
- Lines 76-92 (feature-disabled return): Wrap `<motion.div>` in `<GuestPageShell>`
- Lines 96-107 (loading return): Wrap `<div>` in `<GuestPageShell>`

Total: 2 files modified, minimal diffs, no functional changes.

