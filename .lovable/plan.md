
# Fix: /staff/guests Crash ("Cannot read properties of null (reading 'id')")

## Root Cause Analysis

After thorough investigation, I identified **multiple potential crash points** where `currentResort` is accessed without proper null guards during state transitions:

### Primary Crash Points Found

| Location | Issue |
|----------|-------|
| `GuestsPage.tsx:88` | `currentResort.id` accessed in prearrival settings queryFn without null check (inside `if (!currentResort)` but queryFn can be cached) |
| `GuestsPage.tsx:105` | `currentResort?.id \|\| ''` passes empty string to `usePrearrivalStatuses` which may cause unexpected query behavior |
| `ResortContext.tsx` | Race condition: `loading` can become `false` while `currentResort` is still `null` during auth transitions |
| `StaffShell.tsx:73-79` | `resortLoading` check exists but doesn't account for `currentResort` being null after loading completes |

### Why This Happens

1. **ResortContext Race Condition**: When `userDataLoading` changes from `true` to `false`, the `fetchResorts` function is called but hasn't completed yet. During this window, `loading` might be `false` but `currentResort` is still `null`.

2. **Query Hook Execution**: React Query hooks like `useGuestsQuery` and `usePrearrivalStatuses` are called unconditionally at the top of the component. Even with `enabled: !!currentResort`, the hooks are instantiated and their internal logic runs.

3. **Child Component Mounting**: Components like `GuestsSummaryStrip`, `GuestListToolbar`, etc. are rendered after the `if (!currentResort)` guard, but during re-renders triggered by state changes, React may attempt to access stale props.

---

## Fix Strategy

**Three-layer defense:**

1. **Layer 1 (ResortContext)**: Ensure `loading` stays `true` until `currentResort` is set
2. **Layer 2 (StaffShell)**: Add explicit guard for `currentResort === null` after loading
3. **Layer 3 (GuestsPage)**: Defensive null checks and improved early return logic

---

## Implementation Details

### Change 1: Fix ResortContext Race Condition

**File:** `src/contexts/ResortContext.tsx`

**Problem:** `setLoading(false)` is called at line 93 even if `currentResort` wasn't set (e.g., when memberships array is empty but user exists).

**Fix:** Only set `loading: false` after `restoreOrSelectResort` is complete or explicitly when there are no resorts.

```typescript
// Line 52-94: Update fetchResorts function
const fetchResorts = async () => {
  if (!user) {
    setResorts([]);
    setCurrentResortState(null);
    setLoading(false);
    return;
  }
  
  // Wait for user data (including memberships) to finish loading
  if (userDataLoading) {
    return;
  }
  
  // Only show loading state if we don't have any resorts yet
  if (resorts.length === 0) {
    setLoading(true);
  }
  
  try {
    if (isSuperAdmin()) {
      const { data, error } = await supabase.from('resorts').select('*').order('name');
      if (!error && data) {
        const typedData = data as Resort[];
        setResorts(typedData);
        restoreOrSelectResort(typedData);
      }
    } else {
      const memberResortIds = memberships.map(m => m.resort_id);
      if (memberResortIds.length === 0) {
        setResorts([]);
        setCurrentResortState(null);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.from('resorts').select('*').in('id', memberResortIds).order('name');
      if (!error && data) {
        const typedData = data as Resort[];
        setResorts(typedData);
        restoreOrSelectResort(typedData);
      }
    }
  } finally {
    // Always ensure loading is set to false after the fetch completes
    setLoading(false);
  }
};
```

### Change 2: Add Resort Null Guard to StaffShell

**File:** `src/components/staff/StaffShell.tsx`

