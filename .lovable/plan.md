
# Phase 2: High-Traffic Dashboard Overhaul - Mobile-First Optimization

## Executive Summary

This phase transforms the Staff Portal dashboards (`ResortAdminHome.tsx` and `TodayHub.tsx`) into high-speed mobile command centers. The focus is on reducing vertical scroll fatigue, surfacing actionable items immediately, and providing quick-action shortcuts through a Smart FAB.

---

## Current State Analysis

### ResortAdminHome.tsx (608 lines)
- **Good**: Already has `NeedsAttentionCard` at top, `PriorityCardGrid`, and `OperationsSection` components
- **Issues**:
  - Operations sections (Activities, Restaurants) use vertical lists that require scrolling
  - No horizontal scroll pattern for sessions/slots on mobile
  - Quick actions are in the header — not discoverable on scroll
  - Typography doesn't scale down enough on mobile

### TodayHub.tsx (570 lines)
- **Good**: Has tabs for filtering, `QuickStatCard` components
- **Issues**:
  - Three-column grid on desktop doesn't collapse elegantly on mobile
  - Sessions/slots use `ScrollArea` with fixed height (400px) — not ideal for mobile
  - Quick actions at bottom are easy to miss
  - No FAB for quick actions

### NeedsAttentionCard.tsx
- **Good**: Priority badges, clear hierarchy, "All Clear" empty state
- **Issues**: Not sticky — scrolls with content, loses urgency on long pages

---

## Design Principles

| Principle | Implementation |
|-----------|----------------|
| **Priority Stack** | Needs Attention sticky on mobile, always visible |
| **Horizontal Carousels** | Activities/Dining use snap-scroll carousels on mobile |
| **Smart FAB** | Floating action button with expandable quick actions |
| **Micro-interactions** | Haptic-style visual feedback (scale on press) |
| **Scaled Typography** | Smaller headings on mobile for more above-fold content |

---

## Implementation Plan

### 1. New Component: Smart FAB (`SmartFAB.tsx`)

**File: `src/components/staff/dashboard/SmartFAB.tsx`** (NEW)

A floating action button positioned above the bottom nav that expands to show quick actions.

Features:
- Fixed position: `bottom-24 right-4` (above MobileBottomNav)
- Glassmorphism styling with primary accent
- Expands on tap to reveal 3 actions
- Hides when keyboard is open (like MobileBottomNav)
- Smooth spring animation on expand/collapse

```text
Collapsed:
┌───────┐
│   +   │  ← 56px round button, primary color, subtle shadow
└───────┘

Expanded:
              ┌──────────────────┐
              │ 👤 Check-in Guest│
              ├──────────────────┤
              │ ✉️ New Request    │
              ├──────────────────┤
              │ 📅 New Booking   │
              └──────────────────┘
                    ┌───────┐
                    │   ×   │  ← Rotated plus to indicate close
                    └───────┘
```

Actions:
1. **Check-in Guest** → `/staff/guests/new` (UserPlus icon)
2. **New Request** → `/staff/guest-requests/new` (MessageSquare icon)
3. **New Booking** → `/staff/activities/sessions/new` (Calendar icon)

### 2. New Component: HorizontalCardCarousel (`HorizontalCardCarousel.tsx`)

**File: `src/components/staff/dashboard/HorizontalCardCarousel.tsx`** (NEW)

A mobile-optimized horizontal scroll container for session/slot cards.

Features:
- Native CSS snap scrolling (`snap-x snap-mandatory`)
- No embla-carousel overhead for simple use cases
- Cards sized at ~280px width with `snap-start`
- Fade gradient on edges to indicate scrollability
- Desktop fallback: Regular grid layout

```text
Mobile:
┌─────────────────────────────────────────────────────────┐
│ Today's Activities                          View all → │
├─────────────────────────────────────────────────────────┤
│ ┌────────────┐ ┌────────────┐ ┌────────────┐           │
│ │ 08:00      │ │ 10:30      │ │ 14:00      │  ← scroll │
│ │ Kayaking   │ │ Yoga       │ │ Snorkel    │           │
│ │ 8/10 pax   │ │ 12/15 pax  │ │ 4/8 pax    │           │
│ └────────────┘ └────────────┘ └────────────┘           │
└─────────────────────────────────────────────────────────┘

Desktop: Regular 2-column grid (unchanged)
```

### 3. New Component: SessionCard (`SessionCard.tsx`)

**File: `src/components/staff/dashboard/SessionCard.tsx`** (NEW)

A compact card for activity sessions designed for horizontal carousels.

