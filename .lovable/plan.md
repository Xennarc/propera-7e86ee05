
# Systematically Apply New Mobile Components Across Guest Portal

## Context
You have created 4 reusable mobile UI components that are only currently used in `GuestBuggyRequestPage.tsx`:
- **MobilePageHeader**: Back button + title + optional subtitle and right actions
- **MobileCard**: Unified card container with optional accent strip for lists
- **StatusPill**: Standardized status badges with icon + label (not color-only)
- **StickyActionBar**: Bottom-sticky form action bar above bottom nav

The Guest Portal has 27 pages across activities, dining, bookings, requests, transport, profile, and notifications. Currently, most pages use manual headers, inconsistent card styling, and inline status badges.

## Objective
Replace manual header/card/status patterns across all relevant Guest Portal pages with the new components, ensuring consistent mobile UX, proper touch targets (44px+), and clean presentation.

## Pages to Refactor (Priority Order)

### Tier 1 - List/Detail Pages (Highest Impact)
These pages display lists or collection views:

1. **GuestMyBookings.tsx**
   - Replace manual header with MobilePageHeader
   - Replace Card-based booking items with MobileCard + MobileCardHeader/MobileCardMeta
   - Replace inline status badges with StatusPill (use bookingStatusToVariant helper)
   - Ensure cancel/edit buttons are 44px+ height
   - Add MobileCard accent color based on status

2. **GuestMyRequestsPage.tsx**
   - Replace manual "My Requests" heading with MobilePageHeader
   - Ensure RequestCard/RequestSubmissionCard use MobileCard internally (or wrap them)
   - Replace inline status indicators with StatusPill (use request status helper)
   - Verify filter button heights (currently h-8, should be h-10 for mobile)

3. **GuestMyRidesPage.tsx**
   - Replace ArrowLeft + heading combo with MobilePageHeader
   - Wrap BuggyRideCard output in MobileCard if needed
   - Replace inline status with StatusPill
   - Verify cancel button is 44px+

4. **GuestNotificationsPage.tsx**
   - Add MobilePageHeader with "Notifications" title
   - Replace Card-based NotificationItem with MobileCard
   - Replace inline type-based color badges with StatusPill variant system
   - Ensure notification items have proper touch targets

5. **GuestProfilePage.tsx**
   - Replace ArrowLeft + heading with MobilePageHeader
   - Replace inline Cards with consistent MobileCard styling
   - Ensure all buttons/interactive elements are 44px+

### Tier 2 - Browse/Catalog Pages (Medium Impact)
These pages have search/filter patterns:

6. **GuestActivitiesBrowser.tsx**
   - Replace inline Card-based session display with MobileCard
   - Use MobileCardHeader for title + badge (capacity, availability)
   - Use MobileCardMeta for time, location, duration
   - Add accent color for "CONFIRMED" vs "AVAILABLE" states

7. **GuestRestaurantBrowser.tsx**
   - Replace Card-based slot display with MobileCard
   - Use accent color for meal period (breakfast = orange, lunch = blue, etc.)
   - Ensure proper touch targets for "Book" actions

### Tier 3 - Detail/Form Pages (Lower Priority but Important)
These pages are single-view details or booking flows:

8. **GuestActivityDetailPage.tsx**
   - Replace manual header with MobilePageHeader
   - Ensure booking button is sticky and 44px+ height

9. **GuestRestaurantBookingPage.tsx**
   - Replace manual header with MobilePageHeader
   - Use StickyActionBar for "Confirm Booking" at bottom (above nav)

10. **GuestActivityBookingPage.tsx**
    - Same pattern as restaurant booking

11. **GuestRequestsPage.tsx**
    - Replace header with MobilePageHeader
    - Ensure category grid buttons are 44px+ height
    - Use StickyActionBar for "Submit" button

12. **GuestBuggyRequestPage.tsx** *(Already started)*
    - Already uses MobilePageHeader
    - Verify BuggyRequestForm integration with StickyActionBar
    - Polish accent colors and spacing

### Tier 4 - Secondary Pages
13. **GuestPrearrivalHome.tsx**, **GuestTravelPartyPage.tsx**, **GuestLoyaltyPage.tsx**, **GuestStayFeedback.tsx**
    - Replace headers with MobilePageHeader
    - Ensure consistent card styling (MobileCard)
    - Verify button heights

