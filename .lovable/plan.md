

# Mobile-First No-Zoom Improvements - Phase 2

## Goal
Ensure all staff portal elements are readable and tappable without pinch-zoom. This builds on the Phase 1 improvements already implemented (navigation, card layouts, basic spacing) by targeting remaining problematic areas: tiny text, undersized touch targets, and cramped layouts.

---

## Problem Areas Identified

### 1. Text Too Small for Mobile Readability

| Component | Current Size | Issue |
|-----------|--------------|-------|
| Badge text in sidebar/cards | `text-2xs` (10px) | Unreadable without zoom |
| Guest bottom nav labels | `text-[10px]` | Too small for quick glance |
| Calendar day labels | `text-[10px]` | Difficult to read outdoors |
| Stat card descriptions | `text-[11px]` | Strains eyes on small screens |
| Filter chips small text | `text-[10px]` | Barely visible |
| Command bar shortcuts | `text-2xs` | Not important on mobile anyway |

### 2. Touch Targets Under 44px

| Component | Current | Required |
|-----------|---------|----------|
| Calendar day cells | 36px × 36px | 44px × 44px |
| Checkbox | 16px × 16px | Should have 44px hit area |
| Switch | 24px × 44px | 28px × 48px for easier tapping |
| Dropdown menu items | ~32px height | 44px minimum |
| Filter chips remove button | ~16px | 32px with padding |
| Badge close buttons | ~12px | 28px tap target |

### 3. Dense Layouts Needing Simplification

| Area | Issue | Solution |
|------|-------|----------|
| TodayAtAGlance cards | 3-column on mobile | 1-column stack |
| Dashboard stat grid | 2-col with small gaps | Larger gaps, bigger cards |
| Filter bar | Cramped on mobile | Stack vertically |
| Activity/Restaurant list rows | Side-by-side layout | Stacked on mobile |

---

## Implementation Plan

### Phase 2A: Typography Minimum Sizes

**File: `src/index.css`**

Add new mobile-safe text utility classes:

```css
/* Mobile-safe minimum text sizes */
@layer utilities {
  /* Replace text-2xs (10px) with mobile-safe minimum */
  .text-mobile-min {
    @apply text-[11px] sm:text-xs;
  }
  
  /* Badge text - readable on mobile */
  .text-badge-mobile {
    @apply text-[11px] sm:text-[10px];
  }
  
  /* Navigation label - clear at a glance */
  .text-nav-label {
    @apply text-[11px] sm:text-xs font-medium;
  }
}
```

### Phase 2B: Component Updates

#### 1. Badge Component (`src/components/ui/badge.tsx`)

**Current:** `px-2.5 py-0.5 text-xs`
**Change:** Add size variant for mobile-friendly badges

```tsx
const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-semibold transition-colors",
  {
    variants: {
      variant: { /* existing */ },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[11px]",  // Mobile minimum
        lg: "px-3 py-1 text-sm",        // For emphasis
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

#### 2. Checkbox Component (`src/components/ui/checkbox.tsx`)

**Current:** `h-4 w-4` (16px)
**Change:** Increase size and add touch padding

```tsx
<CheckboxPrimitive.Root
  className={cn(
    // Increase visual size for mobile
    "peer h-5 w-5 shrink-0 rounded-md border border-primary",
    // Add invisible touch target padding
    "relative before:absolute before:-inset-2 before:content-['']",
    // ... rest
  )}
/>
```

#### 3. Switch Component (`src/components/ui/switch.tsx`)

**Current:** `h-6 w-11` with `h-5 w-5` thumb
**Change:** Larger mobile-friendly size

```tsx
<SwitchPrimitives.Root
  className={cn(
    // Larger for mobile
    "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full",
    // ...
  )}
>
  <SwitchPrimitives.Thumb
    className={cn(
      // Larger thumb
      "pointer-events-none block h-6 w-6 rounded-full bg-background shadow-lg",
      "data-[state=checked]:translate-x-5",
      // ...
    )}
  />
</SwitchPrimitives.Root>
```

#### 4. Calendar Component (`src/components/ui/calendar.tsx`)

**Current:** Day cells are `h-9 w-9` (36px)
**Change:** Increase to 44px minimum on mobile

```tsx
classNames={{
  head_cell: "text-muted-foreground rounded-md w-11 font-medium text-xs",  // was w-9
  cell: "h-11 w-11 text-center text-sm p-0 relative ...",  // was h-9 w-9
  day: cn(buttonVariants({ variant: "ghost" }), "h-11 w-11 p-0 font-normal ..."),  // was h-9 w-9
}}
```

#### 5. Dropdown Menu Items (`src/components/ui/dropdown-menu.tsx`)

**Current:** `py-2` (~32px total height)
**Change:** Increase to 44px minimum

```tsx
<DropdownMenuPrimitive.Item
  className={cn(
    // Increase padding for 44px touch target
    "relative flex cursor-default select-none items-center rounded-lg px-3 py-3 text-sm outline-none min-h-[44px]",
    // ...
  )}