Features:
- Fixed width (~280px) for carousel consistency
- Time prominently displayed
- Activity name with occupancy badge
- Tap feedback with scale animation
- High-contrast occupancy indicator (green/yellow/red)

### 4. New Component: SlotCard (`SlotCard.tsx`)

**File: `src/components/staff/dashboard/SlotCard.tsx`** (NEW)

Similar to SessionCard but for restaurant time slots.

Features:
- Meal period badge (Breakfast/Lunch/Dinner)
- Restaurant name and time
- Covers count with capacity
- Same card styling as SessionCard

### 5. Modify: NeedsAttentionCard - Sticky Behavior

**File: `src/components/staff/dashboard/NeedsAttentionCard.tsx`**

Changes:
1. Add `sticky` prop for enabling sticky positioning
2. When sticky: `sticky top-16 z-20` (below DashboardHeader)
3. Add subtle shadow when stuck to visually separate from content
4. Reduce header padding when sticky for compactness

```tsx
interface NeedsAttentionCardProps {
  // ... existing props
  sticky?: boolean; // Enable sticky positioning on mobile
}
```

### 6. Modify: ResortAdminHome.tsx

**File: `src/pages/dashboards/ResortAdminHome.tsx`**

Changes:
1. **Add SmartFAB** — Import and render at bottom of component
2. **Sticky NeedsAttentionCard** — Add `sticky` prop for mobile
3. **Replace OperationsSection** with `HorizontalCardCarousel` on mobile for Activities and Restaurants
4. **Typography scaling** — Reduce `h2` section headers from `text-sm` to `text-xs` on mobile
5. **Mobile-first layout** — Ensure proper stacking order

Layout changes:
```text
MOBILE LAYOUT:
┌─────────────────────────────────────────────────────────┐
│ DashboardHeader (sticky)                                │
├─────────────────────────────────────────────────────────┤
│ NeedsAttentionCard (sticky below header)                │
├─────────────────────────────────────────────────────────┤
│ TODAY AT A GLANCE                                       │
│ [Guests] [Arrivals] [Departures] [Covers]  ← 2×2 grid  │
├─────────────────────────────────────────────────────────┤
│ TODAY'S ACTIVITIES                          View all → │
│ [Card 1] [Card 2] [Card 3] ←←←  Horizontal scroll      │
├─────────────────────────────────────────────────────────┤
│ DINING TODAY                                View all → │
│ [Slot 1] [Slot 2] [Slot 3] ←←←  Horizontal scroll      │
├─────────────────────────────────────────────────────────┤
│ Trends & Feedback (collapsed by default)                │
└─────────────────────────────────────────────────────────┘
                                              ┌───────┐
                                              │   +   │ ← FAB
                                              └───────┘
```

### 7. Modify: TodayHub.tsx

**File: `src/components/staff/TodayHub.tsx`**

Changes:
1. **Add SmartFAB** — Same as ResortAdminHome
2. **Replace column layout** with stacked cards on mobile
3. **Use HorizontalCardCarousel** for sessions/slots sections
4. **Remove Quick Actions card** at bottom (replaced by FAB)
5. **Typography scaling** — Smaller heading on mobile

### 8. Modify: PriorityCard - Micro-interactions

**File: `src/components/staff/dashboard/PriorityCard.tsx`**

Changes:
1. Add stronger `active:scale-[0.97]` for tap feedback
2. Add subtle `transition-transform duration-100` for snappier feel
3. Add `ring` on focus for accessibility

### 9. CSS Additions

**File: `src/index.css`**

Add new utility classes:

```css
/* Horizontal scroll carousel */
.carousel-scroll {
  @apply flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.carousel-scroll::-webkit-scrollbar {
  display: none;
}

/* Carousel card snap */
.carousel-card {
  @apply snap-start shrink-0;
  scroll-margin-left: 1rem;
}

/* Fade edges for scroll indication */
.carousel-container {
  @apply relative;
}
.carousel-container::after {
  content: '';
  @apply absolute right-0 top-0 bottom-0 w-8 pointer-events-none;
  background: linear-gradient(to right, transparent, hsl(var(--background)));
}

/* FAB animation */
.fab-expanded .fab-action {
  @apply animate-fade-in;
}

/* Sticky shadow when stuck */
.sticky-shadow {
  box-shadow: 0 4px 12px -2px hsl(var(--foreground) / 0.05);
}
```

---

## Files to Modify

