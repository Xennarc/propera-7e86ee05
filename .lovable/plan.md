
# /staff/guests UI Overhaul — Implementation Plan

## Current State Analysis

### Existing Architecture (Must Preserve)
| Component | Purpose | Location |
|-----------|---------|----------|
| `GuestsPage.tsx` | Main page (642 lines) | `src/pages/guests/` |
| `useGuestsQuery` | React Query data fetching | `src/hooks/useGuestsQuery.ts` |
| `useGuestMutations` | Delete/update mutations | `src/hooks/useGuestMutations.ts` |
| `usePrearrivalStatuses` | Enhanced guest flags | `src/hooks/usePrearrivalStatus.ts` |
| `DataTable` | Current table component | `src/components/ui/data-table.tsx` |
| `GuestPrearrivalQuickFlags` | Operational icons | `src/components/guests/` |

### Current Filters & Data Flow
- Filter types: `all | in-house | arrivals | departures | prearrival-pending | prearrival-completed | has-allergies | arriving-72h`
- Search: name, room_number, booking_reference
- Data hooks: `useGuestsQuery`, `usePrearrivalStatuses`, prearrival settings query
- Navigation: `navigate(/guests/${guest.id})`

### Guest Object Shape (Key Fields)
```typescript
interface Guest {
  id, resort_id, full_name, room_number
  check_in_date, check_out_date
  nationality, email, phone
  booking_reference, channel
  notes, notes_internal
  loyalty_tier, is_vip
  portal_enabled, portal_pin_last4
}
```

---

## Phase 1: New Component Architecture

### A. New Files to Create

| File | Purpose |
|------|---------|
| `src/components/guests/GuestsSummaryStrip.tsx` | Clickable stat chips for quick filtering |
| `src/components/guests/GuestListToolbar.tsx` | Enhanced filter bar with multi-select, sorting, density |
| `src/components/guests/GuestRow.tsx` | Memoized desktop row with hover actions |
| `src/components/guests/GuestCardRow.tsx` | Mobile-optimized card with swipe hints |
| `src/components/guests/GuestPreviewDrawer.tsx` | Right-side quick preview sheet |
| `src/components/guests/GuestBulkActionBar.tsx` | Sticky bar for selected items |
| `src/hooks/useGuestListPreferences.ts` | localStorage persistence for density, sort |
| `src/hooks/useGuestFilters.ts` | Centralized filter state management |

### B. Files to Modify

| File | Change |
|------|--------|
| `src/pages/guests/GuestsPage.tsx` | Replace DataTable with new components, integrate toolbar |
| `src/components/ui/data-table.tsx` | No changes (preserve for other pages) |

---

## Phase 2: Detailed Component Specifications

### A. GuestsSummaryStrip

A horizontal strip of clickable stat cards that act as quick filters.

```text
┌────────────────────────────────────────────────────────────────────┐
│ [Arriving Today: 5] [In-House: 24] [Checking Out: 3] [VIPs: 2] │
└────────────────────────────────────────────────────────────────────┘
```

**Implementation:**
- Reuse existing `stats` calculation from GuestsPage
- Each card is a button that sets the corresponding filter
- Active filter card has primary ring/glow
- Mobile: horizontal scroll with snap points
- Uses existing `StatCard` variant or new compact chips

**Props:**
```typescript
interface GuestsSummaryStripProps {
  stats: {
    arrivingToday: number;
    inHouse: number;
    checkingOutToday: number;
    preArrivals: number;
    vips: number;
  };
  activeFilter: GuestFilter;
  onFilterChange: (filter: GuestFilter) => void;
}
```

### B. GuestListToolbar

Unified filter bar with search, multi-select filters, sorting, and density toggle.

**Structure:**
```text
┌────────────────────────────────────────────────────────────────────┐
│ [Search...] [Status ▼] [Date ▼] [Flags ▼] [Sort ▼] [≡ Comfy/□] │
├────────────────────────────────────────────────────────────────────┤
│ Active: Status: In-House × Date: Jan 1-15 × [Clear all] │
└────────────────────────────────────────────────────────────────────┘
```

**Features:**
1. **Search** (debounced 300ms): name, room, email, booking ref
2. **Status Multi-Select**: Pre-Arrival, Arriving Today, In-House, Checking Out Today, Checked Out
3. **Date Filters**: Arrival range picker, Departure range picker
4. **Flags Filters**: VIP, Allergy, Dietary, Transfer, Special Occasion, Late Arrival
5. **Sort Options**: Arrival date (asc/desc), Departure, Room, Name, VIP first
6. **Density Toggle**: Compact / Comfortable (saved to localStorage)

**Uses existing components:**
- `SearchInput`, `Select`, `Popover`, `Checkbox`
- New: `EnhancedFilterBar`, `ActiveFilters`, `FilterChip`

### C. GuestRow (Desktop)

Memoized table row with strong visual hierarchy.

**Column Layout:**
```text
│ □ │ 👤 Name + VIP/Loyalty │ Room │ Status + Countdown │ Dates │ Nights │ Flags │ ⋮ │
```

