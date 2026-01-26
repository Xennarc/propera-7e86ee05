
# Enable Horizontal Scroll for Mobile Guest List - Pragmatic Fallback

## Problem Summary

Despite multiple attempts to constrain the guest list within the mobile viewport using `overflow-x-hidden`, content is still getting clipped and inaccessible. The current approach of hiding overflow (`overflow-x-hidden`) means users cannot see or interact with content that extends beyond the viewport edge.

The user is requesting a pragmatic fallback: **allow horizontal scrolling** so that even if content doesn't fit perfectly, it remains accessible.

## Root Cause

Multiple layers of `overflow-x-hidden` are stacked throughout the application:

1. **Global level** (`src/index.css`):
   - Line 275: `html { overflow-x: hidden; }`
   - Line 284: `body { overflow-x: hidden; }`

2. **Shell level** (`src/components/staff/StaffShell.tsx`):
   - Line 146: `<main className="... overflow-x-hidden">`

3. **Page level** (`src/pages/guests/GuestsPage.tsx`):
   - Line 268: `<div className="... overflow-x-hidden">`
   - Line 296: `<Card className="overflow-hidden">`
   - Line 297: `<CardContent className="... overflow-hidden">`

These compound to **completely hide** any content that exceeds viewport width, making it inaccessible rather than scrollable.

## Solution Strategy

Convert from a **hide-overflow strategy** to a **scroll-overflow strategy** by changing `overflow-x-hidden` to `overflow-x-auto`. This allows:

1. Content to **prefer fitting** within the viewport (due to `w-full max-w-full` constraints)
2. But **fallback to horizontal scroll** when content must exceed viewport
3. Users can **always access all content**, even if layout isn't perfect

### Philosophy Shift

**Before:** Enforce mobile-first constraints by hiding anything that doesn't fit  
**After:** Encourage mobile-first constraints, but allow scrolling as a safety net

---

## Implementation Plan

### Change 1: GuestsPage - Allow Horizontal Scroll in Cards

**File: `src/pages/guests/GuestsPage.tsx`**

**Rationale:** The guest list container should allow horizontal scroll as a last resort.

#### Line 268: Main page wrapper
```tsx
// Current:
<div className="space-y-6 animate-fade-in overflow-x-hidden w-full max-w-full">

// Change to:
<div className="space-y-6 animate-fade-in overflow-x-auto w-full max-w-full">
```

#### Line 296: Card container
```tsx
// Current:
<Card className="overflow-hidden w-full">

// Change to:
<Card className="overflow-x-auto overflow-y-visible w-full">
```

#### Line 297: CardContent
```tsx
// Current:
<CardContent className="p-0 overflow-hidden">

// Change to:
<CardContent className="p-0 overflow-x-auto overflow-y-visible">
```

#### Line 371 (approximate): Mobile guest list container

Currently the mobile section wraps cards in a container. We need to ensure this container allows horizontal scroll:

```tsx
// Find the mobile card container (around line 371)
// Current:
{isMobile && (
  <div className="w-full max-w-full overflow-hidden">
    <div className="p-3 space-y-3 pb-24 w-full max-w-full">

// Change to:
{isMobile && (
  <div className="w-full overflow-x-auto">
    <div className="p-3 space-y-3 pb-24 min-w-full">
```

**Explanation:** Using `overflow-x-auto` allows scrolling when content is wider. Using `min-w-full` instead of `w-full max-w-full` on the inner div ensures cards don't shrink below full width while still allowing the container to scroll if cards exceed viewport.

---

### Change 2: StaffShell - Allow Page-Level Horizontal Scroll

**File: `src/components/staff/StaffShell.tsx`**

**Rationale:** The shell's main area should not force-hide horizontal overflow. Let individual pages control their overflow behavior.

#### Line 146: Main content area
```tsx
// Current:
<main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 lg:pb-0">

// Change to:
<main className="flex-1 overflow-y-auto overflow-x-auto pb-24 lg:pb-0">
```

---

### Change 3: Global Styles - Allow Root-Level Horizontal Scroll

**File: `src/index.css`**

**Rationale:** The strictest constraint is at the global level. By allowing scroll here, we enable all child components to use horizontal scroll when needed.

#### Lines 272-276: HTML element
```css
/* Current: */
html {
  @apply scroll-smooth;
  /* Prevent horizontal scroll on mobile */
  overflow-x: hidden;
}

/* Change to: */
html {
  @apply scroll-smooth;
  /* Allow horizontal scroll when needed */
  overflow-x: auto;
}
```

