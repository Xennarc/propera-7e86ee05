

# Fix: Staff Requests Dashboard Not Showing Data

## Problem Summary

Guest requests are being created successfully and exist in the database (10 requests for "The Residence Falhumaafushi"), but the Staff Requests Dashboard shows 0 items despite the debug panel showing correct context:
- `isStaff: true`
- `Source: staff`  
- `Resort: The Residence Falhumaafushi`
- `Role: RESORT_ADMIN`

**Database verification confirms:**
- 10 requests exist for this resort
- RLS functions return `true` when tested with the user's ID
- All related tables (guests, profiles, catalog) are accessible

## Root Cause Analysis

The investigation revealed that while the frontend context is correct, the **Supabase RLS policy is not receiving a valid `auth.uid()`** when queries execute. This causes the RLS policy to deny access (return 0 rows).

The most likely cause is that the **Supabase client session is not being properly attached to requests** on the production domain (`propera.cc`), even though the user's login state appears valid in the React context.

### Evidence Supporting This Conclusion

1. Direct database queries with the user ID return 10 rows
2. RLS function tests pass when given the user ID explicitly
3. React Query shows queries completing (not erroring) but returning 0 items
4. All 10 queries are marked "Slow" - suggesting authentication negotiation delays

## Solution: Two-Part Fix

### Part 1: Add Session Validation Before Queries

Modify `useRequestsDashboard` to verify the Supabase session is valid before executing queries. If the session is missing or expired, trigger a refresh.

**File: `src/hooks/useRequestsDashboard.ts`**

```typescript
// Add session validation at the start of queryFn
queryFn: async () => {
  if (!resortId) return [];

  // Validate Supabase session before querying
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    console.warn('[RequestsDashboard] No active Supabase session, attempting refresh');
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      console.error('[RequestsDashboard] Session refresh failed:', refreshError);
      throw new Error('Authentication session expired. Please sign in again.');
    }
  }

  // Existing query logic continues...
  let query = supabase
    .from('service_requests')
    // ...
};
```

### Part 2: Add Query Debugging for Troubleshooting

Add diagnostic logging to help identify exactly where data is being lost:

**File: `src/hooks/useRequestsDashboard.ts`**

```typescript
const { data, error } = await query;

if (error) {
  console.error('[RequestsDashboard] Query error:', error);
  throw error;
}

// Debug logging (can be removed later)
if (process.env.NODE_ENV === 'development' || window.location.search.includes('debug=1')) {
  console.log('[RequestsDashboard] Query result:', {
    resortId,
    resultCount: data?.length ?? 0,
    sessionValid: !!sessionData?.session,
    userId: sessionData?.session?.user?.id,
  });
}
```

## Files to be Modified

| File | Change |
|------|--------|
| `src/hooks/useRequestsDashboard.ts` | Add session validation and debug logging |

## Technical Details

### Why Session Validation Is Needed

The Supabase client stores the session in `localStorage` and auto-refreshes tokens. However, on custom domains or after extended idle periods, the token might be:
- Expired but not yet auto-refreshed
- Malformed due to localStorage issues
- Missing entirely if cookies/localStorage were cleared

By explicitly checking and refreshing the session before each query, we ensure `auth.uid()` returns the correct user ID for RLS evaluation.

### Why This Wasn't Caught Before

- The React auth context (`useAuth`) maintains its own state derived from Supabase
- The context can show a "logged in" user even if the underlying Supabase session is stale
- RLS operates at the database level using the JWT token, not the React state

## Testing Steps

1. Sign in as a Resort Admin on the production domain
2. Navigate to `/staff/requests-dashboard?debug=1`
3. Open browser console (F12)
4. Look for `[RequestsDashboard]` logs
5. Verify requests now appear in the dashboard
6. Check console for any session refresh messages

## Rollback Plan

If the session validation causes issues:
1. Remove the session check block from `queryFn`
2. Keep the debug logging to gather more information
3. Investigate alternative causes (CORS, domain cookies, etc.)

