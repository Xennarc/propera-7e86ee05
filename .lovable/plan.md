
# Guest List Mobile Horizontal Overflow Fix

## Problem Summary

On mobile screens, the `/staff/guests` page content overflows horizontally, making some UI elements inaccessible without horizontal scrolling. This violates the "No Pinch-Zoom" mobile standard.

---

## Root Causes Identified

| Component | Issue |
|-----------|-------|
| `GuestsPage.tsx` | The main `Card` lacks `overflow-hidden`, allowing child content to spill out |
| `GuestsSummaryStrip.tsx` | Stat chips have no `max-w` constraint and cause horizontal bleed on narrow screens |
| `GuestCardRow.tsx` | Name truncation uses `max-w-[200px]` which is too wide + padding creates overflow |
| `GuestListToolbar.tsx` | Filters row uses `flex-wrap` but individual items may still cause overflow |
| `PageHeader` | Title + action button may collide on very narrow screens |

---

## Solution: Strict Width Containment

Apply `overflow-hidden` at container boundaries and use relative widths (`max-w-full`) instead of fixed pixel widths on mobile.

---

## Implementation Plan

### Change 1: GuestsPage.tsx - Add Overflow Containment

Add `overflow-hidden` to the outer page wrapper and the main Card to prevent any child from causing horizontal scroll.

```tsx
// Line 268: Current
<div className="space-y-6 animate-fade-in">

// Change to:
<div className="space-y-6 animate-fade-in overflow-x-hidden">
```

```tsx
// Line 296: Current  
<Card>

// Change to:
<Card className="overflow-hidden">
```

Also ensure the CardContent respects boundaries:
```tsx
// Line 297: Current
<CardContent className="p-0">

// Change to:
<CardContent className="p-0 overflow-hidden">
```

### Change 2: GuestsSummaryStrip.tsx - Constrain to Viewport

The chip container already has `overflow-x-auto` which is correct. Add `max-w-full` to ensure it doesn't extend beyond parent:

```tsx
// Line 99-104: Current
<div 
  className={cn(
    'flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1',
    className
  )}
>

// Change to:
<div 
  className={cn(
    'flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1 max-w-full',
    className
  )}
>
```

### Change 3: GuestCardRow.tsx - Responsive Name Truncation

The current `max-w-[200px]` on the name is a fixed pixel width. On very narrow screens (320px), this can overflow.

```tsx
// Line 133-134: Current
<div className="flex items-center gap-2 flex-wrap pr-12 overflow-hidden">
  <span className="font-semibold text-foreground text-base truncate max-w-[200px]">{guest.full_name}</span>

// Change to:
<div className="flex items-center gap-2 flex-wrap pr-12 overflow-hidden min-w-0">
  <span className="font-semibold text-foreground text-base truncate max-w-[calc(100%-3rem)]">{guest.full_name}</span>
```

Using `calc(100% - 3rem)` accounts for the VIP/loyalty icons. The parent `min-w-0` enables flex child shrinking.

### Change 4: GuestListToolbar.tsx - Constrain Filter Row

The filters row can overflow on very narrow screens. Add `overflow-hidden` and ensure proper width constraints:

```tsx
// Line 160-161: Current
<div className="flex flex-wrap items-center gap-2">

// Change to:
<div className="flex flex-wrap items-center gap-2 w-full overflow-hidden">
```

For the Select triggers, ensure they use proper responsive widths:

```tsx
// Line 163-166: Legacy filter dropdown - already has w-full sm:w-[180px] ✓

// Line 247-249: Sort dropdown - already has flex-1 sm:flex-none sm:w-[160px] ✓
```

These are fine. The issue is likely the parent not constraining.

Add to the root wrapper:

```tsx
// Line 139: Current
<div className={cn('space-y-3', className)}>

// Change to:
<div className={cn('space-y-3 w-full overflow-hidden', className)}>
```

### Change 5: PageHeader Mobile Optimization

On very narrow screens, the page title and action button can collide. The current layout uses `flex-col sm:flex-row` which should stack on mobile, but let's ensure the title truncates properly:

```tsx
// Line 53: Current (in page-header.tsx)
<h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">

// Change to:
<h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground truncate">
```

Also add `min-w-0` to enable truncation in flex context:

```tsx
// Line 33: Current
<div className="space-y-1 min-w-0">

// Already has min-w-0 ✓
```

### Change 6: GuestRow.tsx - Desktop Table Containment

For desktop view, the grid columns may cause overflow. Add proper containment:

