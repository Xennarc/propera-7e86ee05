
# Guest List Mobile Accessibility Fixes

## Problem Summary

The `/staff/guests` page has multiple mobile usability issues causing content to overflow and be inaccessible:

1. **Toolbar overflow**: The `GuestListToolbar` contains too many elements on a single row with fixed widths (`min-w-[200px]` on search, `w-[180px]` on filter dropdown, `w-[160px]` on sort) that cause horizontal overflow
2. **Summary Strip**: Stat chips are wide and may overflow without proper containment
3. **Card layout**: Guest cards work well but the overall container lacks proper viewport constraints
4. **Bulk Action Bar**: Fixed at bottom with `left-1/2 -translate-x-1/2` positioning may conflict with mobile bottom nav
5. **Missing keyboard safety**: The page doesn't account for on-screen keyboard when searching

---

## Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Stack on mobile** | Toolbar elements stack vertically on xs/sm screens |
| **Full-width inputs** | Search and filters use full width on mobile |
| **Contained scroll** | Summary strip and card list scroll independently |
| **Safe positioning** | Bulk action bar respects bottom nav and keyboard |
| **Touch targets** | All interactive elements 44px+ |

---

## Implementation Plan

### Phase 1: Toolbar Mobile Redesign

**File: `src/components/guests/GuestListToolbar.tsx`**

Current issue: All elements in a single flex row with fixed min-widths causing overflow.

Changes:
1. Stack toolbar into 2-3 rows on mobile:
   - Row 1: Search input (full width)
   - Row 2: Filter dropdown + Sort + Density toggle
   - Row 3 (conditional): Active filter badges
2. Remove fixed widths on mobile, use responsive widths
3. Ensure touch targets are 44px+

```text
MOBILE LAYOUT:
┌─────────────────────────────────────────┐
│ [Search........................] [Clear]│
├─────────────────────────────────────────┤
│ [All Guests ▼]  [Sort ▼]  [⊞] [⚙ +2]   │
├─────────────────────────────────────────┤
│ Active: [VIP ×] [In-House ×]            │
└─────────────────────────────────────────┘
```

Key changes:
- Line 141: Change `flex flex-wrap` to a responsive column layout
- Line 173: Change `min-w-[200px]` to `w-full sm:min-w-[200px] sm:flex-1`
- Line 144: Change `w-[180px]` to `w-full sm:w-[180px]`
- Line 236: Change `w-[160px]` to `flex-1 sm:w-[160px]`

### Phase 2: Summary Strip Containment

**File: `src/components/guests/GuestsSummaryStrip.tsx`**

The component already has `overflow-x-auto` and `snap-x` which is good. Enhance with:
1. Add `flex-nowrap` to prevent wrapping
2. Ensure chips have consistent minimum touch target sizes (44px height)
3. Add gradient fade on edges to indicate scrollability

Key changes:
- Line 116-117: Increase button padding from `px-3 py-2` to `px-4 py-2.5` for better touch targets

### Phase 3: Card Container Scroll

**File: `src/pages/guests/GuestsPage.tsx`**

Add proper scroll containment for the guest card list on mobile:

1. Wrap the mobile cards in a container with `overflow-y-auto` and max height
2. Ensure cards don't trigger horizontal scroll

Key changes:
- Line 391-408: Wrap in ScrollArea with proper height constraints
- Change `p-3 space-y-3` to `p-3 space-y-3 overflow-x-hidden`

### Phase 4: Bulk Action Bar Safety

**File: `src/components/guests/GuestBulkActionBar.tsx`**

Current issue: Fixed at `bottom-4` which conflicts with mobile bottom nav (approx 80px tall).

Changes:
1. Use keyboard inset hook for keyboard awareness
2. Add proper bottom offset on mobile to sit above MobileBottomNav
3. Use `pb-[env(safe-area-inset-bottom)]` for notch devices

Key changes:
- Line 88-95: Add responsive bottom positioning
- Change `bottom-4` to `bottom-20 lg:bottom-4` to clear mobile nav
- Add keyboard awareness with `useKeyboardInset`

### Phase 5: Guest Card Row Optimization

**File: `src/components/guests/GuestCardRow.tsx`**

Minor refinements:
1. Ensure text doesn't overflow card boundaries
2. Add `overflow-hidden` to prevent any text leaks
3. Ensure the preview button has proper touch target

Key changes:
- Line 83: Add `overflow-hidden` to main container
- Line 133: Add `overflow-hidden truncate` to name container for very long names

### Phase 6: Preview Drawer Mobile Safety

**File: `src/components/guests/GuestPreviewDrawer.tsx`**

Already well structured with flex layout. Minor enhancement:
1. Ensure footer respects safe area inset

