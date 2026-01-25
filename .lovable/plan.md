
# Fix: Guest List Not Showing on /staff/guests

## Root Cause Analysis

The guest list fails to display due to a **race condition** in `ResortContext.tsx`. When a user logs in:

1. `AuthContext` begins fetching user profile and resort memberships asynchronously
2. `ResortContext`'s `useEffect` runs immediately with `memberships = []` (not yet loaded)
3. Because `memberships.length === 0`, the code early-returns with `loading: false` and empty resorts
4. `GuestsPage` renders with `currentResort = null`, showing "Please select a resort first" or empty state
5. When memberships finally load, the effect *should* re-run, but there's a secondary bug in the dependency array

**Secondary Issue**: The dependency array includes `isSuperAdmin()` as a function call, which is a React anti-pattern that can cause stale closures and missed updates.

---

## Technical Fix

### File: `src/contexts/ResortContext.tsx`

**Change 1: Import `userDataLoading` from AuthContext**

Add `userDataLoading` to the destructured values from `useAuth()`:

```typescript
const { user, isSuperAdmin, memberships, userDataLoading } = useAuth();
```

**Change 2: Add guard in `fetchResorts` to wait for user data**

Before deciding there are no memberships, ensure user data has finished loading:

```typescript
const fetchResorts = async () => {
  if (!user) {
    setResorts([]);
    setCurrentResortState(null);
    setLoading(false);
    return;
  }
  
  // ADD THIS GUARD: Don't fetch until user data (memberships) is loaded
  if (userDataLoading) {
    return; // Wait for userDataLoading to be false
  }
  
  setLoading(true);
  // ... rest of function unchanged
};
```

**Change 3: Fix the `useEffect` dependency array**

Replace `isSuperAdmin()` function call with a stable reference:

```typescript
// Store the result in a variable for stable dependency
const superAdmin = isSuperAdmin();

useEffect(() => {
  if (user && !userDataLoading) fetchResorts();
}, [user, memberships.length, superAdmin, userDataLoading]);
```

---

## Complete Code Change

```text
File: src/contexts/ResortContext.tsx

Line 22 - Add userDataLoading:
  const { user, isSuperAdmin, memberships, userDataLoading } = useAuth();

Lines 51-57 - Add userDataLoading guard:
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
    // ... rest unchanged

Lines 85-87 - Fix useEffect:
  const superAdmin = isSuperAdmin();
  
  useEffect(() => {
    if (user && !userDataLoading) fetchResorts();
  }, [user, memberships.length, superAdmin, userDataLoading]);
```

---

## Why This Fixes the Issue

| Problem | Solution |
|---------|----------|
| Effect runs before memberships are loaded | Added `userDataLoading` guard to wait |
| `isSuperAdmin()` in dependency array causes issues | Store result in `superAdmin` variable |
| Early return with empty resorts | Guard prevents premature decision |

---

## Data Flow After Fix

```text
1. User logs in
2. AuthContext sets userDataLoading = true, fetches profile + memberships
3. ResortContext effect runs → userDataLoading is true → returns early (stays in loading state)
4. AuthContext completes → userDataLoading = false, memberships populated
5. ResortContext effect re-runs → userDataLoading is false → fetches resorts correctly
6. currentResort is set → GuestsPage query runs → guest list displays
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/contexts/ResortContext.tsx` | Add `userDataLoading` import, add guard in `fetchResorts`, fix `useEffect` dependency array |

---

## Testing

After the fix:
1. Log in as a staff user → Guest list should load
2. Switch resorts → Guest list should update
3. Refresh page while logged in → Guest list should load without "Please select a resort" flash
4. Log in as super admin → All resorts accessible, guest list loads
