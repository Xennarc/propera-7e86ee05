
# Fix Activity Cards Text Wrapping

## Problem Analysis

Looking at the screenshot, the activity session cards on the guest Activities page have text layout issues:

1. **Cramped first line**: The time badge, category badge, and status badge (INSTANT/REQUEST) are all squeezed onto one line
2. **Activity name truncation**: Long names like "Deep Tissue Massage" may truncate awkwardly
3. **Metadata line crowding**: Duration and spots info compete for space with the chevron icon
4. **Visual hierarchy unclear**: Too many elements fighting for attention on the top row

## Solution

Restructure the card layout for better visual hierarchy and prevent awkward text wrapping:

### Layout Changes

**Before (current)**:
```
[Image] [Time] [CatBadge]          [INSTANT]
        Activity Name (truncated)
        Description...
        [60min] [15 spots]             [>]
```

**After (improved)**:
```
[Image] Activity Name                [INSTANT]
        [07:00] · 60min · 15 spots       [>]
```

### Technical Implementation

**File: `src/pages/guest/GuestActivitiesBrowser.tsx`**

1. **Move activity name to top row** - Give it prominence with `truncate` + `min-w-0` for proper ellipsis
2. **Consolidate metadata row** - Combine time, duration, and spots into a single compact line using dot separators
3. **Remove category badge from card** - It's already shown in the category filter chips above; showing it again is redundant
4. **Keep status badge aligned right** - Use `shrink-0` to prevent it from being squished
5. **Use `whitespace-nowrap`** - On compact metadata chips to prevent line breaks within them

### Code Changes

```tsx
<CardContent className="p-4">
  <div className="flex items-center gap-3">
    {/* Image remains same */}
    <div className="relative h-12 w-12 shrink-0 rounded-xl overflow-hidden">
      ...
    </div>
    
    {/* Content area with better structure */}
    <div className="flex-1 min-w-0">
      {/* Top row: Name + Status badge */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="font-semibold text-foreground truncate">
          {session.activity_name}
        </h3>
        <Badge variant="..." className="shrink-0 text-xs whitespace-nowrap">
          {session.requires_approval ? 'Request' : 'Instant'}
        </Badge>
      </div>
      
      {/* Description (optional, single line) */}
      {session.description && (
        <p className="text-sm text-muted-foreground line-clamp-1 mb-1.5">
          {session.description}
        </p>
      )}
      
      {/* Bottom row: Consolidated metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className={cn("font-mono font-medium", config.colorClass)}>
            {session.start_time?.slice(0, 5)}
          </span>
          <span className="text-border">·</span>
          <span className="whitespace-nowrap">{session.duration_minutes}min</span>
          <span className="text-border">·</span>
          <span className={cn(
            "whitespace-nowrap",
            isLowAvailability && 'text-coral font-medium'
          )}>
            {spotsLeft} spots
          </span>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
      </div>
    </div>
  </div>
</CardContent>
```

### Summary of Changes

| Element | Before | After |
|---------|--------|-------|
| Activity name | Second row, truncated | First row, prominent |
| Time badge | Top row with bg/border | Bottom row, minimal styling |
| Category badge | Shown on card | Removed (redundant) |
| Status badge | Top row right | Top row right, `shrink-0` |
| Duration/Spots | Separate icons | Dot-separated inline text |
| Chevron | Colored, large | Muted, smaller |

### Files to Modify

| File | Change |
|------|--------|
| `src/pages/guest/GuestActivitiesBrowser.tsx` | Restructure session card layout for better text hierarchy and prevent wrapping |

### Expected Result

- Activity names are clearly visible and properly truncate with ellipsis
- Compact, scannable metadata row with no awkward wrapping
- Status badge always fully visible
- Cleaner visual hierarchy with less visual noise
- Works well on all screen sizes including narrow mobile (375px)