**Problem:** `resortLoading` can be `false` while `currentResort` is `null` (user has memberships but resort isn't selected yet).

**Fix:** Add additional guard after `resortLoading` check.

```typescript
// After line 79, add:
const { currentResort, loading: resortLoading } = useResort();

// ... existing loading checks ...

if (resortLoading) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <ProperaLoader size={64} text="Loading resorts..." />
    </div>
  );
}

// NEW: Add guard for currentResort null state when user has memberships
// This handles the edge case where loading finished but resort selection is pending
if (!currentResort && permissions.hasAnyResortAccess) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <ProperaLoader size={64} text="Selecting resort..." />
    </div>
  );
}
```

### Change 3: Harden GuestsPage Query Hooks

**File:** `src/pages/guests/GuestsPage.tsx`

**Problem:** Hooks are called with potentially null resort data.

**Fix:** Ensure all hooks properly handle null state.

```typescript
// Line 63: Safely extract resortId at the top
const { currentResort, loading: resortLoading } = useResort();
const resortId = currentResort?.id;

// Line 72-75: Already correct with enabled guard, but ensure consistency
const { data: guests = [], isLoading: loading } = useGuestsQuery({
  resortId: resortId,  // Use extracted variable
  enabled: !!resortId, // More explicit
});

// Line 81-94: Fix prearrival settings query
const { data: prearrivalSettings } = useQuery({
  queryKey: ['prearrival-settings', resortId ?? 'none'],
  queryFn: async () => {
    if (!resortId) return null;  // Use extracted resortId
    const { data, error } = await supabase
      .from('prearrival_settings')
      .select('is_enabled')
      .eq('resort_id', resortId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },
  enabled: !!resortId,  // Use extracted resortId
});

// Line 103-107: Fix prearrival statuses
const { data: prearrivalStatuses } = usePrearrivalStatuses({
  guestIds,
  resortId: resortId || '',  // Already handles null, but use extracted var
  enabled: prearrivalEnabled && guestIds.length > 0 && !!resortId,  // Add resortId check
});
```

### Change 4: Improve Loading/Empty State in GuestsPage

**File:** `src/pages/guests/GuestsPage.tsx`

**Problem:** Early return at line 197-205 shows a message but doesn't handle the loading transition well.

**Fix:** Show proper loading skeleton when resort context is loading.

```typescript
// Line 197-205: Improve early return with loading state
const { currentResort, loading: resortLoading } = useResort();

// Show loading state while resort is loading
if (resortLoading) {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Guests"
        description="Manage resort guests and their stays"
      />
      <StatCardGridSkeleton count={5} />
      <Card>
        <CardContent className="p-8">
          <LoadingPage />
        </CardContent>
      </Card>
    </div>
  );
}

// Show empty state if no resort (user has no memberships)
if (!currentResort) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-muted-foreground">Please select a resort first</p>
        <p className="text-sm text-muted-foreground/70">
          If you don't see any resorts, contact your administrator.
        </p>
      </CardContent>
    </Card>
  );
}
```

### Change 5: Add Minimal Debug Logging

**File:** `src/pages/guests/GuestsPage.tsx`

**Problem:** No visibility when null access occurs.

**Fix:** Add single-fire warning log for debugging.

```typescript
// At the top of GuestsPageContent, after hooks
import { useRef, useEffect } from 'react';

// Inside component:
const hasLoggedNullWarning = useRef(false);

useEffect(() => {
  if (!currentResort && !resortLoading && !hasLoggedNullWarning.current) {
    hasLoggedNullWarning.current = true;
    console.warn('[GuestsPage] currentResort is null after loading', {
      resortLoading,
      pathname: window.location.pathname,
    });
  }
  // Reset when resort becomes available
  if (currentResort) {
    hasLoggedNullWarning.current = false;
  }
}, [currentResort, resortLoading]);
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/contexts/ResortContext.tsx` | Wrap fetchResorts in try/finally, ensure loading states are consistent |
| `src/components/staff/StaffShell.tsx` | Add null resort guard after loading check |
| `src/pages/guests/GuestsPage.tsx` | Extract resortId, add resortLoading check, improve early returns, add debug logging |

---

## Regression Prevention

| Scenario | How Handled |
|----------|-------------|
| User with 1 resort opens /staff/guests | Resort auto-selected, page loads normally |
| User with multiple resorts switches quickly | Loading state shown during transition |
| User with 0 resorts opens /staff/guests | Clear empty state with help text |
| Hard refresh on /staff/guests | Loading skeleton shown until resort loads |
| Navigate Dashboard → Guests | No crash, smooth transition |

---

## Testing Checklist

```text
[ ] Staff user with 1 resort → open /staff/guests (loads correctly)
[ ] Staff user with multiple resorts → switch resorts 5x quickly (no crash)
[ ] Staff user with 0 resorts → open /staff/guests (empty state, no crash)
[ ] Hard refresh on /staff/guests (loading skeleton, then content)
[ ] Navigate from Dashboard → Guests (smooth transition)
[ ] Open guest detail, return to list (no crash)
[ ] Use search/filters rapidly (no crash)
[ ] Open preview drawer (no crash)
[ ] Select guests, use bulk actions (no crash)
```

---

## Summary

This fix addresses the "Cannot read properties of null (reading 'id')" crash through:

1. **Eliminating the race condition** in ResortContext where loading could be false while currentResort was null
2. **Adding a shell-level guard** to prevent any page from rendering until resort is available
3. **Hardening the GuestsPage** with explicit resortId extraction and proper loading states
4. **Adding minimal logging** for future debugging without spamming the console

The changes are additive and preserve all existing functionality.
