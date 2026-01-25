
# Fix: "Cannot read properties of null (reading 'id')" Error

## Root Cause

The error occurs because `currentResort` from `ResortContext` can become `null` during state transitions, and several components access `currentResort.id` or `currentResort.name` directly after an early-return guard. Due to React's asynchronous state updates, the guard may pass in one render cycle but `currentResort` could become `null` before the component finishes rendering.

This is particularly problematic after the recent fix to `ResortContext.tsx` that added the `userDataLoading` guard - during re-fetches or auth state changes, `currentResort` may be briefly `null`.

---

## Fix Strategy

**Two-pronged approach:**

1. **Fix ResortContext to maintain `currentResort` during loading** - Don't clear `currentResort` when refetching
2. **Add defensive optional chaining in key components** - Belt-and-suspenders safety

---

## Code Changes

### Change 1: Fix ResortContext.tsx - Preserve currentResort during refetch

The issue is that when `userDataLoading` changes or memberships are refetched, we return early but `loading` was previously set. We should not clear `currentResort` unless the user logs out.

**File:** `src/contexts/ResortContext.tsx`

**Before (line 51-67):**
```typescript
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
  
  setLoading(true);
  // ...
```

**After:**
```typescript
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
  // This prevents flicker and null access during refetch
  if (resorts.length === 0) {
    setLoading(true);
  }
  // ...rest of function unchanged
```

---

### Change 2: Add optional chaining to TodayHub.tsx

**File:** `src/components/staff/TodayHub.tsx`

**Line 203 - Change:**
```typescript
// Before
<h1 className="text-2xl sm:text-3xl font-bold text-foreground">
  Today at {currentResort.name}
</h1>

// After  
<h1 className="text-2xl sm:text-3xl font-bold text-foreground">
  Today at {currentResort?.name ?? 'Resort'}
</h1>
```

---

### Change 3: Add optional chaining to OnboardingBanner.tsx

**File:** `src/components/onboarding/OnboardingBanner.tsx`

**Line 82 - Change:**
```typescript
// Before
<h3 className="font-semibold">Finish setting up {currentResort?.name}</h3>

// This is already safe, but double-check line 50 (in fetchOnboardingState)
// Line 50 is inside an if(currentResort) check, so it's safe
```

---

### Change 4: Fix StaffShell to show loader during userDataLoading

The `StaffShell` already shows a loader during `userDataLoading` (lines 52-56), which is correct. However, we should ensure `resortLoading` is also true when we're waiting for memberships.

**File:** `src/contexts/ResortContext.tsx`

The loading state should not be set to `false` until we have actually fetched resorts. Currently in the fix, we return early when `userDataLoading` is true but don't reset loading. Let's ensure loading stays true:

**Update the effect (lines 90-92):**
```typescript
useEffect(() => {
  // Keep loading true while waiting for user data
  if (userDataLoading) {
    setLoading(true);
    return;
  }
  if (user) fetchResorts();
}, [user, memberships.length, superAdmin, userDataLoading]);
```

---

## Summary of Changes

| File | Change |
|------|--------|
| `src/contexts/ResortContext.tsx` | Only set `loading(true)` when no resorts exist; ensure loading stays true during `userDataLoading` |
| `src/components/staff/TodayHub.tsx` | Add optional chaining to `currentResort?.name` in header |

---

## Why This Fixes the Issue

1. **Loading stays true during userDataLoading** → `StaffShell` shows loader instead of rendering child components
2. **Only set loading when no resorts** → Prevents flicker and maintains `currentResort` during refetch
3. **Optional chaining in JSX** → Defensive programming catches any edge cases

---

## Testing

After the fix:
1. Log in as staff user → Dashboard loads with resort name
2. Refresh the page → No "Cannot read properties of null" error
3. Switch resorts → Smooth transition without errors
4. Navigate to /staff/guests → Guest list displays correctly
