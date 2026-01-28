
# Fix: Guest Requests "Unauthorized: No valid guest session" Error

## Problem Summary

Guest request submissions via the new multi-select flow fail with "Unauthorized: No valid guest session" even though the guest is logged in (localStorage shows a valid session).

**Root Cause:** The `create_service_request_bundle` database function attempts to authenticate the guest via `get_guest_session()`, which reads from JWT claims (`auth.jwt()`). However, Propera's guest portal uses **localStorage-based sessions** (not Supabase Auth), so there is never a JWT present → the function returns null → the RPC throws the error.

**Why the Debug Console shows "Valid":** The Guest Debug Console checks localStorage status, which is valid. But the database RPC expects JWT-based auth which doesn't exist.

---

## Solution

Align `create_service_request_bundle` with all other guest RPCs by accepting explicit `p_guest_id` and `p_resort_id` parameters instead of relying on JWT claims.

---

## Changes Required

### 1. Database Migration

Update the `create_service_request_bundle` function to:
- Accept `p_guest_id` and `p_resort_id` as new top-level parameters
- Remove the `get_guest_session()` call
- Validate the guest belongs to the resort (matching other guest RPCs)

```sql
CREATE OR REPLACE FUNCTION public.create_service_request_bundle(
  p_guest_id uuid,
  p_resort_id uuid,
  payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_check_in_date DATE;
  -- ... rest of existing declares (remove v_guest_session, v_resort_id, v_guest_id) ...
BEGIN
  -- 1) Validate guest belongs to resort
  IF NOT EXISTS (
    SELECT 1 FROM public.guests 
    WHERE id = p_guest_id AND resort_id = p_resort_id
  ) THEN
    RAISE EXCEPTION 'Invalid guest or resort';
  END IF;
  
  -- 2) Check if guest has checked in (pre-arrival restriction)
  SELECT check_in_date INTO v_check_in_date
  FROM public.guests
  WHERE id = p_guest_id;
  
  IF v_check_in_date > CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'GUEST_NOT_CHECKED_IN',
      'message', 'Service requests are available after check-in'
    );
  END IF;
  
  -- 3) Use p_guest_id and p_resort_id throughout instead of v_guest_session values
  -- ... rest of function body unchanged, replacing v_guest_id with p_guest_id
  -- and v_resort_id with p_resort_id ...
END;
$function$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_service_request_bundle(uuid, uuid, jsonb) TO anon;
GRANT EXECUTE ON FUNCTION public.create_service_request_bundle(uuid, uuid, jsonb) TO authenticated;
```

### 2. Frontend Update

Update `src/hooks/useServiceRequests.ts` bundle mutation to pass guest credentials:

```typescript
// In bundleMutation.mutationFn:
const { data, error } = await supabase.rpc('create_service_request_bundle', {
  p_guest_id: guestId,    // From hook parameter
  p_resort_id: resortId,  // From hook parameter
  payload,
});
```

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/[new].sql` | Update `create_service_request_bundle` signature and logic |
| `src/hooks/useServiceRequests.ts` | Pass `p_guest_id` and `p_resort_id` to RPC call |

---

## Technical Details

### Why This Pattern Is Correct

All existing guest RPCs follow this pattern because:
1. Guest authentication uses a custom localStorage session, not Supabase Auth
2. There is no JWT with guest claims (only staff use Supabase Auth)
3. The guest's identity must be passed explicitly with each RPC call
4. Server-side validation confirms the guest exists and belongs to the resort

### Existing Working Examples

- `guest_create_service_request(p_guest_id, p_resort_id, ...)` ✅
- `guest_get_available_sessions(p_guest_id, ...)` ✅
- `guest_get_room_bookings(p_guest_id, p_resort_id)` ✅

### The Old Function's Auth Logic (Being Removed)

```sql
-- This doesn't work for guests (no JWT):
SELECT * INTO v_guest_session FROM public.get_guest_session();
IF v_guest_session IS NULL THEN
  RAISE EXCEPTION 'Unauthorized: No valid guest session';
END IF;
```

### The New Auth Logic (Matching Other Guest RPCs)

```sql
-- This works for guests (explicit params):
IF NOT EXISTS (
  SELECT 1 FROM public.guests 
  WHERE id = p_guest_id AND resort_id = p_resort_id
) THEN
  RAISE EXCEPTION 'Invalid guest or resort';
END IF;
```

---

## Testing

After implementation:
1. Log in as a guest in the Guest Portal
2. Navigate to `/guest/requests`
3. Select one or more request items
4. Tap "Send request"
5. Verify the request submits successfully
6. Verify the request appears in the Staff Portal within 5 seconds

---

## No Breaking Changes

- Single-item requests (`guest_create_service_request`) continue to work unchanged
- Existing frontend already has `guestId` and `resortId` available from context
- RLS policies remain unchanged (requests are created via SECURITY DEFINER function)
