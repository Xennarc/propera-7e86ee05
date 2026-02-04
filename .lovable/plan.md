
# Fix Plan: Missing Guest Requests (Housekeeping)

## Root Cause Analysis

I've identified **TWO critical bugs** preventing guest requests from working:

### Bug 1: Wrong Table Name in RPC (Primary Issue)
The `create_service_request_bundle` RPC references a non-existent table:

```sql
-- Line 95 of migration 20260128103451
SELECT * INTO v_catalog_item
FROM public.service_request_catalog  -- ❌ TABLE DOES NOT EXIST
WHERE id = v_catalog_id AND resort_id = p_resort_id AND is_active = true;
```

**Actual table name:** `public.request_catalog`

This causes the RPC to silently fail (caught by EXCEPTION handler) and return:
```json
{"success": false, "error": "INTERNAL_ERROR", "message": "relation \"service_request_catalog\" does not exist"}
```

### Bug 2: Status Value Mismatch (Secondary Issue)
The RPC inserts requests with lowercase `status = 'pending'`, but:
- Existing data uses uppercase: `NEW`, `ACKNOWLEDGED`, `COMPLETED`, `CANCELLED`
- Staff dashboard filters by `status = 'NEW'` (uppercase)
- Guest "My Requests" filters by `['NEW', 'ACKNOWLEDGED', ...]` (uppercase)

Even if the insert succeeded, the request would be invisible in both portals.

### Bug 3: Missing `submission_id` in Guest RPC (Minor Issue)
The `guest_get_service_requests` RPC doesn't return `submission_id`, but the frontend expects it for grouping multi-item requests. This is handled gracefully but limits functionality.

---

## Impact Summary

| Symptom | Root Cause |
|---------|------------|
| Sheet closes, nothing appears | RPC fails silently due to wrong table name |
| No request in "My Requests" | Insert never happens (or wrong status) |
| No request in Staff Dashboard | Insert never happens (or wrong status filter) |
| No error toast shown | Frontend doesn't check RPC `success` field |

---

## Fix Plan

### Phase 1: Database Migration

Create a migration to fix the RPC with correct table name and status:

```sql
-- Fix create_service_request_bundle: wrong table name + wrong status value
CREATE OR REPLACE FUNCTION public.create_service_request_bundle(
  p_guest_id uuid,
  p_resort_id uuid,
  payload jsonb
)
...
  -- Line 95: Fix table name
  SELECT * INTO v_catalog_item
  FROM public.request_catalog  -- ✅ CORRECT TABLE
  WHERE id = v_catalog_id AND resort_id = p_resort_id AND is_active = true;
  
  -- Line 134: Fix status value
  INSERT INTO public.service_requests (
    ...
    status,
    ...
  ) VALUES (
    ...
    'NEW',  -- ✅ UPPERCASE to match existing data
    ...
  )
...
```

### Phase 2: Add `submission_id` to Guest RPC

Update `guest_get_service_requests` to return `submission_id`:

```sql
CREATE OR REPLACE FUNCTION public.guest_get_service_requests(...)
RETURNS TABLE (
  ...
  submission_id UUID  -- Add this column
)
...
SELECT
  ...
  sr.submission_id
FROM public.service_requests sr
...
```

### Phase 3: Improve Frontend Error Handling

Update `useServiceRequests.ts` bundleMutation to check RPC response:

```typescript
// Current code (doesn't check success field)
const { data, error } = await supabase.rpc('create_service_request_bundle', {...});
if (error) throw error;
return data;

// Fixed code
const { data, error } = await supabase.rpc('create_service_request_bundle', {...});
if (error) throw error;

// Check RPC response for business logic errors
const result = data as { success: boolean; error?: string; message?: string; ... };
if (!result.success) {
  throw new Error(result.message || result.error || 'Failed to submit request');
}
return result;
```

Update `GuestRequestsPage.tsx` to handle errors properly:

```typescript
const handleSubmitBundle = async (params: BundleSubmitParams) => {
  try {
    await createBundle({...});
    // Only reset and close on success
    setSelectedItems([]);
    setNotes('');
    setBundleSheetOpen(false);
  } catch (error) {
    // Error toast is shown by mutation's onError
    // Keep sheet open so user can retry
  }
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| New migration | Fix `create_service_request_bundle` table name + status |
| New migration | Add `submission_id` to `guest_get_service_requests` |
| `src/hooks/useServiceRequests.ts` | Check RPC `success` field in bundleMutation |
| `src/pages/guest/GuestRequestsPage.tsx` | Wrap submit in try/catch, don't close on error |

---

## Verification Steps

After fixes, test:

1. **Guest Portal** → `/guest/requests` → Select "Housekeeping" → Submit
2. Verify success toast appears
3. Navigate to "My Requests" → Active should show "1"
4. **Staff Portal** → Requests Dashboard → New lane should show the request
5. On failure, verify error toast appears and sheet stays open

---

## Technical Details

### Current RPC Flow (Broken)
```
Guest submits → RPC starts → 
SELECT FROM service_request_catalog → ❌ TABLE NOT FOUND → 
EXCEPTION caught → Returns {success: false, error: "..."} → 
Frontend ignores result → Sheet closes → No request created
```

### Fixed RPC Flow
```
Guest submits → RPC starts → 
SELECT FROM request_catalog → ✅ Found → 
INSERT with status='NEW' → ✅ Success → 
Returns {success: true, submissionId: "..."} → 
Frontend checks success → Shows toast → Closes sheet → 
Realtime triggers refresh → Request visible in both portals
```
