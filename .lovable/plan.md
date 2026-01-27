
# Enhance Guest Requests UI in Guest Portal

## Overview

This plan focuses on improving the guest requests experience based on the current implementation and UX best practices for mobile-first hospitality apps. The screenshot shows a solid foundation with Quick/Multiple mode switcher, category grid, and My Requests navigation - we'll enhance visual polish, micro-interactions, and usability.

---

## Current State Analysis

| Component | Current State | Enhancement Opportunity |
|-----------|--------------|------------------------|
| Category Grid | 2-column grid with ring icons | Add subtle animations, improved touch feedback |
| Mode Switcher | Segmented control with pulse hint | More prominent visual differentiation between modes |
| Header | Static title with My Requests button | Add welcome context, active request badge |
| Empty States | Basic text + CTA | Friendlier illustrations, contextual tips |
| Multi-Select Bar | Sticky bottom bar | Add haptic-style micro animations |
| Loading States | Basic skeletons | Shimmer animations, staggered loading |

---

## Enhancements

### 1. Enhanced Category Grid (`RequestCategoryGrid.tsx`)

**Visual Improvements:**
- Add subtle hover/tap animations with Framer Motion
- Implement staggered reveal animation on mount
- Add micro-shimmer effect on icon rings
- Improve dark mode contrast for descriptions

**Code Changes:**
```typescript
// Add stagger animation to grid
<motion.div 
  className="grid grid-cols-2 gap-3"
  initial="hidden"
  animate="visible"
  variants={{
    visible: { transition: { staggerChildren: 0.06 } }
  }}
>
  {categories.map((cat) => <CategoryTile ... />)}
</motion.div>

// Add spring animation to CategoryTile
<motion.div
  variants={{
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1 }
  }}
  whileHover={{ scale: 1.02, transition: { type: 'spring', stiffness: 400 } }}
  whileTap={{ scale: 0.97 }}
>
```

**Mobile Optimizations:**
- Increase icon container size from 56px to 60px for better touch targets
- Add subtle background gradient on active state
- Improve ring glow effect on tap

---

### 2. Active Request Badge in Header (`GuestRequestsPage.tsx`)

**Feature:** Show a badge with active request count in the header

```typescript
// Fetch active requests count
const { requests } = useGuestServiceRequests({ guestId, resortId, enabled: !!guest });
const activeCount = requests.filter(r => 
  ['NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS'].includes(r.status)
).length;

// Header UI
<Button variant="outline" size="sm" asChild className="gap-1.5 relative">
  <Link to="/guest/requests/my">
    <ClipboardList className="h-4 w-4" />
    My Requests
    {activeCount > 0 && (
      <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
        {activeCount}
      </span>
    )}
  </Link>
</Button>
```

---

### 3. Enhanced Mode Switcher (`RequestModeSwitcher.tsx`)

**Improvements:**
- Add icon color transition on mode change
- Improve helper text animation with slide effect
- Add subtle background pulse on first visit
- Better visual distinction between modes

```typescript
// Mode-specific styling
const modeStyles = {
  quick: {
    icon: <Zap className="h-4 w-4" />,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    helper: 'One tap, one request'
  },
  multi: {
    icon: <ListChecks className="h-4 w-4" />,
    color: 'text-primary',
    bg: 'bg-primary/10',
    helper: 'Build a list, send together'
  }
};
```

---

### 4. Improved Multi-Select Item Grid (`MultiSelectItemGrid.tsx`)

**Visual Enhancements:**
- Add subtle confetti/sparkle animation when item selected
- Improve quantity badge visibility
- Add category section dividers with icons
- Better selected state with gradient border

```typescript
// Enhanced selected state
<Card className={cn(
  'relative overflow-hidden transition-all duration-200',
  selected && 'ring-2 ring-primary shadow-lg shadow-primary/20',
  selected && 'before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/5 before:to-transparent'
)}>
```

**Section Headers:**
```typescript
// Enhanced section header
<div className="flex items-center gap-2 px-1 mb-2">
  <div className={cn('w-6 h-6 rounded-full flex items-center justify-center border-2', category.ringColor)}>
    <CategoryIcon className="h-3 w-3" />
  </div>
  <h3 className="text-sm font-medium text-foreground">
    {category?.label || categoryKey}
  </h3>
  <span className="text-xs text-muted-foreground">
    ({categoryItems.length} items)
  </span>
</div>
```

---

### 5. Enhanced Multi-Select Bottom Bar (`GuestRequestsPage.tsx`)

