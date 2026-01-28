
# Fix Activity Cards - Correct File

## Root Cause

The previous edits were made to the **wrong file**:

| Route | File Currently Used | File That Was Edited |
|-------|---------------------|----------------------|
| `/guest/activities` | `GuestActivitySessionsPage.tsx` | `GuestActivitiesBrowser.tsx` (unused) |

The route `/guest/activities` in `App.tsx` is wired to render `GuestActivitySessionsPage`, which still has the old "time block on left" layout visible in your screenshot.

`GuestActivitiesBrowser.tsx` was edited but is **not connected to any route** - it's an orphan file.

---

## Solution Options

### Option A: Update `GuestActivitySessionsPage.tsx` (Recommended)

Apply the same card layout improvements directly to the correct file:

**File: `src/pages/guest/GuestActivitySessionsPage.tsx`**

Replace the current card layout (lines 185-256) with:
- Larger 64x64px thumbnail with `rounded-2xl`
- Vertically centered content area using `flex flex-col justify-center`
- Two-row layout: Name + Status / Metadata + Chevron
- Remove the "time block on left" design

```tsx
{sessions.map((session: any) => {
  const spotsLeft = session.remaining_spots;
  const isLowAvailability = spotsLeft > 0 && spotsLeft <= 3;
  const config = getCategoryConfig(session.category);
  
  return (
    <Card
      key={session.id}
      className="guest-card-interactive"
      onClick={() => navigate(`/guest/activities/book/${session.id}`)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Activity Image or Category Icon - 64x64 thumbnail */}
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
          
          {/* Content area - vertically centered */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {/* Top row: Name + Status badge */}
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                {session.activity_name}
              </h3>
              <span className={cn(
                "shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase whitespace-nowrap",
                session.requires_approval 
                  ? "bg-warning/15 text-warning" 
                  : "bg-success/15 text-success"
              )}>
                {session.requires_approval ? 'Request' : 'Instant'}
              </span>
            </div>
            
            {/* Bottom row: Consolidated metadata */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className={cn("font-mono font-medium", config.colorClass)}>
                  {session.start_time?.slice(0, 5)}
                </span>
                <span className="text-border">·</span>
                <span className="whitespace-nowrap">{session.duration_minutes}m</span>
                <span className="text-border">·</span>
                <span className={cn(
                  "whitespace-nowrap",
                  isLowAvailability && spotsLeft > 0 && 'text-coral font-medium'
                )}>
                  {spotsLeft > 0 ? `${spotsLeft} spots` : 'Full'}
                </span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
})}
```

### Option B: Switch the Route to Use `GuestActivitiesBrowser`

Update `App.tsx` to point to the already-edited file:

```tsx
// Change line 317 from:
<Route path="activities" element={<GuestActivitySessionsPage />} />
// To:
<Route path="activities" element={<GuestActivitiesBrowser />} />
```

**Risk**: This would also bring in search input, different header styling, and different category chip styling from `GuestActivitiesBrowser` - may change more than intended.

---

## Recommended Approach

**Option A** is preferred because:
1. It preserves the existing header and filter behavior of `GuestActivitySessionsPage`
2. Only changes the card layout as intended
3. Doesn't risk breaking other functionality

---

## Additional Cleanup

Add the `CategoryIcon` import to `GuestActivitySessionsPage.tsx`:

```tsx
import { CategoryIcon } from '@/components/ui/category-badge';
```

Add the `image_url` field if not already in the RPC response (needs verification with database query).

---

## Technical Summary

| File | Change |
|------|--------|
| `src/pages/guest/GuestActivitySessionsPage.tsx` | Replace time-block layout with 64px thumbnail + centered two-row content |
| `src/pages/guest/GuestActivitiesBrowser.tsx` | Consider removing (orphan file) or keeping for future use |

---

## Validation After Implementation

1. Navigate to `/guest/activities` on the published site
2. Verify cards show 64x64 thumbnails on the left
3. Verify activity name and status badge are on the top row
4. Verify time, duration, and spots are on the bottom row with dot separators
5. Verify content is vertically centered relative to the thumbnail