```tsx
// Lines 342-348 in GuestsPage.tsx: Current desktop header
<div className={cn(
  'grid gap-3 items-center border-b border-border bg-muted/30 text-sm font-medium text-muted-foreground',
  preferences.density === 'compact' ? 'py-2 px-3' : 'py-3 px-4',
  prearrivalEnabled 
    ? 'grid-cols-[auto_1fr_auto_auto_auto_auto_auto]' 
    : 'grid-cols-[1fr_auto_auto_auto_auto_auto]'
)}>

// The issue: Many 'auto' columns can expand beyond viewport
// Change to: Use minmax for the name column and constrain actions

// For desktop (non-mobile), add overflow-hidden to the wrapper:
<div className="overflow-hidden">
  {/* Desktop header and rows */}
</div>
```

---

## Files to Modify

| File | Change | Priority |
|------|--------|----------|
| `src/pages/guests/GuestsPage.tsx` | Add `overflow-hidden` to wrapper, Card, and CardContent | High |
| `src/components/guests/GuestsSummaryStrip.tsx` | Add `max-w-full` to chip container | High |
| `src/components/guests/GuestCardRow.tsx` | Change name truncation to `max-w-[calc(100%-3rem)]`, add `min-w-0` | High |
| `src/components/guests/GuestListToolbar.tsx` | Add `w-full overflow-hidden` to root wrapper | High |
| `src/components/ui/page-header.tsx` | Add `truncate` to title for safety | Medium |

---

## Detailed Code Changes

### GuestsPage.tsx

```tsx
// Line 268
- <div className="space-y-6 animate-fade-in">
+ <div className="space-y-6 animate-fade-in overflow-x-hidden w-full max-w-full">

// Line 296
- <Card>
+ <Card className="overflow-hidden w-full">

// Line 297  
- <CardContent className="p-0">
+ <CardContent className="p-0 overflow-hidden">

// Line 340 (desktop wrapper)
- <div className="overflow-hidden">
+ <div className="overflow-x-hidden w-full">
```

### GuestsSummaryStrip.tsx

```tsx
// Line 99-104
<div 
  className={cn(
-   'flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1',
+   'flex gap-2 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1 max-w-full w-full',
    className
  )}
>
```

### GuestCardRow.tsx

```tsx
// Line 82-83: Add overflow-hidden to card
- 'relative p-5 bg-card border border-border/40 rounded-xl cursor-pointer overflow-hidden',
+ 'relative p-4 bg-card border border-border/40 rounded-xl cursor-pointer overflow-hidden w-full',

// Line 131: Add min-w-0 to main content
- <div className={cn('space-y-3', showSelection && 'pl-8')}>
+ <div className={cn('space-y-3 min-w-0 overflow-hidden', showSelection && 'pl-8')}>

// Line 133: Responsive name container
- <div className="flex items-center gap-2 flex-wrap pr-12 overflow-hidden">
+ <div className="flex items-center gap-2 flex-wrap pr-10 overflow-hidden min-w-0 max-w-full">

// Line 134: Responsive name width
- <span className="font-semibold text-foreground text-base truncate max-w-[200px]">{guest.full_name}</span>
+ <span className="font-semibold text-foreground text-base truncate max-w-[70%]">{guest.full_name}</span>
```

### GuestListToolbar.tsx

```tsx
// Line 139
- <div className={cn('space-y-3', className)}>
+ <div className={cn('space-y-3 w-full max-w-full overflow-hidden', className)}>

// Line 141
- <div className="flex gap-2">
+ <div className="flex gap-2 w-full max-w-full">

// Line 161
- <div className="flex flex-wrap items-center gap-2">
+ <div className="flex flex-wrap items-center gap-2 w-full max-w-full">
```

### page-header.tsx

```tsx
// Line 53
- <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
+ <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-foreground break-words">
```

---

## Testing Checklist

After implementation, verify on mobile (320px - 428px widths):

- [ ] No horizontal scrollbar appears on the page
- [ ] Guest names truncate properly with ellipsis
- [ ] Summary strip scrolls horizontally with snap points
- [ ] Toolbar filters wrap and stay within bounds
- [ ] Guest cards display fully without cutoff
- [ ] All action buttons are accessible
- [ ] Preview drawer opens correctly
- [ ] Page title doesn't overflow header

---

## Summary

This fix applies strict horizontal containment by:

1. **Adding `overflow-hidden`** at container boundaries (page wrapper, Card, CardContent)
2. **Using relative widths** (`max-w-full`, `w-full`, percentage-based) instead of fixed pixel widths
3. **Enabling flex shrinking** with `min-w-0` on flex containers
4. **Allowing controlled horizontal scroll** only within the summary strip

All changes are CSS/layout only - no business logic modifications.
