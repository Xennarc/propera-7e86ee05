
# Fix: Module Settings RLS Policy for RESORT_ADMIN

## Problem Identified
The module toggle switch fails with "Failed to update module setting" because the `resort_settings` table only has an RLS policy for **Super Admins**. RESORT_ADMIN users cannot update settings even though the UI correctly checks their role client-side.

**Current policy:**
```sql
"Super admins full access to resort_settings" -> is_super_admin(auth.uid())
```

This blocks all RESORT_ADMIN users from performing INSERT/UPDATE operations on the table.

---

## Solution

Add an RLS policy to allow RESORT_ADMIN users to manage settings for their own resort, following the existing codebase patterns used for similar tables (e.g., `activities`, `activity_sessions`).

---

## Implementation Steps

### 1. Add RLS Policy for RESORT_ADMIN Access

Create a new migration that adds policies for:
- **SELECT**: Staff with resort access can read settings for their resort
- **UPDATE**: RESORT_ADMIN can update settings for their resort  
- **INSERT**: RESORT_ADMIN can create settings row if it doesn't exist (for upsert)

```sql
-- Allow staff to SELECT resort settings for their resort
CREATE POLICY "Staff can view resort settings"
ON public.resort_settings
FOR SELECT
TO authenticated
USING (
  staff_has_resort_access(auth.uid(), resort_id)
);

-- Allow RESORT_ADMIN to UPDATE resort settings
CREATE POLICY "Resort admins can update resort settings"
ON public.resort_settings
FOR UPDATE
TO authenticated
USING (
  staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
)
WITH CHECK (
  staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
);

-- Allow RESORT_ADMIN to INSERT resort settings (for upsert when row doesn't exist)
CREATE POLICY "Resort admins can insert resort settings"
ON public.resort_settings
FOR INSERT
TO authenticated
WITH CHECK (
  staff_can_write_resort(auth.uid(), resort_id, ARRAY['RESORT_ADMIN'::resort_role])
);
```

This uses the existing helper functions:
- `staff_has_resort_access()` - checks Super Admin OR has any resort membership
- `staff_can_write_resort()` - checks Super Admin OR has specific resort role

---

## Why This Is Safe

1. **Follows existing patterns**: Uses the same helper functions (`staff_can_write_resort`, `staff_has_resort_access`) found throughout the codebase
2. **Resort-scoped**: RESORT_ADMIN can only modify settings for resorts they're a member of
3. **Super Admin preserved**: The existing Super Admin policy remains and continues to work
4. **No guest access**: Policies only apply to `authenticated` role with staff membership checks

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/[timestamp]_add_resort_settings_rls.sql` | New migration adding RLS policies |

---

## Verification After Fix

1. Log in as a RESORT_ADMIN user
2. Navigate to `/staff/settings/modules`
3. Toggle the Transport module switch
4. Confirm the toast shows "Module enabled/disabled successfully"
5. Verify the setting persists on page reload
