

# Minimal Icon Styling Update for Guest Requests Page

## Goal
Update the category icons to match the reference image's clean, minimal aesthetic: circular ring borders with colored line icons instead of filled gradient backgrounds.

## Current vs Target

| Aspect | Current | Target (Reference) |
|--------|---------|-------------------|
| Container shape | `rounded-2xl` (rounded square) | `rounded-full` (circle) |
| Container fill | Solid gradient background | Transparent with colored ring border |
| Icon color | White | Same color as the ring |
| Border | None | 2px colored ring |

## Color Mapping

The reference uses distinct ring colors per category:
- Housekeeping: Cyan/teal ring
- Minibar: Red ring
- Toiletries: Teal ring
- Laundry: Purple ring
- Maintenance: Green ring
- In-Room Dining: Pink/magenta ring
- Amenities: Yellow/lime ring
- Other: Pink ring

## Technical Changes

### File: `src/components/guest/requests/RequestCategoryGrid.tsx`

1. **Update CategoryConfig interface** - Change `color` from gradient class to border/text color classes:
```typescript
interface CategoryConfig {
  key: string;
  label: string;
  icon: LucideIcon;
  description?: string;
  ringColor: string;  // e.g., 'border-cyan-400 text-cyan-400'
}
```

2. **Update categoryConfigs** - Replace gradient colors with ring/icon color classes:
```typescript
{
  key: 'HOUSEKEEPING',
  label: 'Housekeeping',
  icon: Sparkles,
  description: 'Room cleaning & fresh towels',
  ringColor: 'border-cyan-400 text-cyan-400',
},
// ... similar for all categories
```

3. **Update CategoryTile icon container styling**:
```typescript
// FROM:
<div className={cn(
  'w-12 h-12 rounded-2xl flex items-center justify-center',
  'bg-gradient-to-br shadow-lg',
  category.color
)}>
  <Icon className="h-6 w-6 text-white" />
</div>

// TO:
<div className={cn(
  'w-14 h-14 rounded-full flex items-center justify-center',
  'border-2 bg-transparent',
  category.ringColor
)}>
  <Icon className="h-6 w-6" />
</div>
```

4. **Simplify hover effect** - Remove gradient overlay on hover, keep subtle scale effect

## Visual Result

Each category tile will display:
- A clean circular ring in the category's accent color
- A line-style icon inside in matching color
- Card background remains the same dark surface
- Minimal, premium look matching the app's theme

## Files Modified

| File | Change |
|------|--------|
| `src/components/guest/requests/RequestCategoryGrid.tsx` | Update icon styling from gradient fill to ring border |

## No Breaking Changes

- The `CategoryConfig` interface keeps the same shape (just rename `color` -> `ringColor`)
- All other components using `categoryConfigs` will continue to work
- The click handlers and grid layout remain unchanged