/>
```

Also update `DropdownMenuCheckboxItem` and `DropdownMenuRadioItem` similarly.

#### 6. Select Items (`src/components/ui/select.tsx`)

**Current:** `py-2.5` 
**Change:** Ensure minimum 44px height

```tsx
<SelectPrimitive.Item
  className={cn(
    "relative flex w-full cursor-default select-none items-center rounded-lg py-3 pl-8 pr-3 text-sm outline-none min-h-[44px]",
    // ...
  )}
/>
```

#### 7. Tabs Component (`src/components/ui/tabs.tsx`)

**Current:** `px-4 py-2`
**Change:** Larger touch targets on mobile

```tsx
<TabsPrimitive.Trigger
  className={cn(
    // Mobile-first sizing
    "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-3 sm:py-2 text-sm font-medium min-h-[44px]",
    // ...
  )}
/>
```

### Phase 2C: Layout Responsiveness

#### 1. TodayAtAGlance (`src/components/staff/TodayAtAGlance.tsx`)

**Current:** `grid gap-4 sm:grid-cols-3`
**Change:** Single column on smallest screens, full-width cards

```tsx
<div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
  {metrics.map((metric) => (
    <Link
      key={metric.label}
      to={metric.href}
      className={cn(
        // Larger padding for mobile
        "group relative p-5 sm:p-4 rounded-xl border border-border/50 bg-card transition-all duration-200",
        // ...
      )}
    >
```

Also increase icon container size:
```tsx
<div className={cn(
  'flex h-12 w-12 sm:h-10 sm:w-10 items-center justify-center rounded-lg',  // was h-10 w-10
  // ...
)}>
  {React.cloneElement(metric.icon as React.ReactElement, {
    className: 'h-6 w-6 sm:h-5 sm:w-5'  // was h-5 w-5
  })}
</div>
```

#### 2. Dashboard Stat Grid (`src/pages/dashboards/ResortAdminHome.tsx`)

**Current:** `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`
**Change:** 1-column on very small screens with larger gaps

```tsx
<div className="grid gap-4 sm:gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
```

Also need to add `xs` breakpoint to Tailwind config (already exists if not, add to `tailwind.config.ts`).

#### 3. Activity/Restaurant List Items (Dashboard)

**Current:** Side-by-side info in list rows
**Change:** Stack on mobile with clearer hierarchy

```tsx
<Link
  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 sm:p-3 rounded-lg hover:bg-muted/50 transition-colors group gap-2"
>
  {/* Mobile: stack vertically */}
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Clock className="h-4 w-4" />
      <span className="font-mono">{session.start_time.slice(0, 5)}</span>
    </div>
    <span className="font-medium text-base sm:text-sm group-hover:text-primary transition-colors">
      {session.activities?.name}
    </span>
  </div>
  {/* Capacity on second row on mobile */}
  <div className="flex items-center justify-between sm:justify-end gap-3 pl-6 sm:pl-0">
    <span className="text-sm text-muted-foreground">
      {session.confirmedPax}/{session.capacity} pax
    </span>
    <Badge variant={...} className="text-xs">
      {session.occupancy}%
    </Badge>
  </div>
</Link>
```

#### 4. Filter Bar Mobile Stacking (`src/components/ui/enhanced-filter-bar.tsx`)

**Current:** Flex row with wrap
**Change:** Full-width stacked inputs on mobile

```tsx
export function EnhancedFilterBar({ children, className }: EnhancedFilterBarProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        {children}
      </div>
    </div>
  );
}
```

And for FilterSearch:
```tsx
<input
  className={cn(
    // Full height input on mobile
    'h-12 sm:h-9 w-full rounded-xl border border-input bg-background px-4 py-3 sm:py-1 text-sm',
    // ...
  )}
/>
```

### Phase 2D: Guest Portal Specific

#### 1. Bottom Nav Labels (`src/components/guest/GuestLayout.tsx`)

**Current:** `text-[10px] sm:text-[11px]`
**Change:** Minimum 11px with better contrast

```tsx
<span className={cn(
  "text-[11px] sm:text-xs font-medium transition-all",
  isActive && "font-bold text-primary"
)}>
  {label}
</span>
```

#### 2. Request Status Pills (`src/components/guest/requests/RequestStatusPill.tsx`)

**Current:** Small size is `text-[10px]`
**Change:** Minimum 11px

```tsx
size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'
```

#### 3. Category Grid Descriptions

**Current:** `text-[11px]`
**Change:** Increase to `text-xs` on all screens for readability

```tsx
{category.description && (
  <p className="text-xs text-muted-foreground line-clamp-1">
    {category.description}
  </p>
)}
```

### Phase 2E: Dialog/Drawer Content Sizing

#### 1. Dialog Content (`src/components/ui/dialog.tsx`)

Ensure dialogs don't require horizontal scrolling:

```tsx
<DialogPrimitive.Content
  className={cn(
    // Full width on mobile with inset for safe area
    "fixed left-[50%] top-[50%] z-50 grid w-[calc(100%-2rem)] sm:w-full max-w-lg translate-x-[-50%] translate-y-[-50%]",
    "max-h-[90vh] overflow-y-auto",  // Prevent overflow
    // ...
  )}
/>
```

#### 2. Sheet Width on Mobile (`src/components/ui/sheet.tsx`)

**Current:** `w-3/4 sm:max-w-sm` for right/left
**Change:** Nearly full width on smallest screens

```tsx
side: {
  left: "inset-y-0 left-0 h-full w-[85%] sm:w-3/4 border-r sm:max-w-sm ...",
  right: "inset-y-0 right-0 h-full w-[85%] sm:w-3/4 border-l sm:max-w-sm ...",
}
```

### Phase 2F: Drawer Improvements (`src/components/ui/drawer.tsx`)

Increase handle size for easier grab:

```tsx
<DrawerPrimitive.Content
  className={cn(
    "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-3xl border bg-background",  // Larger radius
    className,
  )}
>
  {/* Larger, more visible handle */}
  <div className="mx-auto mt-4 h-1.5 w-16 rounded-full bg-muted-foreground/30" />
  {children}
</DrawerPrimitive.Content>
```

Also increase padding in header/footer:

```tsx
const DrawerHeader = ({ className, ...props }) => (
  <div className={cn("grid gap-1.5 p-5 text-center sm:text-left", className)} {...props} />
);

const DrawerFooter = ({ className, ...props }) => (
  <div className={cn("mt-auto flex flex-col gap-3 p-5", className)} {...props} />
);
```

---

## Files to Modify Summary

| File | Change Type |
|------|-------------|
| `src/index.css` | Add mobile-safe text utilities |
| `src/components/ui/badge.tsx` | Add size variant |
| `src/components/ui/checkbox.tsx` | Increase size + touch target |
| `src/components/ui/switch.tsx` | Increase size for mobile |
| `src/components/ui/calendar.tsx` | 44px minimum day cells |
| `src/components/ui/dropdown-menu.tsx` | 44px item height |
| `src/components/ui/select.tsx` | 44px item height |
| `src/components/ui/tabs.tsx` | Larger touch targets |
| `src/components/ui/dialog.tsx` | Prevent horizontal overflow |
| `src/components/ui/sheet.tsx` | Wider on small screens |
| `src/components/ui/drawer.tsx` | Larger handle, more padding |
| `src/components/ui/enhanced-filter-bar.tsx` | Full-width mobile stacking |
| `src/components/staff/TodayAtAGlance.tsx` | Single column on mobile |
| `src/pages/dashboards/ResortAdminHome.tsx` | Better stat grid + list items |
| `src/components/guest/GuestLayout.tsx` | Larger nav labels |
| `src/components/guest/requests/RequestStatusPill.tsx` | Minimum 11px text |
| `src/components/guest/requests/RequestCategoryGrid.tsx` | Larger description text |

---

## Testing Checklist

After implementation:

- [ ] All text readable at arm's length on iPhone SE (smallest common screen)
- [ ] All buttons/checkboxes/switches tappable with thumb tip (44px)
- [ ] Calendar days easily selectable without misclicks
- [ ] Dropdown menus scrollable without zoom
- [ ] Filter bars usable with one hand
- [ ] Dashboard cards readable without squinting
- [ ] No horizontal scrolling on any page
- [ ] Dialogs/sheets don't overflow screen edges

---

## Technical Notes

### Tailwind `xs` Breakpoint

If not already present, add to `tailwind.config.ts`:

```ts
theme: {
  screens: {
    'xs': '375px',  // iPhone SE and up
    // ... existing sm, md, lg, xl
  }
}
```

### Safe Minimum Sizes Reference

| Element Type | Min Font | Min Touch Target |
|--------------|----------|------------------|
| Body text | 14px (text-sm) | - |
| Labels/metadata | 11px | - |
| Navigation | 11px | 44px × 44px |
| Badges | 11px | 32px if interactive |
| Buttons | 14px | 44px height |
| Form inputs | 16px (prevents iOS zoom) | 48px height |

