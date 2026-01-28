

## Fix: Guest Session Blocking Staff Portal Data Fetch

### Problem
Staff cannot see guest requests in the Staff Portal because `useResortScope()` incorrectly detects them as a "guest" when they have both:
1. A staff login (via Supabase Auth)
2. A guest session in localStorage (from testing the guest portal)

The debug banner confirms this:
- **Scope Debug:** `Source: guest`, `isStaff: false`, `Data: 0 items`
- **Staff Debug Console:** Shows valid staff authentication with Resort Admin role

The query is disabled because `enabled: isStaff` evaluates to `false`.

---

### Root Cause

In `src/hooks/sync/useResortScope.ts`, the guest context check (line 41-52) runs **before** the staff context check:

```typescript
// Guest portal context - runs FIRST
if (guestAuth.guest) {
  return {
    scopeSource: 'guest',
    isStaff: false,  // ← Forces false even for staff!
    // ...
  };
}

// Staff/Admin context - never reached if guest session exists
if (resortContext.currentResort) {
  // ...
}
```

When a staff member also has a guest session in localStorage, the hook returns the guest context **even on staff pages**.

---

### Solution

Update `useResortScope()` to detect the current route and prioritize context accordingly:

1. **On `/staff/*` routes:** Return staff context if the user is authenticated via Supabase Auth (ignore guest session)
2. **On `/guest/*` routes:** Return guest context if a guest session exists
3. **Fallback:** Keep current logic for other routes

**Technical approach:** Use `useLocation()` from React Router to detect the URL pathname.

---

### Implementation

#### File: `src/hooks/sync/useResortScope.ts`

**Changes:**
1. Import `useLocation` from `react-router-dom`
2. Add route detection logic at the start of `useResortScope()`
3. Only return guest context if on a guest route OR if not a staff route and guest session exists

```text
Updated logic flow:
1. Get current pathname from useLocation()
2. Determine if on staff route (/staff/*) or guest route (/guest/*)
3. If on staff route AND user is authenticated → return staff context
4. If on guest route AND guest session exists → return guest context
5. If no specific route match → fallback to existing priority
```

---

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/sync/useResortScope.ts` | Add route-aware context selection |

---

### Edge Cases Handled

1. **Staff testing guest portal:** Staff can have both sessions; each portal uses the correct one
2. **Guest session expired:** Falls back to staff context if authenticated
3. **Staff not authenticated:** Falls back to guest context if guest session exists
4. **Neither authenticated:** Returns `scopeSource: 'none'`

---

### Testing

After implementation:
1. Log in as staff (Resort Admin) at `/staff/auth`
2. Also log in as a guest at `/guest/login` (creates localStorage session)
3. Navigate to `/staff/guest-requests?debug=1`
4. **Expected:** Debug banner shows `Source: staff` or `superadmin`, `isStaff: true`
5. Guest requests created by guests should now appear in the list

