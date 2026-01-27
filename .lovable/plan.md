

# Fix Text Wrapping and Centering Issues Across Portals

## Problem Analysis

After exploring the codebase, I've identified several categories of text wrapping and centering issues that affect the premium feel of both the staff and guest portals:

### Issue Categories Found

| Issue Type | Description | Impact |
|------------|-------------|--------|
| **Missing `text-center` on centered containers** | Some flex containers with `items-center` lack proper text-center for multi-line text | Text appears left-aligned in visually centered areas |
| **Missing `whitespace-nowrap` on single-line labels** | Labels in badges, tabs, and buttons can wrap unexpectedly on narrow screens | UI elements break across lines awkwardly |
| **Inconsistent `truncate` usage** | Some titles truncate, others wrap, creating visual inconsistency | Mixed behavior confuses users |
| **Missing `min-w-0` on flex children** | Flex children with text don't properly truncate without `min-w-0` | Text overflows parent containers |
| **`text-xs` without `line-clamp` on descriptions** | Long descriptions wrap unpredictably | Inconsistent card heights and visual clutter |

---

## Affected Components

### Guest Portal

| Component | Issue | Fix |
|-----------|-------|-----|
| `GuestQuickActions.tsx` | Label text may wrap on very small screens | Add `whitespace-nowrap` to label spans |
| `GuestSectionHeader.tsx` | Title can wrap if count is long | Add `whitespace-nowrap` to title wrapper |
| `GuestEmptyState.tsx` | Title lacks `text-center` consistency | Ensure proper centering classes |
| `GuestBookingCard.tsx` | Title truncation working but subtitle may wrap | Add `line-clamp-1` to subtitle text |
| `GuestSmartSuggestions.tsx` | Description uses `line-clamp-2` but title may wrap | Add `line-clamp-1` to titles |
| `TravelPartyCard.tsx` | Description text can wrap inconsistently | Add `truncate` to description |
| `RequestCategoryGrid.tsx` | Labels centered but may wrap | Add `whitespace-nowrap` to labels |
| `GuestTodayTimeline.tsx` | Timeline pill titles truncate but container needs `min-w-0` | Verify `min-w-0` on flex parents |
| `GuestFeaturedActivities.tsx` | Activity names use `line-clamp-1` ✓ | Already correct |
| `GuestLayout.tsx` | Nav labels may wrap on very small devices | Add `whitespace-nowrap` to nav labels |

### Staff Portal

| Component | Issue | Fix |
|-----------|-------|-----|
| `StaffSidebar.tsx` | Nav item titles could wrap if sidebar is resized | Add `whitespace-nowrap` to nav labels |
| `StaffTopbar.tsx` | Resort name truncates ✓ but search button text may wrap | Add `whitespace-nowrap` to "Search" text |
| `NeedsAttentionCard.tsx` | Item titles truncate ✓ but "All Clear" text centered ✓ | Already correct |
| `RequestStatusTabs.tsx` | Tab labels centered but could wrap on edge cases | Add `whitespace-nowrap` to labels |
| `StatCard.tsx` | Title uses `truncate` ✓ | Already correct |
| `PageHeader.tsx` | Title should not wrap, description may wrap (acceptable) | Add `whitespace-nowrap` to titles on mobile |
| `TodayAtAGlance.tsx` | Metric labels may wrap | Add `whitespace-nowrap` to labels |
| `TodayHub.tsx` | Various list item titles need consistent truncation | Ensure `truncate` on all list item titles |

### Shared UI Components

| Component | Issue | Fix |
|-----------|-------|-----|
| `Badge.tsx` | Already has inline-flex ✓ | Already correct |
| `Button.tsx` | Has `whitespace-nowrap` ✓ | Already correct |
| `Tabs.tsx` | TabsTrigger has `whitespace-nowrap` ✓ | Already correct |
| `SegmentedControl.tsx` | Button labels may wrap | Add `whitespace-nowrap` to label spans |
| `EmptyState.tsx` | Title and description centered ✓ | Already correct |
| `Card.tsx` | Content wrapper needs awareness | No changes needed |

---

## Implementation Plan

### Phase 1: Guest Portal Navigation & Headers

**File: `src/components/guest/GuestLayout.tsx`**
- Add `whitespace-nowrap` to nav item labels (line 77-82)
- Ensures "Activities", "Requests", "Bookings" never wrap

**File: `src/components/guest/GuestSectionHeader.tsx`**
- Add `whitespace-nowrap` to title `<h2>` tag
- Prevents section headers from wrapping

### Phase 2: Guest Cards & Content

**File: `src/components/guest/GuestQuickActions.tsx`**
- Add `whitespace-nowrap text-center` to label spans (line 91-93)
- Ensures "Activities", "Dining", etc. stay on one line

**File: `src/components/guest/TravelPartyCard.tsx`**
- Add `truncate` class to description paragraph (line 41-44)

**File: `src/components/guest/GuestSmartSuggestions.tsx`**
- Add `line-clamp-1` to suggestion titles (line 137-138)