## Implementation Strategy

### Phase 1: Components Audit
- **Understand** existing component props and usage
- **Identify** which components wrap MobileCard (RequestCard, BuggyRideCard, etc.)
- **Plan** wrapping vs. internal refactoring (wrapping preferred to avoid breaking existing logic)

### Phase 2: Tier 1 - Core Lists
- Refactor GuestMyBookings, GuestMyRequestsPage, GuestMyRidesPage, GuestNotificationsPage
- Replace headers, cards, and status indicators
- Test filtering, sorting, and CTA functionality

### Phase 3: Tier 2 - Browse Pages
- Refactor browse/catalog pages (Activities, Restaurants)
- Ensure accent colors match category/status semantics
- Test search and filter interactions

### Phase 4: Tier 3 & 4 - Detail & Secondary Pages
- Refactor remaining pages systematically
- Add StickyActionBar where forms have long scrolling
- Ensure all interactive elements meet 44px touch target

## Technical Approach

**For each page:**
1. Keep all logic and state unchanged (UI-only refactor)
2. Replace header structure:
   ```tsx
   // OLD: <div className="flex items-center gap-3"> + <ArrowLeft> + <h1>
   // NEW: <MobilePageHeader title="..." showBack={true} />
   ```
3. Wrap list items in MobileCard:
   ```tsx
   <MobileCard onClick={() => navigate(...)} accentColor={statusColor}>
     <MobileCardHeader title={...} badge={<StatusPill {...} />} />
     <MobileCardMeta>{time} • {location}</MobileCardMeta>
   </MobileCard>
   ```
4. Replace status badges:
   ```tsx
   // OLD: <Badge variant="outline" className={statusClass}>{status}</Badge>
   // NEW: <StatusPill variant="confirmed" label="Confirmed" />
   ```

## Files Summary

| File | Component Changes |
|------|-------------------|
| `GuestMyBookings.tsx` | Header → MobilePageHeader, Cards → MobileCard, Badges → StatusPill |
| `GuestMyRequestsPage.tsx` | Header → MobilePageHeader, RequestCard wrapping, StatusPill |
| `GuestMyRidesPage.tsx` | Header → MobilePageHeader, BuggyRideCard wrapping, StatusPill |
| `GuestNotificationsPage.tsx` | Add MobilePageHeader, NotificationItem → MobileCard |
| `GuestProfilePage.tsx` | Header → MobilePageHeader, Card consistency |
| `GuestActivitiesBrowser.tsx` | Session items → MobileCard, accent colors |
| `GuestRestaurantBrowser.tsx` | Slot items → MobileCard, meal-period colors |
| `GuestActivityDetailPage.tsx` | Header → MobilePageHeader, button sizing |
| `GuestRestaurantBookingPage.tsx` | Header → MobilePageHeader, StickyActionBar |
| `GuestActivityBookingPage.tsx` | Header → MobilePageHeader, StickyActionBar |
| `GuestRequestsPage.tsx` | Header → MobilePageHeader, StickyActionBar |
| `GuestBuggyRequestPage.tsx` | Polish & verify StickyActionBar integration |
| Secondary pages | Header → MobilePageHeader, Card consistency |

## Success Criteria
✓ All Guest Portal pages use consistent MobilePageHeader for top navigation  
✓ All list items use MobileCard with proper spacing and touch targets  
✓ All status indicators use StatusPill (icon + label, not color-only)  
✓ Form actions use StickyActionBar (mobile-only, respects safe areas)  
✓ No horizontal scrolling on mobile (360px–414px widths)  
✓ Bottom nav never overlaps content  
✓ All buttons/interactive elements: 44px+ minimum  
✓ All existing business logic preserved (cancel, book, submit flows work identically)  

## Notes
- **Backward Compatibility**: All changes are additive CSS/component wrapping—no logic changes or route modifications
- **Safe Areas**: StickyActionBar and MobilePageHeader already handle iOS notches via env(safe-area-inset-bottom)
- **Testing**: After refactoring each tier, verify on 360px, 390px, and 414px viewports
- **Naming**: Use accentColor with semantic CSS classes (e.g., "bg-emerald-500", "bg-amber-500" for status)