| File | Change Type |
|------|-------------|
| `src/components/staff/dashboard/SmartFAB.tsx` | **NEW** — Floating action button |
| `src/components/staff/dashboard/HorizontalCardCarousel.tsx` | **NEW** — Horizontal scroll container |
| `src/components/staff/dashboard/SessionCard.tsx` | **NEW** — Activity session card for carousel |
| `src/components/staff/dashboard/SlotCard.tsx` | **NEW** — Restaurant slot card for carousel |
| `src/components/staff/dashboard/NeedsAttentionCard.tsx` | Modify — Add sticky behavior |
| `src/components/staff/dashboard/PriorityCard.tsx` | Minor — Enhanced micro-interactions |
| `src/components/staff/dashboard/index.ts` | Update — Export new components |
| `src/pages/dashboards/ResortAdminHome.tsx` | Major — Integrate all new components |
| `src/components/staff/TodayHub.tsx` | Major — Integrate FAB and carousels |
| `src/index.css` | Minor — Add carousel utility classes |

---

## Component Architecture

```text
ResortAdminHome.tsx
├── DashboardHeader (sticky)
├── NeedsAttentionCard (sticky on mobile)
├── PriorityCardGrid
│   └── PriorityCard × 4
├── section: Today's Activities
│   ├── Desktop: OperationsSection (existing)
│   └── Mobile: HorizontalCardCarousel
│       └── SessionCard × n
├── section: Dining Today
│   ├── Desktop: OperationsSection (existing)
│   └── Mobile: HorizontalCardCarousel
│       └── SlotCard × n
├── section: Trends & Feedback (collapsible)
└── SmartFAB (fixed position)
```

---

## Animation Specifications

| Element | Animation | Duration |
|---------|-----------|----------|
| FAB expand | scale 1 → 1.1, actions slide up | 200ms spring |
| FAB collapse | scale 1.1 → 1, actions fade out | 150ms ease-out |
| FAB icon rotate | 0 → 45deg | 200ms |
| Card tap | scale 1 → 0.97 | 100ms ease-out |
| Carousel scroll | native momentum | system |
| Sticky shadow | opacity 0 → 1 on stick | 150ms |

---

## Responsive Breakpoints

| Component | Mobile (<768px) | Tablet (768-1024px) | Desktop (>1024px) |
|-----------|-----------------|---------------------|-------------------|
| NeedsAttentionCard | Sticky below header | Static | Static |
| PriorityCardGrid | 2 columns | 2 columns | 4 columns |
| Activities section | Horizontal carousel | 2-column grid | List in card |
| Dining section | Horizontal carousel | 2-column grid | List in card |
| SmartFAB | Visible | Visible | Hidden (use header actions) |
| Typography (h2) | text-xs uppercase | text-sm | text-sm |

---

## Touch Target Compliance

All interactive elements maintain minimum 44×44px touch targets:
- FAB main button: 56×56px
- FAB action items: 48×48px
- SessionCard/SlotCard: Full card is tappable (~280×120px)
- Carousel scroll: Edge-to-edge swipe area

---

## Accessibility Considerations

| Requirement | Implementation |
|-------------|----------------|
| FAB label | `aria-label="Quick actions"` |
| Expanded state | `aria-expanded="true/false"` |
| Carousel role | `role="list"` with `role="listitem"` cards |
| Focus trap | FAB actions trap focus when expanded |
| Reduced motion | Disable FAB animations, instant transitions |
| Screen reader | Announce FAB open/close state changes |

---

## Testing Checklist

- [ ] FAB appears only on mobile/tablet (<1024px)
- [ ] FAB hides when keyboard opens
- [ ] FAB expands with smooth animation
- [ ] FAB actions navigate correctly
- [ ] Horizontal carousel scrolls with momentum
- [ ] Carousel snaps to card boundaries
- [ ] NeedsAttentionCard sticks below header on mobile
- [ ] Sticky shadow appears when stuck
- [ ] Card tap feedback is snappy
- [ ] All touch targets are 44px+
- [ ] Dark mode styling is correct
- [ ] Reduced motion preference is respected

---

## Summary

This phase delivers a high-speed mobile dashboard experience:

1. **Priority Stack** — NeedsAttentionCard sticky at top for constant visibility
2. **Horizontal Carousels** — Activities and Dining sections use swipeable cards on mobile
3. **Smart FAB** — Floating action button with Check-in, Request, and Booking shortcuts
4. **Micro-interactions** — Snappy tap feedback on cards
5. **Scaled Typography** — More content above the fold without sacrificing readability

No business logic, data fetching, or routing is modified — purely UI presentation changes.