Key changes:
- Line 296: Add `pb-[env(safe-area-inset-bottom)]` to SheetFooter

---

## Files to Modify

| File | Change Type | Priority |
|------|-------------|----------|
| `src/components/guests/GuestListToolbar.tsx` | Major - stack layout on mobile | High |
| `src/pages/guests/GuestsPage.tsx` | Medium - scroll containment | High |
| `src/components/guests/GuestBulkActionBar.tsx` | Medium - safe positioning | High |
| `src/components/guests/GuestsSummaryStrip.tsx` | Minor - touch target sizes | Medium |
| `src/components/guests/GuestCardRow.tsx` | Minor - overflow prevention | Medium |
| `src/components/guests/GuestPreviewDrawer.tsx` | Minor - safe area footer | Low |

---

## Detailed Code Changes

### GuestListToolbar.tsx - Mobile Stack Layout

```tsx
// Current (line 139):
<div className={cn('space-y-3', className)}>
  <div className="flex flex-wrap items-center gap-2">

// Change to:
<div className={cn('space-y-3', className)}>
  {/* Search row - full width on mobile */}
  <div className="flex gap-2">
    <SearchInput
      value={search}
      onChange={onSearchChange}
      placeholder="Search name, room, email..."
      className="flex-1"
    />
    {hasActiveFilters && (
      <Button
        variant="ghost"
        size="icon"
        onClick={onClearFilters}
        className="shrink-0 h-10 w-10"
      >
        <X className="h-4 w-4" />
      </Button>
    )}
  </div>
  
  {/* Filters row - wraps on mobile */}
  <div className="flex flex-wrap items-center gap-2">
    {/* Filter dropdown */}
    <Select ...>
      <SelectTrigger className="w-full sm:w-[180px] h-10 bg-background">
        ...
      </SelectTrigger>
    </Select>
    
    {/* Sort */}
    <Select ...>
      <SelectTrigger className="flex-1 sm:flex-none sm:w-[160px] h-10 bg-background">
        ...
      </SelectTrigger>
    </Select>
    
    {/* Filters popover + Density toggle */}
    <div className="flex items-center gap-2 ml-auto">
      <Popover>...</Popover>
      <Button variant="outline" size="icon" className="h-10 w-10">...</Button>
    </div>
  </div>
```

### GuestBulkActionBar.tsx - Safe Positioning

```tsx
// Current (line 88-95):
<div
  className={cn(
    'fixed bottom-4 left-1/2 -translate-x-1/2 z-50',
    ...
  )}
>

// Change to:
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

export const GuestBulkActionBar = memo(function GuestBulkActionBar({...}) {
  const { keyboardInset, isKeyboardOpen } = useKeyboardInset();
  
  // Hide when keyboard is open to not conflict with input
  if (isKeyboardOpen) return null;
  
  return (
    <div
      className={cn(
        'fixed left-1/2 -translate-x-1/2 z-40',
        // Sit above mobile nav on mobile, normal on desktop
        'bottom-20 lg:bottom-4',
        'pb-[env(safe-area-inset-bottom)]',
        ...
      )}
    >
```

### GuestsPage.tsx - Mobile Card Container

```tsx
// Current (line 391-408):
{isMobile && (
  <div className="p-3 space-y-3">
    {filteredGuests...}
  </div>
)}

// Change to:
{isMobile && (
  <div className="overflow-x-hidden">
    <div className="p-3 space-y-3 pb-24">
      {filteredGuests
        .filter(...)
        .map(guest => (
          <GuestCardRow ... />
        ))}
    </div>
  </div>
)}
```

---

## Testing Checklist

After implementation, verify on mobile:

- [ ] Toolbar doesn't overflow horizontally
- [ ] Search input is full width and usable
- [ ] Filter/sort dropdowns are accessible
- [ ] Summary strip scrolls horizontally with snap points
- [ ] Guest cards display all information without cutoff
- [ ] Tapping a card navigates to detail page
- [ ] Preview button (eye icon) has adequate touch target
- [ ] Bulk action bar sits above mobile bottom nav
- [ ] Keyboard doesn't overlap search input
- [ ] No pinch-zoom required to read content
- [ ] No horizontal scroll at any point

---

## Summary

This plan fixes mobile accessibility on the Guests page by:

1. **Stacking the toolbar** - Search goes full-width, filters wrap below
2. **Containing scroll** - Cards scroll vertically within bounds
3. **Safe positioning** - Bulk actions clear the mobile nav
4. **Touch optimization** - All targets meet 44px minimum
5. **Overflow prevention** - No horizontal scroll leaks

All changes are UI/layout only - no business logic, data fetching, or component behavior will be modified.
