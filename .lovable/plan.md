
# Guest List Mobile Horizontal Overflow - Root Cause Analysis & Fix

## Problem Diagnosis

After analyzing the codebase and layout structure, the persistent horizontal overflow on mobile is caused by **multiple compounding spacing issues**:

### Root Causes

1. **Excessive horizontal padding in `GuestCardRow`**
   - Card base padding: `p-4` = 16px × 2 = 32px
   - Selection mode adds: `pl-8` = 32px additional left padding
   - Name row reserves space for preview button: `pr-10` = 40px
   - **Total horizontal space consumed: 32px (base) + 32px (selection) + 40px (preview) = 104px**
   - On a 375px iPhone SE, this leaves only ~271px for actual content

2. **Absolute positioned elements creating layout conflicts**
   - Preview button (top-right, line 112-129) is absolutely positioned
   - Chevron indicator (right-center, line 188) is also absolutely positioned
   - Both elements use `right-` positioning which can push content when flex containers don't have proper constraints

3. **`StaffShell` padding reducing available viewport**
   - Line 148: `p-3` on mobile = 12px × 2 = 24px horizontal space consumed
   - This compounds with card internal padding

4. **Flex layout without proper min-width constraints**
   - The name row (line 134) uses `pr-10` to avoid overlap with the preview button
   - When content wraps, the `pr-10` creates unnecessary space
   - The status badge and room button can wrap unexpectedly, causing the row to expand

5. **Missing viewport-relative constraints**
   - All spacing uses fixed pixel values (`p-4`, `pr-10`, etc.)
   - No use of percentage-based spacing for mobile breakpoints

---

## Solution Strategy

### Phase 1: Reduce GuestCardRow Padding (High Priority)

**Target: `src/components/guests/GuestCardRow.tsx`**

Changes:
1. Reduce base card padding from `p-4` to `p-3` on mobile (12px vs 16px = 8px saved)
2. Reduce name row right padding from `pr-10` to `pr-8` on mobile (32px vs 40px = 8px saved)
3. Optimize selection left padding from `pl-8` to `pl-6` when selection is active (24px vs 32px = 8px saved)
4. **Total savings: 24px on mobile**, increasing content area from 271px to ~295px

```tsx
// Line 79-96: Card container
<div
  onClick={onNavigate}
  className={cn(
    'relative bg-card border border-border/40 rounded-xl cursor-pointer',
    'w-full max-w-full overflow-hidden box-border',
    // Responsive padding: tighter on mobile
    'p-3 sm:p-4',
    'transition-all duration-200',
    'hover:bg-accent/30 hover:border-border/60',
    'hover:shadow-soft',
    'active:scale-[0.98]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
    isSelected && 'ring-2 ring-primary/30 bg-primary/5 border-primary/30'
  )}
>

// Line 132: Main content with responsive selection offset
<div className={cn(
  'space-y-3 min-w-0 overflow-hidden w-full max-w-full',
  showSelection && 'pl-6 sm:pl-8'  // Reduced from pl-8
)}>

// Line 134: Name row with responsive padding
<div className="flex items-center gap-2 pr-8 sm:pr-10 overflow-hidden min-w-0 w-full">
```

### Phase 2: Optimize Absolute Positioned Elements

**Target: `src/components/guests/GuestCardRow.tsx`**

Changes:
1. Move preview button positioning from `top-3 right-3` to `top-2.5 right-2.5` on mobile
2. Reduce chevron size from `h-5 w-5` to `h-4 w-4` on mobile
3. Adjust chevron right offset from `right-4` to `right-3` on mobile

```tsx
// Line 112-129: Preview button with responsive positioning
<div 
  className="absolute top-2.5 sm:top-3 right-2.5 sm:right-3 flex items-center gap-1"
  onClick={(e) => e.stopPropagation()}
>
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 sm:h-8 sm:w-8"  // Slightly smaller on mobile
        onClick={onPreview}
      >
        <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </Button>
    </TooltipTrigger>
    <TooltipContent>Quick preview</TooltipContent>
  </Tooltip>
</div>

// Line 188: Chevron with responsive sizing
<ChevronRight className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground/50" />
```

### Phase 3: Constrain GuestListToolbar Width

**Target: `src/components/guests/GuestListToolbar.tsx`**

Issue: The toolbar is inside a `p-4` padding wrapper (GuestsPage.tsx line 299), which on mobile adds 16px × 2 = 32px. This can cause the toolbar elements to overflow.

Changes:
1. Ensure search input properly shrinks with `min-w-0`
2. Add maximum widths to filter dropdowns on extra-small screens