**Hierarchy:**
- **Primary**: Guest name (font-semibold) + Room (monospace badge)
- **Secondary**: Status pill with countdown ("Arrives in 2d", "Departs today")
- **Tertiary**: Flag icons with tooltips (allergy, dietary, transfer, occasion, late)

**Hover Actions (revealed on hover):**
- Eye icon: Open preview drawer
- External link: Open full detail
- Copy: Copy booking ref
- Phone/Mail: Direct contact (if available)
- Key: Reset PIN (permission-gated)

**Room Pill Enhancement:**
- Click-to-copy with toast feedback
- Monospace font for readability

### D. GuestCardRow (Mobile)

Card layout for touch-friendly mobile experience.

**Structure:**
```text
┌──────────────────────────────────────────────┐
│ 👤 John Smith ⭐ [Room 105] │
│ Arriving in 2d • Jan 25 - Jan 30 (5n) │
│ [🍽️] [⚠️] [🚗] │
│ [View Details] │
└──────────────────────────────────────────────┘
```

**Features:**
- Checkbox in top-left for bulk select
- Tap row opens detail page (existing behavior)
- Preview button opens drawer
- Flag icons as compact row

### E. GuestPreviewDrawer

Right-side sheet for quick guest preview without navigation.

**Design:** Uses existing `Sheet` pattern from `StaffBookingPreviewSheet`

**Content Sections:**
1. **Header**: Guest name + VIP/loyalty badges + status pill
2. **Stay Info**: Room, dates, nights, channel, booking ref
3. **Contact**: Phone, email with quick action buttons
4. **Operational Flags**: Allergy, dietary, transfer, occasion, late arrival (expanded)
5. **Pre-Arrival Status**: Progress indicator + completion date
6. **Latest Notes**: Internal notes preview
7. **Quick Actions**: Edit, Send Pre-Arrival, Reset PIN, Add Note

**Footer Button:** "Open Full Guest Profile" (navigates to detail page)

**Props:**
```typescript
interface GuestPreviewDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest: Guest | null;
  prearrivalStatus?: GuestPrearrivalStatus;
  onEdit: () => void;
  onNavigateToDetail: () => void;
}
```

### F. GuestBulkActionBar

Sticky bottom bar when items are selected.

**Structure:**
```text
┌────────────────────────────────────────────────────────────────────┐
│ 5 guests selected [Copy Names] [Copy Rooms] [Export CSV] [×] │
└────────────────────────────────────────────────────────────────────┘
```

**Actions:**
- Copy names (clipboard)
- Copy rooms (clipboard)
- Export CSV (client-side only)
- Send Pre-Arrival (if prearrival enabled, future arrivals)
- Clear selection

---

## Phase 3: State Management

### useGuestFilters Hook

Centralized filter state with URL sync (optional enhancement).

```typescript
interface GuestFiltersState {
  search: string;
  statusFilters: GuestStatusFilter[];
  arrivalDateRange: { from: Date | null; to: Date | null };
  departureDateRange: { from: Date | null; to: Date | null };
  flagFilters: GuestFlagFilter[];
  sortBy: GuestSortOption;
  sortOrder: 'asc' | 'desc';
}

type GuestStatusFilter = 'pre-arrival' | 'arriving-today' | 'in-house' | 'checking-out-today' | 'checked-out';
type GuestFlagFilter = 'vip' | 'allergy' | 'dietary' | 'transfer' | 'occasion' | 'late-arrival';
type GuestSortOption = 'arrival' | 'departure' | 'room' | 'name' | 'vip-first';
```

### useGuestListPreferences Hook

localStorage persistence for UI preferences.

```typescript
interface GuestListPreferences {
  density: 'compact' | 'comfortable';
  defaultSort: GuestSortOption;
}
```

---

## Phase 4: Performance Optimizations

### A. Memoization Strategy

```typescript
// GuestRow wrapped with React.memo
const GuestRow = React.memo(function GuestRow({ guest, ... }) {
  // ...
}, (prev, next) => prev.guest.id === next.guest.id && prev.guest.updated_at === next.guest.updated_at);
```

### B. Large List Handling

**Option 1: Pagination (Recommended)**
- Keep existing query, add limit/offset
- Show pagination controls at bottom
- Smoother experience for most use cases

**Option 2: Virtual Scrolling**
- Use react-virtual for 500+ guest scenarios
- More complex, only if pagination insufficient

**Implementation:** Start with client-side pagination (50 per page), upgrade to server-side if needed.

### C. Debounced Filtering

All filter changes debounced at 300ms to prevent query spam.

---

## Phase 5: Keyboard & Accessibility

### Keyboard Navigation
- `Arrow Down/Up`: Move between rows
- `Enter`: Open guest detail page
- `Space`: Toggle row selection
- `Shift+Enter`: Open preview drawer
- `Escape`: Close preview drawer
- `Ctrl+C` on row: Copy booking reference

### ARIA Enhancements
- `role="grid"` on table
- `aria-selected` on selectable rows
- `aria-label` on all icon buttons
- Focus visible rings on all interactive elements

