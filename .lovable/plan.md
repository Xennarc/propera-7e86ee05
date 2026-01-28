

# Fix Request Visibility for Front Office Staff

## Problem

Guest requests are not visible to **FRONT_OFFICE** staff because the RLS helper function `staff_can_view_request` only grants resort-wide access to `RESORT_ADMIN` and `MANAGER` roles. Front Office staff must currently have specific department memberships to see any requests.

**Current logic (line 59 of function):**
```sql
IF public.has_resort_role(_user_id, _resort_id, ARRAY['RESORT_ADMIN', 'MANAGER']::resort_role[]) THEN
  RETURN true;
END IF;
```

This excludes `FRONT_OFFICE` from seeing requests unless they're assigned to specific departments.

---

## Solution

Update the `staff_can_view_request` function to include `FRONT_OFFICE` in the array of roles that can view all requests at the resort level.

### Database Migration

**Create new migration to update the function:**

```sql
-- Update staff_can_view_request to include FRONT_OFFICE in resort-level access
CREATE OR REPLACE FUNCTION public.staff_can_view_request(
  _user_id uuid, 
  _resort_id uuid, 
  _dept_key text, 
  _assigned_to uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _dept_role text;
  _visibility_policy text;
BEGIN
  -- Super admin can see everything
  IF public.is_super_admin(_user_id) THEN
    RETURN true;
  END IF;
  
  -- Must have resort access first
  IF NOT public.has_resort_membership(_user_id, _resort_id) THEN
    RETURN false;
  END IF;
  
  -- Resort admin, manager, and front office can view all requests in their resort
  IF public.has_resort_role(_user_id, _resort_id, ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]) THEN
    RETURN true;
  END IF;
  
  -- Check department role
  SELECT dept_role INTO _dept_role
  FROM public.department_memberships
  WHERE user_id = _user_id
    AND resort_id = _resort_id
    AND department_key = _dept_key;
  
  -- No department membership = no access
  IF _dept_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- MANAGER/SUPERVISOR can view all department requests
  IF _dept_role IN ('MANAGER', 'SUPERVISOR') THEN
    RETURN true;
  END IF;
  
  -- LINE staff: can view if assigned to them
  IF _assigned_to = _user_id THEN
    RETURN true;
  END IF;
  
  -- LINE staff: check visibility policy for department queue access
  SELECT department_visibility_policy INTO _visibility_policy
  FROM public.resort_retention_policies
  WHERE resort_id = _resort_id;
  
  IF _visibility_policy = 'DEPARTMENT_QUEUE' THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;
```

---

## Visibility Matrix After Fix

| Role | Can View All Resort Requests |
|------|------------------------------|
| **SUPER_ADMIN** | ✅ Yes (all resorts) |
| **RESORT_ADMIN** | ✅ Yes (their resort) |
| **MANAGER** | ✅ Yes (their resort) |
| **FRONT_OFFICE** | ✅ Yes (their resort) ← **NEW** |
| **RESERVATIONS** | ❌ Only department-assigned |
| **ACTIVITIES** | ❌ Only department-assigned |
| **FNB** | ❌ Only department-assigned |

---

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| New SQL Migration | Create | Update `staff_can_view_request` function to include `FRONT_OFFICE` |

---

## No Frontend Changes Required

This is a database-level fix only. The frontend already correctly queries requests - the visibility was simply being filtered out by the RLS function.

---

## Testing

After migration:
1. Log in as FRONT_OFFICE staff for "The Residence Falhumaafushi"
2. Navigate to `/staff/requests`
3. Verify all requests (regardless of department) are now visible