```tsx
// Line 141-147: Search row with proper constraints
<div className="flex gap-2 w-full max-w-full min-w-0">
  <SearchInput
    value={search}
    onChange={onSearchChange}
    placeholder="Search name, room, email..."
    className="flex-1 min-w-0"  // Add min-w-0
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

// Line 163-166: Filter dropdown with tighter mobile width
<Select value={legacyFilter} onValueChange={(v) => onLegacyFilterChange(v as LegacyGuestFilter)}>
  <SelectTrigger className="w-full xs:w-auto xs:min-w-[140px] sm:w-[180px] h-10 bg-background">
    <SelectValue />
  </SelectTrigger>
</Select>
```

### Phase 4: Reduce Toolbar Container Padding on Mobile

**Target: `src/pages/guests/GuestsPage.tsx`**

The toolbar wrapper (line 299) uses `p-4` which adds 16px × 2 on mobile. Reduce to `p-3` to match `StaffShell` padding.

```tsx
// Line 299: Toolbar with responsive padding
<div className="p-3 sm:p-4 border-b border-border/50">
  <GuestListToolbar ... />
</div>
```

### Phase 5: Add Explicit Width Constraint to Card

**Target: `src/pages/guests/GuestsPage.tsx`**

Ensure the main Card respects the viewport width and doesn't expand beyond it.

```tsx
// Line 296: Card with explicit width constraint
<Card className="overflow-hidden w-full max-w-full">
```

---

## Implementation Priority

| Phase | File | Change | Impact | Effort |
|-------|------|--------|--------|--------|
| 1 | `GuestCardRow.tsx` | Reduce padding from `p-4` to `p-3 sm:p-4` | High - saves 24px | Low |
| 2 | `GuestCardRow.tsx` | Responsive positioning for absolute elements | Medium | Low |
| 3 | `GuestListToolbar.tsx` | Add `min-w-0` to search, constrain filters | Medium | Low |
| 4 | `GuestsPage.tsx` | Reduce toolbar padding `p-3 sm:p-4` | Medium | Low |
| 5 | `GuestsPage.tsx` | Add `max-w-full` to Card | Low - safety net | Low |

---

## Expected Outcome

After all changes:

### Available Width Calculation (375px iPhone SE)
```
Viewport width:                375px
StaffShell padding (p-3):     -24px  (12px × 2)
Card border:                   -2px
Guest card padding (p-3):     -24px  (12px × 2)
Selection offset (pl-6):      -24px  (when active)
Name row padding (pr-8):      -32px
─────────────────────────────────────
Available for name/content:    269px ✓ (vs 245px before)

Total width savings:           24px
```

### Visual Result
```
┌────────────────────────────────────┐ 375px viewport
│ p-3 (12px)                         │
│ ┌────────────────────────────────┐ │
│ │ Card p-3 (12px)                │ │
│ │ ┌─────────────────────────────┐││
│ │ │☑ Jane Smith    Crown Star 👁│││ ← All visible
│ │ │ 205  In-House              ││││
│ │ │ Jan 20 – Jan 28 (8n)       ││││
│ │ └─────────────────────────────┘││
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

All content fits within viewport without:
- Horizontal scrolling
- Clipped text
- Overlapping elements
- Need to pinch-zoom

---

## Files to Modify

1. **`src/components/guests/GuestCardRow.tsx`** - Reduce padding, optimize absolute positioning
2. **`src/components/guests/GuestListToolbar.tsx`** - Add min-w-0 constraints, tighter mobile widths
3. **`src/pages/guests/GuestsPage.tsx`** - Reduce toolbar padding, add Card max-width safety

---

## Testing Checklist

After implementation, verify on:

- [ ] iPhone SE (375px width) - smallest common device
- [ ] iPhone 12/13/14 (390px width)
- [ ] Small Android (360px width)
- [ ] With prearrival enabled (selection checkboxes visible)
- [ ] With long guest names (e.g., "Alessandro Rodriguez Martinez")
- [ ] With VIP + Loyalty badges showing
- [ ] With search active (clear button visible)
- [ ] With multiple filters active
- [ ] In portrait and landscape orientations
- [ ] No horizontal scroll at any width
- [ ] All action buttons remain tappable
- [ ] Preview drawer opens correctly

---

## Summary

The fix focuses on **reducing cumulative padding** rather than changing the layout structure. By moving from fixed `p-4` padding to responsive `p-3 sm:p-4`, we save 8px per edge (24px total) on mobile, which is enough to prevent horizontal overflow on the smallest common viewport (375px iPhone SE).

All changes are **CSS-only** - no business logic, data handling, or component behavior modifications.
