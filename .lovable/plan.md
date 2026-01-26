
# Phase 1: Shell & Navigation Foundation - Mobile-First Optimization

## Executive Summary

This phase focuses on elevating the Staff Portal's navigation infrastructure to a world-class mobile experience. The existing architecture already has solid foundations — the goal is to refine, polish, and enhance the glassmorphism aesthetic while ensuring all touch targets meet accessibility standards (44x44px minimum).

---

## Current State Analysis

### StaffShell.tsx
- **Good**: Already has mobile sidebar Sheet, MobileBottomNav, responsive padding
- **Issues**: 
  - No keyboard-aware bottom nav hiding
  - Shell could benefit from cleaner mobile header integration

### MobileBottomNav.tsx
- **Good**: Glassmorphism styling (`surface-glass-strong`), safe-area support, 48px touch targets
- **Issues**:
  - Not keyboard-aware (blocks form inputs when keyboard opens)
  - Icon pill background is small (w-10 h-7) — could be more prominent
  - "More" sheet grid could use refinement

### StaffSidebar.tsx
- **Good**: Collapsible accordion groups, resort switcher, role-based visibility
- **Issues**:
  - Trigger touch targets are 48px but nav items are 40px (py-2.5)
  - No visual indication of group collapse/expand animation
  - Admin section could use stronger visual separation

### StaffTopbar.tsx
- **Good**: Responsive design, glassmorphism, command bar trigger
- **Issues**:
  - Mobile view shows menu + logo + search + theme + notifications + avatar — too crowded
  - Breadcrumbs hidden on mobile but no page context indicator

---

## Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Touch-first** | All interactive elements min 44x44px |
| **Keyboard-safe** | Bottom nav hides when keyboard opens |
| **Glassmorphism** | Consistent `surface-glass-strong` on fixed elements |
| **Minimal distraction** | Condense topbar on mobile, clear hierarchy |
| **Smooth transitions** | Subtle animations for expand/collapse |

---

## Implementation Plan

### 1. MobileBottomNav Enhancement

**File: `src/components/layout/MobileBottomNav.tsx`**

Changes:
1. **Add keyboard detection** — Hide nav when keyboard is open using `useKeyboardInset` hook
2. **Increase icon pill size** — From `w-10 h-7` to `w-12 h-8` for better visual weight
3. **Enhanced glassmorphism** — Add subtle top-edge gradient glow
4. **Improve "More" sheet** — Cleaner grid spacing, larger card touch targets
5. **Add micro-animations** — Subtle scale on tap, smooth active state transitions

```text
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐   ┌───────┐   │
│    │  🏠   │   │  👥   │   │  📅   │   │  🍽️   │   │  •••  │   │
│    │ Home  │   │Guests │   │Activ. │   │Dining │   │ More  │   │
│    └───────┘   └───────┘   └───────┘   └───────┘   └───────┘   │
│                                                                 │
│  ───────────── env(safe-area-inset-bottom) ──────────────────  │
└─────────────────────────────────────────────────────────────────┘
          ↑ Glassmorphism blur + subtle top-edge gradient
```

### 2. StaffTopbar Mobile Optimization

**File: `src/components/staff/StaffTopbar.tsx`**

Changes:
1. **Condense mobile header** — Replace separate logo + resort name with unified "Resort Branding" area
2. **Add compact page context** — Show current page title on mobile (optional fade breadcrumb)
3. **Group right-side actions** — Combine search + theme + notifications into overflow menu on very narrow screens
4. **Compact user avatar** — Smaller avatar with no name on mobile, full display on tablet+

Mobile Layout (< 768px):
```text
┌─────────────────────────────────────────────────────────────────┐
│  [☰]  [🏝️ Resort Name]                      [🔍] [🔔] [👤]   │
│  ─────────────────────────────────────────────────────────────  │
│        └── Tappable resort brand area          └── Compact     │
│            (can expand to switcher)                 actions    │
└─────────────────────────────────────────────────────────────────┘
```

Desktop Layout (≥ 1024px):
```text
┌─────────────────────────────────────────────────────────────────┐
│  [Dashboard > Guests > Details]    [🔍 Search ⌘K] [🌙] [🔔] [Name ▼]│
└─────────────────────────────────────────────────────────────────┘
```

### 3. StaffSidebar Accordion Refinement

**File: `src/components/staff/StaffSidebar.tsx`**

Changes:
1. **Increase nav item touch targets** — Ensure all items are min 44px height
2. **Animate chevron rotation** — Smooth 180° rotate on group expand
3. **Add subtle expand animation** — Use Tailwind animate-accordion-down/up
4. **Stronger Admin section visual** — Gradient border or distinct background wash
5. **Compact resort switcher** — Slightly reduced padding when space is tight

Navigation Item Structure:
```text
┌──────────────────────────────────────────────────────────────┐
│  [Icon]  Operations                              [▼ chevron] │  ← 48px touch target
│  ────────────────────────────────────────────────────────────│
│    │                                                         │
│    ├── [Icon]  Dashboard                                     │  ← 44px each
│    ├── [Icon]  Today's View                                  │
│    └── [Icon]  Team Directory                                │
└──────────────────────────────────────────────────────────────┘
```

