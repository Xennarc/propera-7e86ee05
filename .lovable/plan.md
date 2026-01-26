
# Staff Portal Mobile Viewport & Auto-Fit Fixes

## Executive Summary

This plan addresses viewport and auto-fit issues in the Staff Portal to ensure proper mobile rendering. The goal is to eliminate content hidden behind browser UI, prevent keyboard overlap on form inputs, and ensure all pages are fully usable on mobile without pinch-zoom.

---

## Current Issues Identified

### 1. Viewport Height Strategy
| Location | Current | Issue |
|----------|---------|-------|
| `index.html` | `min-height: 100vh` | 100vh on mobile includes the browser chrome, causing content to be cut off at the bottom |
| `StaffShell.tsx:126` | `min-h-screen` | Same issue - main wrapper uses 100vh equivalent |
| `AppLayout.tsx:100` | `min-h-screen` | Alternative layout has same problem |

### 2. Hard-coded Scroll Heights
| Component | Current | Issue |
|-----------|---------|-------|
| `StaffBookingPreviewSheet.tsx:231` | `h-[calc(100vh-16rem)]` | Uses 100vh, not dynamic viewport |
| `ResortDrawer.tsx:375` | `h-[calc(100vh-280px)]` | Same issue |

### 3. Keyboard Handling Gaps
- `useKeyboardInset` hook exists but is not integrated into the main `StaffShell`
- `MobileActionBar` has safe area padding but no keyboard-aware adjustment
- `MobileBottomNav` is fixed at bottom but doesn't move when keyboard opens

### 4. Missing Safe Area Coverage
- The bottom sheets and dialogs don't consistently use safe area insets
- Some modals use `max-h-[90vh]` instead of `90dvh`

---

## Implementation Plan

### Phase 1: Global Viewport Strategy

**File: `index.html`**

Update critical CSS to use dynamic viewport units:

```text
Current (line 138-140):
  min-height: 100vh;
  #root { min-height: 100vh; }

Change to:
  min-height: 100vh;
  min-height: 100dvh; /* Modern browsers: dynamic viewport */
  #root { 
    min-height: 100vh;
    min-height: 100dvh;
  }
```

**File: `src/index.css`**

Add new viewport-safe utility classes:

```css
/* Dynamic viewport utilities */
@layer utilities {
  /* Use dvh with vh fallback */
  .min-h-screen-safe {
    min-height: 100vh;
    min-height: 100dvh;
  }
  
  .h-screen-safe {
    height: 100vh;
    height: 100dvh;
  }
  
  /* Small viewport height (always excludes browser chrome) */
  .min-h-screen-svh {
    min-height: 100vh;
    min-height: 100svh;
  }
  
  /* Dynamic scroll container - uses available space */
  .scroll-container-safe {
    max-height: calc(100vh - var(--header-height, 4rem));
    max-height: calc(100dvh - var(--header-height, 4rem));
    overflow-y: auto;
    overscroll-behavior: contain;
  }
}
```

### Phase 2: Staff Shell Layout Fix

**File: `src/components/staff/StaffShell.tsx`**

Changes:
1. Replace `min-h-screen` with `min-h-screen-safe` (new utility)
2. Add keyboard-aware wrapper around MobileBottomNav
3. Apply consistent overflow handling

```tsx
// Line 126: Change main wrapper
<div className="flex min-h-screen-safe w-full bg-background">

// Line 146: Main content area - ensure proper overflow
<main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 lg:pb-0">
```

### Phase 3: Mobile Bottom Navigation Keyboard Safety

**File: `src/components/layout/MobileBottomNav.tsx`**

Integrate `useKeyboardInset` to hide navigation when keyboard is open:

```tsx
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

export function MobileBottomNav() {
  const { isKeyboardOpen } = useKeyboardInset();
  // ... existing code

  // Hide when keyboard is open to not obstruct input
  if (isKeyboardOpen) {
    return null;
  }

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 lg:hidden ..."
      // ... rest
    >
```

This prevents the bottom nav from covering form inputs when the keyboard is open.

### Phase 4: Mobile Action Bar Keyboard Safety

**File: `src/components/ui/mobile-action-bar.tsx`**

Enhance with keyboard awareness:

```tsx
import { useKeyboardInset } from '@/hooks/useKeyboardInset';

const MobileActionBar = React.forwardRef<HTMLDivElement, MobileActionBarProps>(
  ({ className, alwaysVisible = false, children, ...props }, ref) => {
    const { keyboardInset, isKeyboardOpen } = useKeyboardInset();
    
    return (
      <div
        ref={ref}
        style={{
          // Move above keyboard when open
          bottom: isKeyboardOpen ? keyboardInset : 0,
          transition: 'bottom 0.2s ease-out',
        }}
        className={cn(
          "fixed left-0 right-0 z-40",
          // ... rest
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
```

### Phase 5: Fix ScrollArea Heights in Sheets

**File: `src/components/staff/StaffBookingPreviewSheet.tsx`**

Replace hard-coded 100vh calculations with dynamic values:

```tsx
// Line 231: Current
<ScrollArea className="h-[calc(100vh-16rem)] mt-6">

// Change to use flex layout instead
<div className="flex-1 overflow-hidden mt-6">
  <ScrollArea className="h-full">
    {/* content */}
  </ScrollArea>
</div>
```

Better approach: Restructure the sheet to use flex layout where the scrollable area fills remaining space:

```tsx
<SheetContent side="right" className="flex flex-col h-full max-h-[100dvh]">
  <SheetHeader className="flex-shrink-0">
    {/* header content */}
  </SheetHeader>
  
  <ScrollArea className="flex-1 min-h-0 mt-6">
    {/* scrollable content */}
  </ScrollArea>
  
  <div className="flex-shrink-0 pt-4 border-t">
    {/* action buttons */}
  </div>
</SheetContent>
```

**File: `src/components/superadmin/ResortDrawer.tsx`**

Apply same pattern - replace `h-[calc(100vh-280px)]` with flex layout.

### Phase 6: Sheet Component Safe Heights

**File: `src/components/ui/sheet.tsx`**

Add max-height constraint using dvh:

```tsx
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background dark:bg-midnight-900 p-5 sm:p-6 shadow-xl transition ease-in-out ...",
  {
    variants: {
      side: {
        // Add max-height for mobile safety
        left: "inset-y-0 left-0 h-full max-h-[100dvh] w-[85%] sm:w-3/4 ...",
        right: "inset-y-0 right-0 h-full max-h-[100dvh] w-[85%] sm:w-3/4 ...",
        // Bottom sheets need safe area
        bottom: "inset-x-0 bottom-0 max-h-[85dvh] ... pb-[env(safe-area-inset-bottom)]",
      },
    },
  }
);
```

### Phase 7: Dialog Safe Heights

**File: `src/components/ui/dialog.tsx`**

Update max-height to use dvh:

```tsx
<DialogPrimitive.Content
  className={cn(
    // Change max-h-[90vh] to dvh
    "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] sm:w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
    "max-h-[90vh] max-h-[90dvh] overflow-y-auto",
    // ... rest
  )}
>
```

### Phase 8: Drawer Component Safe Area

**File: `src/components/ui/drawer.tsx`**

Add safe area padding to drawer footer:

```tsx
const DrawerFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div 
    className={cn("mt-auto flex flex-col gap-3 p-5", className)} 
    style={{ 
      paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' 
    }}
    {...props} 
  />
);
```

Also constrain drawer max height:

```tsx
<DrawerPrimitive.Content
  className={cn(
    "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto max-h-[90dvh] flex-col rounded-t-3xl border bg-background",
    className,
  )}
>
```

### Phase 9: Keyboard Safe Drawer Integration

**File: `src/components/ui/keyboard-safe-drawer.tsx`**

This component already exists and handles keyboard well. Ensure it's used for all form-based drawers:

- The footer already uses `keyboardInset` for dynamic padding
- The scroll container already accounts for keyboard
- This should be the default pattern for any drawer containing form inputs

### Phase 10: Prevent Horizontal Scroll

**File: `src/index.css`**

Add global horizontal scroll prevention:

```css
@layer base {
  html, body {
    overflow-x: hidden;
    overscroll-behavior-x: none;
  }
  
  /* Prevent touch-scroll horizontal leaks */
  body {
    touch-action: pan-y;
  }
}
```

Add to `StaffShell`:

```tsx
<main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 lg:pb-0">
```

### Phase 11: Input Focus Auto-Scroll

Create a new hook/utility for auto-scrolling inputs into view:

**File: `src/hooks/useInputAutoScroll.ts`** (NEW)

```tsx
import { useEffect } from 'react';

/**
 * useInputAutoScroll - Automatically scrolls focused inputs into view
 * 
 * Attach to any scrollable container that contains form inputs.
 * When an input receives focus, it will be scrolled into view with
 * enough padding to remain visible above the keyboard.
 */
export function useInputAutoScroll(containerRef: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const isInput = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;
      
      if (!isInput) return;

      // Delay to let keyboard animate open
      setTimeout(() => {
        const targetRect = target.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Check if element is below visible area
        const visibleBottom = containerRect.bottom - 200; // 200px buffer for keyboard
        
        if (targetRect.bottom > visibleBottom) {
          const scrollAmount = targetRect.bottom - visibleBottom + 40;
          container.scrollBy({
            top: scrollAmount,
            behavior: 'smooth'
          });
        }
      }, 150);
    };

    container.addEventListener('focusin', handleFocus);
    return () => container.removeEventListener('focusin', handleFocus);
  }, [containerRef]);
}
```

### Phase 12: Tailwind Config Update

**File: `tailwind.config.ts`**

Add dvh/svh utilities if not already available through plugins:

```ts
extend: {
  height: {
    'screen-dvh': '100dvh',
    'screen-svh': '100svh',
  },
  maxHeight: {
    'screen-dvh': '100dvh',
    'screen-svh': '100svh',
    '90dvh': '90dvh',
    '85dvh': '85dvh',
  },
  minHeight: {
    'screen-dvh': '100dvh',
    'screen-svh': '100svh',
  },
}
```

---

## Files to Modify Summary

| File | Change Type | Priority |
|------|-------------|----------|
| `index.html` | Update critical CSS to use dvh | High |
| `src/index.css` | Add viewport-safe utilities | High |
| `tailwind.config.ts` | Add dvh/svh utilities | High |
| `src/components/staff/StaffShell.tsx` | Use min-h-screen-safe, fix overflow | High |
| `src/components/layout/MobileBottomNav.tsx` | Hide when keyboard open | High |
| `src/components/ui/mobile-action-bar.tsx` | Keyboard-aware positioning | High |
| `src/components/ui/sheet.tsx` | Add max-h-[100dvh], safe area | Medium |
| `src/components/ui/dialog.tsx` | Use max-h-[90dvh] | Medium |
| `src/components/ui/drawer.tsx` | Max height + safe area footer | Medium |
| `src/components/staff/StaffBookingPreviewSheet.tsx` | Flex layout instead of calc | Medium |
| `src/components/superadmin/ResortDrawer.tsx` | Flex layout instead of calc | Medium |
| `src/hooks/useInputAutoScroll.ts` | NEW - auto-scroll inputs | Medium |

---

## Testing Checklist

After implementation, verify:

- [ ] **iOS Safari**: Staff portal fits without content behind address bar
- [ ] **Android Chrome**: Same test - no content behind system UI
- [ ] **Keyboard Open (iOS)**: Form inputs scroll into view, action buttons remain visible
- [ ] **Keyboard Open (Android)**: Same test
- [ ] **Bottom Nav**: Hides when keyboard opens, reappears when closes
- [ ] **MobileActionBar**: Moves above keyboard when input focused
- [ ] **Sheets**: Right sheets don't overflow, scroll internally
- [ ] **Bottom Sheets**: Respect safe area on iPhone with notch
- [ ] **Dialogs**: Don't overflow on small screens (iPhone SE)
- [ ] **Orientation Change**: Layout adapts correctly
- [ ] **No Horizontal Scroll**: None at any breakpoint
- [ ] **No Pinch-Zoom Required**: All content readable and tappable

---

## Summary

This plan systematically fixes mobile viewport issues by:

1. **Adopting dynamic viewport units (dvh/svh)** - Ensures content respects actual visible viewport
2. **Hiding bottom nav when keyboard opens** - Prevents obstruction of form inputs
3. **Making action bars keyboard-aware** - Primary CTAs remain visible above keyboard
4. **Using flex layouts instead of calc(100vh)** - More robust height calculations
5. **Adding safe area insets consistently** - Handles notches and home indicators
6. **Preventing horizontal overflow** - Global CSS rules prevent scroll escape

All changes are additive and non-breaking - no business logic, routes, or data handling will be modified.