**Improvements:**
- Add count animation when items added/removed
- Improve button prominence
- Add subtle shimmer on primary state
- Better empty state messaging

```typescript
// Animated count with spring
<motion.p 
  key={totalSelectedCount}
  initial={{ scale: 1.3, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  className="font-semibold"
>
  {totalSelectedCount} item{totalSelectedCount !== 1 ? 's' : ''} selected
</motion.p>

// Add shimmer effect to bar when items selected
<div className={cn(
  'rounded-2xl shadow-2xl p-4 transition-all duration-300',
  'backdrop-blur-xl border',
  selectedItems.length > 0 && 'animate-shimmer bg-gradient-to-r from-primary via-primary/90 to-primary'
)}>
```

---

### 6. Improved Loading & Empty States

**Skeleton Animations:**
```typescript
// Add shimmer effect to skeletons
<Skeleton className="h-24 rounded-2xl animate-shimmer bg-gradient-to-r from-muted via-muted/80 to-muted" />
```

**Enhanced Empty State for Multi-Select Mode:**
```typescript
// When in multi-select with no items visible
<GuestEmptyState
  icon={ShoppingBag}
  title="Select items from above"
  description="Tap any item to add it to your request"
  className="py-8"
/>
```

---

### 7. Request Quick Sheet Improvements (`RequestQuickSheet.tsx`)

**Enhancements:**
- Add keyboard-safe drawer integration
- Improve common suggestions with 2-column grid
- Add subtle animation on suggestion selection
- Better visual hierarchy

```typescript
// Improved suggestions grid
<div className="grid grid-cols-2 gap-2">
  {COMMON_REQUESTS.map((suggestion) => (
    <motion.button
      whileTap={{ scale: 0.95 }}
      className={cn(
        "p-3 text-left rounded-xl border transition-all",
        requestText === suggestion
          ? "bg-primary text-primary-foreground border-primary shadow-md"
          : "bg-muted/50 hover:bg-muted border-transparent"
      )}
    >
      <span className="text-sm font-medium">{suggestion}</span>
    </motion.button>
  ))}
</div>
```

---

### 8. My Requests Page Improvements (`GuestMyRequestsPage.tsx`)

**Enhancements:**
- Add pull-to-refresh indicator
- Improve filter chips with animated count badges
- Add subtle card hover effects
- Better transition animations between filters

```typescript
// Enhanced filter chips with spring animation
<motion.span 
  layout
  key={count}
  initial={{ scale: 1.2 }}
  animate={{ scale: 1 }}
  className={cn(
    'text-xs px-1.5 py-0.5 rounded-full min-w-[20px] tabular-nums',
    filter === key 
      ? 'bg-primary-foreground/20 text-primary-foreground' 
      : 'bg-muted text-muted-foreground'
  )}
>
  {count}
</motion.span>
```

---

## File Changes Summary

| File | Changes |
|------|---------|
| `src/components/guest/requests/RequestCategoryGrid.tsx` | Stagger animations, enhanced tile interactions |
| `src/components/guest/requests/RequestModeSwitcher.tsx` | Icon colors, improved helper text |
| `src/components/guest/requests/MultiSelectItemGrid.tsx` | Section headers with icons, better selected state |
| `src/pages/guest/GuestRequestsPage.tsx` | Active request badge, animated bottom bar |
| `src/pages/guest/GuestMyRequestsPage.tsx` | Animated filter counts, improved transitions |
| `src/components/guest/RequestQuickSheet.tsx` | Grid suggestions, better keyboard handling |

---

## Mobile UX Considerations

1. **Touch Targets:** All interactive elements maintain 44-48px minimum
2. **Font Sizes:** Minimum 11px for metadata, 16px for inputs
3. **Safe Areas:** Bottom bars account for `env(safe-area-inset-bottom)`
4. **Keyboard Handling:** KeyboardSafeDrawer integration where needed
5. **Animations:** Respect reduced-motion preferences

---

## Animation Performance

- Use `layout` prop sparingly for list reordering
- Prefer CSS transitions for simple state changes
- Use Framer Motion for complex multi-step animations
- Debounce rapid state changes to prevent animation overlap

---

## Summary

These enhancements focus on:
1. **Visual Polish:** Stagger animations, micro-interactions, better color transitions
2. **Usability:** Active request badges, improved touch targets, better feedback
3. **Delight:** Subtle animations on selection, count springs, shimmer effects
4. **Consistency:** Unified animation patterns across all request components

The changes maintain the existing functionality while elevating the visual quality and user experience to match premium hospitality standards.