**File: `src/components/guest/GuestTodayTimeline.tsx`**
- Verify `min-w-0` is on all flex parents with truncating text

**File: `src/components/guest/requests/RequestCategoryGrid.tsx`**
- Add `whitespace-nowrap` to category labels (line 161-162)

### Phase 3: Staff Portal Navigation & Headers

**File: `src/components/staff/StaffSidebar.tsx`**
- Add `whitespace-nowrap` to nav item spans (line 324)
- Prevents menu items from wrapping

**File: `src/components/staff/StaffTopbar.tsx`**
- Add `whitespace-nowrap` to "Search" span (line 77)

**File: `src/components/ui/page-header.tsx`**
- Add `whitespace-nowrap` to page title on mobile (line 53)

### Phase 4: Staff Cards & Components

**File: `src/components/staff/TodayAtAGlance.tsx`**
- Add `whitespace-nowrap` to metric labels

**File: `src/components/staff/requests/RequestStatusTabs.tsx`**
- Add `whitespace-nowrap` to tab label spans (line 90-92)

**File: `src/components/ui/segmented-control.tsx`**
- Add `whitespace-nowrap` to label spans (lines 68-69)

### Phase 5: Shared UI Component Hardening

**File: `src/index.css`**
- Add utility class `.text-balance` for multi-line centered text:
```css
.text-balance {
  text-wrap: balance;
}
```
- Add `.text-nowrap` alias for `whitespace-nowrap` if not present

---

## Code Changes Summary

### Files to Modify (13 files)

| File | Primary Change |
|------|---------------|
| `src/components/guest/GuestLayout.tsx` | `whitespace-nowrap` on nav labels |
| `src/components/guest/GuestSectionHeader.tsx` | `whitespace-nowrap` on title |
| `src/components/guest/GuestQuickActions.tsx` | `whitespace-nowrap text-center` on labels |
| `src/components/guest/TravelPartyCard.tsx` | `truncate` on description |
| `src/components/guest/GuestSmartSuggestions.tsx` | `line-clamp-1` on titles |
| `src/components/guest/GuestTodayTimeline.tsx` | Verify `min-w-0` patterns |
| `src/components/guest/requests/RequestCategoryGrid.tsx` | `whitespace-nowrap` on labels |
| `src/components/staff/StaffSidebar.tsx` | `whitespace-nowrap` on nav items |
| `src/components/staff/StaffTopbar.tsx` | `whitespace-nowrap` on search text |
| `src/components/staff/TodayAtAGlance.tsx` | `whitespace-nowrap` on labels |
| `src/components/staff/requests/RequestStatusTabs.tsx` | `whitespace-nowrap` on tabs |
| `src/components/ui/segmented-control.tsx` | `whitespace-nowrap` on buttons |
| `src/components/ui/page-header.tsx` | `whitespace-nowrap` on titles |

---

## Technical Details

### Pattern: Preventing Text Wrap in Flex Items
```tsx
// Before (text may wrap)
<span className="text-xs font-medium">
  {label}
</span>

// After (text stays on one line)
<span className="text-xs font-medium whitespace-nowrap">
  {label}
</span>
```

### Pattern: Centering Text in Flex Containers
```tsx
// Before (text left-aligned within centered container)
<div className="flex flex-col items-center gap-2">
  <Icon />
  <span>{label}</span>
</div>

// After (text visually centered)
<div className="flex flex-col items-center text-center gap-2">
  <Icon />
  <span className="whitespace-nowrap">{label}</span>
</div>
```

### Pattern: Truncating Text in Flex Children
```tsx
// Before (text overflows)
<div className="flex items-center">
  <div>
    <p className="text-sm">{longTitle}</p>
  </div>
</div>

// After (text truncates properly)
<div className="flex items-center">
  <div className="min-w-0">
    <p className="text-sm truncate">{longTitle}</p>
  </div>
</div>
```

---

## Testing Checklist

After implementation, verify on:
1. **Mobile (375px)** - iPhone SE/small Android
2. **Mobile (390-428px)** - Standard iPhone/Android
3. **Tablet (768px)** - iPad portrait
4. **Desktop (1024px+)** - Standard laptop

Check for:
- [ ] Nav labels stay on one line
- [ ] Section headers don't wrap
- [ ] Quick action labels centered and single-line
- [ ] Card titles truncate instead of wrap
- [ ] Empty states text is centered
- [ ] Badge text never wraps
- [ ] Tab labels stay compact

---

## Summary

This plan addresses text wrapping and centering issues across 13 files in both portals by:

1. **Consistent `whitespace-nowrap`** on navigation labels, badges, and short descriptive text
2. **Proper `text-center`** on containers that should center multi-line content
3. **Correct `truncate` + `min-w-0`** patterns for flex children with dynamic text
4. **`line-clamp-1/2`** for controlled description text

These changes will create a more polished, consistent UI that maintains the premium aesthetic across all viewport sizes.

