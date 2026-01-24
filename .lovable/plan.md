

# Fix Guest Portal Login RPC - Column Name Error

## Problem

The **guest login with PIN is failing** because the `guest_portal_login` database function references a non-existent column:

```
ERROR: column r.logo_url does not exist
```

The `resorts` table has `login_logo_url`, but the RPC is using `r.logo_url`.

---

## Root Cause

The `guest_portal_login` function definition contains:
```sql
r.logo_url as resort_logo_url  -- WRONG
```

Should be:
```sql
r.login_logo_url as resort_logo_url  -- CORRECT
```

This is the same issue noted in the memory context (`auth/guest-login-rpc-logo-fix`), but apparently the fix was not applied to this specific function or it was reverted.

---

## Fix

### Database Migration

Create a migration to fix the `guest_portal_login` function:

```sql
CREATE OR REPLACE FUNCTION public.guest_portal_login(
  p_resort_id uuid,
  p_room_number text,
  p_last_name text,
  p_pin_hash text
)
RETURNS TABLE(
  guest_id uuid,
  full_name text,
  room_number text,
  check_in_date date,
  check_out_date date,
  resort_id uuid,
  resort_name text,
  resort_code text,
  resort_logo_url text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id as guest_id,
    g.full_name,
    g.room_number,
    g.check_in_date,
    g.check_out_date,
    r.id as resort_id,
    r.name as resort_name,
    r.code as resort_code,
    r.login_logo_url as resort_logo_url  -- FIXED: was r.logo_url
  FROM guests g
  JOIN resorts r ON r.id = g.resort_id
  WHERE g.resort_id = p_resort_id
    AND g.room_number = p_room_number
    AND LOWER(g.full_name) LIKE '%' || LOWER(p_last_name) || '%'
    AND g.portal_enabled = true
    AND g.portal_pin_hash IS NOT NULL
    AND g.portal_pin_hash = p_pin_hash
    AND g.check_out_date >= CURRENT_DATE
  LIMIT 1;

  IF FOUND THEN
    UPDATE guests SET last_login_at = NOW() 
    WHERE id = (
      SELECT g.id FROM guests g
      WHERE g.resort_id = p_resort_id
        AND g.room_number = p_room_number
        AND LOWER(g.full_name) LIKE '%' || LOWER(p_last_name) || '%'
        AND g.portal_enabled = true
        AND g.portal_pin_hash = p_pin_hash
      LIMIT 1
    );
  END IF;
END;
$$;
```

---

## Impact

| Aspect | Status |
|--------|--------|
| Guest login with PIN | Will work after fix |
| Demo guest login | Will work after fix |
| Existing sessions | Unaffected |
| Staff login | Unaffected (different auth system) |

---

## No Code Changes Required

The frontend code in `GuestAuthContext.tsx` is correct - it properly fetches `login_logo_url` from the resorts table after login (lines 141-148). The issue is purely in the database function.

---

## Testing After Fix

1. Navigate to `/resort/DEMO/guest/login`
2. Enter valid room number, last name, and PIN
3. Verify login succeeds and redirects to guest portal
4. Check that resort logo appears correctly

