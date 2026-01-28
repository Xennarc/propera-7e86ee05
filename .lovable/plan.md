
# Fix Guest Portal Activities Cards & Scrolling

## Overview

This plan addresses three key issues:
1. **Vertical scrolling** - Ensure smooth scrolling works throughout the guest portal
2. **Activity thumbnails** - Make activity images larger and more prominent  
3. **Card content alignment** - Center-align all text and icons within activity cards

---

## Problem Analysis

### Current Issues

| Issue | Current State | Problem |
|-------|---------------|---------|
| Thumbnail size | 48×48px (h-12 w-12) | Too small to showcase activity visuals |
| Card alignment | `items-center` on outer flex, but inner content varies | Content appears offset upward when descriptions are missing |
| Scrolling | Relies on main element overflow | May have issues with touch scrolling on some devices |

### Screenshot Analysis

The card layout shows:
- Small square thumbnail on left
- Text content offset upward rather than vertically centered
- Chevron aligned to center but content above it isn't balanced

---

## Implementation Plan

### 1. Enhanced Activity Thumbnails

**File: `src/pages/guest/GuestActivitiesBrowser.tsx`**

Increase thumbnail size from 48×48px to 64×64px (or 72×72px) with improved styling:

```tsx
{/* Larger thumbnail with enhanced styling */}
<div className="relative h-16 w-16 shrink-0 rounded-2xl overflow-hidden shadow-md">
  {session.image_url ? (
    <>
      <img 
        src={session.image_url} 
        alt={session.activity_name}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
    </>
  ) : (
    <div className={cn(
      "flex h-full w-full items-center justify-center shadow-inner",
      config.bgClass
    )}>
      <CategoryIcon category={session.category} size={28} />
    </div>
  )}
</div>
```

### 2. Centered Card Content Alignment

**File: `src/pages/guest/GuestActivitiesBrowser.tsx`**

Fix the card layout to properly center all content vertically:

```tsx
<CardContent className="p-4">
  <div className="flex items-center gap-4">
    {/* Thumbnail - centered */}
    <div className="relative h-16 w-16 shrink-0 ...">
      ...
    </div>
    
    {/* Content area - centered with consistent structure */}
    <div className="flex-1 min-w-0 flex flex-col justify-center">
      {/* Top row: Name + Status badge */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="font-semibold text-foreground truncate">
          {session.activity_name}
        </h3>
        <Badge ... className="shrink-0 text-xs whitespace-nowrap">
          ...
        </Badge>
      </div>
      
      {/* Bottom row: Consolidated metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          ...
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </div>
  </div>
</CardContent>
```

Key changes:
- Add `flex flex-col justify-center` to content wrapper for vertical centering
- Remove optional description (it causes variable heights)
- Keep two-row layout: Name+Badge / Metadata+Chevron

### 3. Improved Scrolling

**File: `src/components/guest/GuestLayout.tsx`**

Ensure the main content area allows proper vertical scrolling:

```tsx
<main 
  ref={mainRef} 
  className="flex-1 overflow-y-auto overflow-x-hidden guest-safe-bottom scroll-smooth-touch gpu-scroll touch-scroll guest-page-bg"
>
```

The change from `overflow-auto` to `overflow-y-auto overflow-x-hidden` ensures:
- Vertical scrolling is always enabled
- Horizontal scroll is prevented (avoiding accidental swipes)

**File: `src/index.css`**

Add enhanced scroll utility if needed:

```css
/* Improved vertical scroll container */
.guest-scroll-container {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-y: contain;
  scroll-behavior: smooth;
}
```

---

## Technical Summary

| File | Changes |
|------|---------|
| `src/pages/guest/GuestActivitiesBrowser.tsx` | Larger thumbnails (64×64px), centered card content, remove description |
| `src/components/guest/GuestLayout.tsx` | Explicit vertical scroll classes |
| `src/index.css` | Optional scroll utility enhancement |

---

## Visual Result

### Before:
```
[48px img] Activity Name ────────── [INSTANT]
           Optional description...
           07:00 · 60m · 15 spots ──────── [>]
```

### After:
```
           Activity Name ────────── [INSTANT]
[64px img] 07:00 · 60m · 15 spots ──────── [>]
```

Benefits:
- Larger, more visible thumbnails
- Cleaner two-row layout
- Perfect vertical centering
- Smooth vertical scrolling

---

## Validation Checklist

After implementation:

1. **Thumbnails**
   - Activity images display at 64×64px
   - Fallback category icons are properly centered
   - Images maintain aspect ratio with cover fit

2. **Card Alignment**
   - All content is vertically centered within cards
   - Text and chevron align properly
   - No upward offset regardless of content length

3. **Scrolling**
   - Page scrolls smoothly on iOS and Android
   - No horizontal scroll interference
   - Momentum scrolling works correctly

---

## Risk Assessment

- **Low Risk**: Changes are visual/layout only
- **No Logic Changes**: Data fetching and navigation unchanged
- **Backward Compatible**: Existing card structure preserved