#### Lines 278-287: Body element
```css
/* Current: */
body {
  @apply bg-background text-foreground antialiased;
  font-family: 'Plus Jakarta Sans', 'Sora', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-feature-settings: "cv11", "ss01";
  letter-spacing: -0.01em;
  /* Prevent horizontal scroll and touch scroll escape */
  overflow-x: hidden;
  overscroll-behavior-x: none;
  touch-action: pan-y pinch-zoom;
}

/* Change to: */
body {
  @apply bg-background text-foreground antialiased;
  font-family: 'Plus Jakarta Sans', 'Sora', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-feature-settings: "cv11", "ss01";
  letter-spacing: -0.01em;
  /* Allow horizontal scroll when needed */
  overflow-x: auto;
  overscroll-behavior-x: none;
  touch-action: pan-x pan-y pinch-zoom;
}
```

**Note:** Also changed `touch-action` from `pan-y pinch-zoom` to `pan-x pan-y pinch-zoom` to enable horizontal panning on touch devices.

---

### Change 4: GuestCardRow - Ensure Cards Can Scroll

**File: `src/components/guests/GuestCardRow.tsx`**

**Current state:** Cards already have proper width constraints and responsive padding. No changes needed here - the cards themselves are well-constrained. The issue is their container preventing scroll.

**Action:** No changes needed to this component. The parent container changes will allow these cards to scroll if they exceed viewport.

---

## Optional Enhancement: Visual Scroll Indicator

To help users realize content is scrollable, we can add a subtle scroll hint.

**File: `src/pages/guests/GuestsPage.tsx`**

Add a CSS class or inline style for the mobile card container:

```tsx
{isMobile && (
  <div className="w-full overflow-x-auto scroll-smooth">
    {/* Add scroll shadow gradient as visual cue */}
    <div className="relative">
      <div className="p-3 space-y-3 pb-24 min-w-full">
        {filteredGuests.map(...)}
      </div>
      {/* Scroll hint shadow (optional) */}
      <div className="pointer-events-none absolute top-0 right-0 bottom-0 w-8 bg-gradient-to-l from-background/80 to-transparent" />
    </div>
  </div>
)}
```

This adds a subtle shadow on the right edge to indicate "more content this way" when scrolling is needed.

---

## Files to Modify

| File | Lines | Change | Priority |
|------|-------|--------|----------|
| `src/pages/guests/GuestsPage.tsx` | 268, 296, 297, ~371 | Change `overflow-x-hidden` → `overflow-x-auto` | High |
| `src/components/staff/StaffShell.tsx` | 146 | Change `overflow-x-hidden` → `overflow-x-auto` | High |
| `src/index.css` | 275, 284, 286 | Change `overflow-x: hidden` → `overflow-x: auto` and update `touch-action` | High |

---

## Testing Checklist

After implementation, verify on mobile (320px - 428px):

- [ ] Guest list is visible and accessible
- [ ] If content exceeds viewport, horizontal scrollbar appears
- [ ] User can scroll horizontally to see all content
- [ ] Search, filters, and action buttons remain accessible
- [ ] Preview button and guest name are both visible (no clipping)
- [ ] Horizontal scroll is smooth on touch devices
- [ ] Desktop layout is unaffected (no unwanted scroll bars)
- [ ] No layout shift or jank when scrolling
- [ ] Bulk action bar doesn't interfere with scrolling

---

## Trade-offs

### Pros ✅
- **Immediate accessibility**: Users can see and interact with all content
- **Fail-safe approach**: Even if width constraints fail, nothing is hidden
- **Better UX than clipped content**: Scrolling is preferable to hidden buttons
- **Simple implementation**: Just change CSS properties

### Cons ⚠️
- **Not "perfect" mobile UX**: Horizontal scroll is generally avoided in mobile design
- **Indicates layout still needs work**: The ideal is no scroll, but this is a pragmatic fallback
- **May hide the actual problem**: Content that requires scroll should ideally be refactored to fit

### Recommendation 💡
Implement this change as a **short-term solution** to unblock users, then continue investigating why width constraints aren't working perfectly. This allows:
1. Users to access all functionality now
2. Development to continue refining the mobile layout in parallel

---

## Summary

This plan converts the guest list from a **strict containment strategy** (hide overflow) to a **graceful degradation strategy** (scroll overflow). By changing `overflow-x-hidden` to `overflow-x-auto` at key container levels, we ensure users can always access all content, even if the layout doesn't fit perfectly within the viewport.

The changes are:
1. **Minimal**: Just CSS property changes, no structural refactoring
2. **Safe**: Doesn't break existing functionality
3. **Reversible**: Can be reverted if we find a better solution
4. **Pragmatic**: Prioritizes accessibility over perfectionism
