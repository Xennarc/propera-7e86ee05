
# Fix: Driver Assignment Empty Dropdown

## Problem Summary
When a Resort Admin opens the "Add Driver" dialog, no staff members appear in the dropdown despite there being eligible staff in the resort. The UI incorrectly shows "All staff members are already registered as drivers" when in reality the RLS policies are preventing the data from being fetched.

Additionally, the user mentions "no CTA to enter driver mode" - this is expected behavior since the Driver Mode card only appears for users who are already registered as drivers.

## Root Cause

The `useEligibleDrivers` hook queries `resort_memberships` with an INNER JOIN to `profiles`:

```typescript
const { data: memberships } = await supabase
  .from('resort_memberships')
  .select(`user_id, resort_role, profiles!inner(id, full_name)`)
  .eq('resort_id', resortId);
```

This creates a **circular RLS evaluation problem**:

1. `resort_memberships` has RLS policy `transport_staff_view_memberships` that uses `staff_can_write_transport()`
2. The INNER JOIN to `profiles` triggers the `profiles` RLS policy
3. The `profiles` policy `Staff can view profiles in same resort` does its own join back to `resort_memberships`:
   ```sql
   EXISTS (
     SELECT 1 FROM resort_memberships my_membership
     JOIN resort_memberships their_membership ON ...
   )
   ```

This nested RLS evaluation can fail silently, returning empty results.

---

## Solution

### Approach: Create a SECURITY DEFINER RPC

Create a PostgreSQL function with `SECURITY DEFINER` that bypasses RLS for fetching eligible drivers. This is the same pattern used successfully in other parts of the app (e.g., `superadmin_list_users_filtered`).

### Database Changes

Create a new RPC function `get_eligible_drivers_for_resort`:

```sql
CREATE OR REPLACE FUNCTION public.get_eligible_drivers_for_resort(
  _resort_id uuid
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  resort_role resort_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller has transport write access
  IF NOT public.staff_can_write_transport(auth.uid(), _resort_id) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions';
  END IF;

  -- Return eligible staff (not already drivers)
  RETURN QUERY
  SELECT 
    rm.user_id,
    COALESCE(p.full_name, 'Unknown') as full_name,
    rm.resort_role
  FROM public.resort_memberships rm
  LEFT JOIN public.profiles p ON p.id = rm.user_id
  WHERE rm.resort_id = _resort_id
    AND rm.user_id NOT IN (
      SELECT bd.user_id 
      FROM public.buggy_drivers bd 
      WHERE bd.resort_id = _resort_id
    )
  ORDER BY rm.resort_role, p.full_name;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_eligible_drivers_for_resort(uuid) TO authenticated;
```

### Frontend Changes

Update `useEligibleDrivers.ts` to use the new RPC:

```typescript
export function useEligibleDrivers(resortId: string | undefined) {
  return useQuery({
    queryKey: ['eligible-drivers', resortId],
    queryFn: async (): Promise<EligibleDriver[]> => {
      if (!resortId) return [];

      const { data, error } = await supabase.rpc('get_eligible_drivers_for_resort', {
        _resort_id: resortId,
      });

      if (error) throw error;
      return (data || []).map((d: any) => ({
        user_id: d.user_id,
        full_name: d.full_name,
        resort_role: d.resort_role,
      }));
    },
    enabled: !!resortId,
  });
}
```

### UI Improvement

Update `AddDriverDialog.tsx` to show a more helpful empty state that distinguishes between:
1. No staff in resort (needs to invite staff first)
2. All staff already registered as drivers (current message)
3. RLS/permission error (new: show appropriate message)

---

## Files to Modify

| File | Change |
|------|--------|
| **Database Migration** | Create `get_eligible_drivers_for_resort` RPC function |
| `src/hooks/transport/useEligibleDrivers.ts` | Use RPC instead of direct table query |
| `src/components/transport/dispatch/AddDriverDialog.tsx` | Improve empty state messaging |

---

## Technical Details

### New RPC Function

The `SECURITY DEFINER` function will:
1. **Authorize** - Check that the caller has `staff_can_write_transport` permission
2. **Query** - Fetch all resort members with their profile names
3. **Filter** - Exclude users already in `buggy_drivers` table
4. **Return** - Typed result set matching frontend interface

### Error Handling

The function raises an exception if the caller lacks permissions. This will surface as an error in the UI, which we can handle gracefully:

```typescript
if (error) {
  if (error.message.includes('Access denied')) {
    return []; // User lacks permission - silently return empty
  }
  throw error;
}
```

---

## Regarding "No CTA to enter driver mode"

This is **expected behavior**. The Driver Mode card (`DriverModeCard`) only appears for users who are already registered as drivers:

```tsx
// DriverModeCard.tsx
if (isLoading || !driverRecord) return null;
```

Once a Resort Admin registers themselves (or another user) as a driver:
1. The user refreshes or navigates to the dashboard
2. The `useIsDriver` hook will find their record in `buggy_drivers`
3. The `DriverModeCard` will appear

**No changes needed** for this component - it's working as designed.

---

## Testing Plan

1. Log in as RESORT_ADMIN for a resort with multiple staff members
2. Navigate to Transport → Resources panel
3. Click "Add Driver" button
4. Verify dropdown shows eligible staff members
5. Register a staff member as driver
6. Confirm they appear in the drivers list
7. If the driver is the current user, verify DriverModeCard appears on dashboard

---

## Success Criteria

- Dropdown shows eligible staff members (not already drivers)
- Empty state accurately reflects the reason (no staff vs all registered)
- Driver registration works successfully
- DriverModeCard appears for registered drivers
- Permission checks prevent unauthorized access