### Color Independence
- Status pills use icons in addition to color
- Flag icons always have text tooltips
- VIP uses star icon, not just gold color

---

## Phase 6: Visual Polish

### Typography Hierarchy
- Guest name: `text-base font-semibold`
- Room: `font-mono text-sm bg-muted px-2 py-0.5 rounded`
- Status pill: Existing Badge component
- Secondary info: `text-sm text-muted-foreground`
- Flag icons: `h-4 w-4` with tooltips

### Spacing (Propera Design Language)
- Comfortable density: `py-4 px-4` cells
- Compact density: `py-2 px-3` cells
- Card rows: `p-4` with `gap-3` internal spacing

### Status Pills with Countdown
```typescript
function getStatusWithCountdown(guest: Guest) {
  const checkIn = safeParseDateISO(guest.check_in_date);
  const checkOut = safeParseDateISO(guest.check_out_date);
  const today = startOfDay(new Date());
  
  if (isToday(checkIn)) return { label: 'Arriving Today', variant: 'success' };
  if (isToday(checkOut)) return { label: 'Departing Today', variant: 'warning' };
  if (isWithinInterval(today, { start: checkIn, end: checkOut })) {
    const daysLeft = differenceInDays(checkOut, today);
    return { label: `In-House (${daysLeft}d left)`, variant: 'confirmed' };
  }
  if (isBefore(today, checkIn)) {
    const daysUntil = differenceInDays(checkIn, today);
    return { label: `Arrives in ${daysUntil}d`, variant: 'pending' };
  }
  return { label: 'Checked Out', variant: 'secondary' };
}
```

---

## Implementation Order

### Step 1: Foundation Hooks
1. Create `useGuestFilters.ts`
2. Create `useGuestListPreferences.ts`

### Step 2: UI Components (Bottom-Up)
1. `GuestRow.tsx` - Desktop table row
2. `GuestCardRow.tsx` - Mobile card row
3. `GuestsSummaryStrip.tsx` - Stat chips
4. `GuestListToolbar.tsx` - Filter bar
5. `GuestPreviewDrawer.tsx` - Side sheet
6. `GuestBulkActionBar.tsx` - Bulk actions

### Step 3: Integration
1. Update `GuestsPage.tsx` to use new components
2. Wire up all filters and state
3. Connect preview drawer
4. Add bulk selection logic

### Step 4: Polish
1. Add keyboard navigation
2. Skeletons and empty states
3. Density toggle
4. Performance testing

---

## Regression Prevention Checklist

| Existing Behavior | How Preserved |
|-------------------|---------------|
| Row click opens detail page | Same `navigate(/guests/${guest.id})` |
| Search by name/room/ref | Enhanced, not replaced |
| Filter by status | Enhanced with multi-select |
| Pre-arrival columns | Kept, enhanced with flags |
| Selection checkboxes | Kept, enhanced with bulk bar |
| Send pre-arrival email | Kept on bulk bar + row actions |
| Delete guest | Kept in row actions |
| Edit guest dialog | Kept, accessible from row + drawer |
| Demo mode restrictions | `useDemoReadOnly` still applied |
| Error boundary | Kept wrapping page |

---

## Manual QA Checklist

### Core Functionality
- [ ] Navigate to `/staff/guests` as Super Admin
- [ ] Guest list loads with stats strip
- [ ] Click stat chip filters the list
- [ ] Search filters in real-time (debounced)
- [ ] Multi-select status filter works
- [ ] Date range filters work
- [ ] Flag filters work (VIP, Allergy, etc.)
- [ ] Sort by each option works
- [ ] Click row opens guest detail page
- [ ] Preview icon opens drawer (not navigation)
- [ ] Edit from drawer opens dialog
- [ ] Copy room number shows toast
- [ ] Bulk select multiple guests
- [ ] Bulk actions work (copy, export)
- [ ] Clear selection works

### Responsive & Mobile
- [ ] Mobile view shows card layout
- [ ] Cards are tappable with clear hit areas
- [ ] Toolbar collapses gracefully on mobile
- [ ] Summary strip scrolls horizontally
- [ ] Drawer works on mobile

### Performance
- [ ] 50+ guests loads without lag
- [ ] Filtering is smooth (no jank)
- [ ] Switching density doesn't cause layout shift

### Accessibility
- [ ] All icons have tooltips
- [ ] Keyboard navigation works
- [ ] Focus states visible
- [ ] Screen reader announces row content

### Edge Cases
- [ ] Empty state shows when no guests
- [ ] Empty state shows when filters match nothing
- [ ] Loading skeleton shows during fetch
- [ ] Error state shows on fetch failure
- [ ] Pre-arrival disabled hides related filters

---

## Summary

This UI overhaul transforms `/staff/guests` into a high-performance, operationally-focused interface while preserving all existing functionality. The modular component architecture ensures maintainability, and the phased implementation allows for incremental testing.

**Key Improvements:**
1. Instant scannability with status countdowns and flag icons
2. Powerful filtering without query spam
3. Quick preview without page navigation
4. Bulk actions for efficiency
5. Mobile-first responsive design
6. Accessibility and keyboard support
