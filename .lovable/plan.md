
## Fix: Missing `updated_at` Column and Default Filtering

### Problem Summary

The Staff Requests Dashboard fails with error:
```
"code": "42703",
"message": "column service_requests.updated_at does not exist"
```

Both data-fetching hooks (`useRequestsDashboard.ts` and `useStaffServiceRequests.ts`) query for `updated_at`, but this column does not exist in the `service_requests` table.

---

### Root Cause

The database schema for `service_requests` has individual timestamp columns (`created_at`, `acknowledged_at`, `completed_at`, etc.) but **no generic `updated_at` column**. The query selects `updated_at` on line 74 of `useRequestsDashboard.ts` and line 112 of `useStaffServiceRequests.ts`, causing a PostgreSQL error.

---

### Solution

**Option A (Recommended): Remove `updated_at` from queries**

Since the table tracks specific timestamp events (acknowledged, assigned, completed), we can remove `updated_at` from the SELECT clauses and mapping logic. This is the minimal fix.

**Option B: Add `updated_at` column to database**

Add an `updated_at` column with an automatic trigger to update on row changes. This adds complexity but provides a general "last modified" timestamp.

I recommend **Option A** for simplicity - the specific timestamps are more useful for the dashboard workflow anyway.

---

### Implementation

#### File 1: `src/hooks/useRequestsDashboard.ts`

1. Remove `updated_at` from the SELECT clause (line 74)
2. Remove `updated_at` from the return mapping (line 165)

#### File 2: `src/hooks/useStaffServiceRequests.ts`

1. Remove `updated_at` from the SELECT clause (line 112)
2. Remove `updated_at` from the return mapping (line 195)
3. Update the TypeScript interface `StaffServiceRequest` to remove `updated_at` (line 42)

---

### About Default Filtering

Reviewing the dashboard code confirms that:
- Default filters are `{}` (empty), meaning no assignment filter is applied
- All requests should appear regardless of `assigned_to` status
- The current filtering logic is correct once the query executes successfully

The only blocker is the `updated_at` error preventing any data from loading.

---

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useRequestsDashboard.ts` | Remove `updated_at` from query and mapping |
| `src/hooks/useStaffServiceRequests.ts` | Remove `updated_at` from query, mapping, and interface |

---

### Technical Details

**Current columns in `service_requests`:**
- `created_at` - when request was created
- `acknowledged_at` - when staff acknowledged
- `assigned_at` - when assigned to staff member
- `completed_at` - when marked complete
- `cancelled_at` - when cancelled

These specific timestamps provide better workflow tracking than a generic `updated_at`.

---

### Testing

1. Navigate to `/staff/requests-dashboard?debug=1`
2. Verify console shows successful query with `resultCount > 0`
3. Confirm requests appear in dashboard regardless of assignment status
4. Test creating a new guest request and verify it appears immediately in staff portal