### 4. StaffShell Keyboard-Safe Layout

**File: `src/components/staff/StaffShell.tsx`**

Changes:
1. **Pass keyboard state to MobileBottomNav** — Allow conditional hiding
2. **Adjust main content padding** — When keyboard open, remove bottom padding
3. **Ensure content scrolls above keyboard** — Main area remains accessible

### 5. Global Touch Target Audit

**Files: Various nav/button components**

Ensure minimum 44x44px hit areas:
- `CollapsibleTrigger` in sidebar: Increase to `py-3 px-3` = 48px
- Navigation links: Ensure `py-2.5` on small icons gives 44px+ with icon height
- Mobile bottom nav items: Already 48px ✓
- "More" sheet cards: Increase from `p-4 min-h-[80px]` to `min-h-[88px]`

---

## Files to Modify

| File | Change Type |
|------|-------------|
| `src/components/layout/MobileBottomNav.tsx` | Major enhancement — keyboard-safe, styling |
| `src/components/staff/StaffTopbar.tsx` | Moderate — mobile condensed layout |
| `src/components/staff/StaffSidebar.tsx` | Minor — touch targets, animations |
| `src/components/staff/StaffShell.tsx` | Minor — keyboard state coordination |

---

## CSS/Style Additions

Add to `src/index.css`:

```css
/* Enhanced bottom nav gradient edge */
.surface-glass-nav {
  @apply surface-glass-strong;
  box-shadow: 0 -1px 0 0 hsl(var(--border) / 0.2),
              0 -4px 20px 0 hsl(var(--background) / 0.3);
}

/* Dark mode refinement */
.dark .surface-glass-nav {
  box-shadow: 0 -1px 0 0 hsl(var(--midnight-700) / 0.3),
              0 -4px 20px 0 hsl(var(--midnight-950) / 0.5);
}

/* Bottom nav hide transition */
.bottom-nav-hidden {
  transform: translateY(100%);
  opacity: 0;
  transition: transform 0.2s ease-out, opacity 0.15s ease-out;
}

.bottom-nav-visible {
  transform: translateY(0);
  opacity: 1;
  transition: transform 0.25s ease-out, opacity 0.2s ease-out;
}
```

---

## Animation Specifications

| Element | Animation | Duration |
|---------|-----------|----------|
| Bottom nav hide | translateY(100%) + opacity 0 | 200ms ease-out |
| Bottom nav show | translateY(0) + opacity 1 | 250ms ease-out |
| Sidebar group expand | animate-accordion-down | 200ms |
| Sidebar group collapse | animate-accordion-up | 200ms |
| Chevron rotate | rotate 0 ↔ 180deg | 200ms |
| Nav item hover | scale(1.01) | 150ms |
| Active state | bg-primary/15 fade-in | 200ms |

---

## Accessibility Considerations

| Requirement | Implementation |
|-------------|----------------|
| Touch targets | Min 44x44px on all nav items |
| Focus visible | Ring on keyboard navigation |
| Motion reduced | Respect `prefers-reduced-motion` |
| Screen reader | Proper aria-labels on nav items |
| Color contrast | All text passes WCAG AA |

---

## Keyboard Visibility Logic

```typescript
// In MobileBottomNav.tsx
const { isKeyboardOpen } = useKeyboardInset();

return (
  <nav 
    className={cn(
      "fixed bottom-0 left-0 right-0 z-50 lg:hidden surface-glass-nav",
      isKeyboardOpen ? "bottom-nav-hidden" : "bottom-nav-visible"
    )}
    // ...
  >
```

---

## Visual Refinements Summary

### MobileBottomNav
- Larger icon pills with pill-shaped active background
- Subtle gradient shadow at top edge
- Smoother active state with scale micro-animation
- Keyboard-safe auto-hide

### StaffTopbar (Mobile)
- Resort brand as single tappable unit (logo + name)
- Compact action buttons grouped right
- No visible breadcrumbs (page context in page header instead)
- Cleaner visual balance

### StaffSidebar (Drawer)
- Animated chevron rotation on expand
- Smoother accordion transitions
- Slightly larger touch targets throughout
- Admin section with subtle visual distinction

---

## Testing Checklist

- [ ] iOS Safari: Keyboard opens → bottom nav hides → keyboard closes → nav returns
- [ ] Android Chrome: Same test
- [ ] All nav items have 44px+ touch targets
- [ ] Accordion animations are smooth
- [ ] Reduced motion: Animations disabled
- [ ] Dark mode: All glass effects render correctly
- [ ] Resort switcher: Works in sidebar and topbar
- [ ] "More" sheet: Cards are easy to tap
- [ ] Landscape orientation: Layout doesn't break

---

## Summary

This phase establishes a rock-solid navigation foundation that:

1. **Feels premium** — Glassmorphism, smooth animations, polished transitions
2. **Works everywhere** — Touch-optimized, keyboard-safe, responsive
3. **Doesn't interfere** — Bottom nav hides for forms, sidebar collapses cleanly
4. **Follows standards** — 44px touch targets, accessible, motion-safe

No business logic, routing, or data handling is modified — purely UI shell enhancements.
