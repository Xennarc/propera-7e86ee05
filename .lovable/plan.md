

# Fix: Staff Account Creation for RESORT_ADMIN Role

## Problem Summary
Super Admins cannot create RESORT_ADMIN staff accounts because the database-level security trigger cannot see the authenticated user when the edge function uses the Service Role client.

## Root Cause
The `prevent_membership_self_grant` trigger checks `auth.uid()` to validate permissions, but when using the Service Role key, `auth.uid()` is NULL. This causes the security check to fail even for legitimate Super Admins.

## Solution Options

### Option A: Use the audited RPC (Recommended)
The database already has a SECURITY DEFINER RPC called `admin_add_resort_member` that handles this exact scenario. It:
- Checks permissions using `auth.uid()` from the caller's context
- Supports both Super Admin and Resort Admin callers
- Logs the action to `admin_audit_logs`

**Change in edge function** (`supabase/functions/create-staff-user/index.ts`):

Instead of direct insert at lines 234-244:
```typescript
// BEFORE (broken):
const { data: membership, error: membershipError } = await supabaseAdmin
  .from('resort_memberships')
  .insert({ ... })
```

Use the RPC via the **user's client** (which has their auth context):
```typescript
// AFTER (working):
const { data: membership, error: membershipError } = await supabaseUser
  .rpc('admin_add_resort_member', {
    p_resort_id: resort_id,
    p_user_id: authData.user.id,
    p_role: resort_role,
    p_department: department || null
  });
```

This preserves `auth.uid()` inside the RPC, allowing the permission check to pass.

---

### Option B: Modify trigger to accept caller_id parameter
Create a new version of the trigger that accepts an explicit caller ID for Service Role operations. This is more invasive and less secure.

**Not recommended** - adds complexity and potential security holes.

---

## Implementation Plan (Option A)

### Step 1: Update edge function to use RPC
**File:** `supabase/functions/create-staff-user/index.ts`

Replace lines 234-256 with:

```typescript
// Create resort membership if provided (not for SUPER_ADMIN only accounts)
let membershipId = null;
if (resort_id && resort_role) {
  // Use the user's client to call the audited RPC
  // This preserves auth.uid() context for the security checks
  const { data: membership, error: membershipError } = await supabaseUser
    .rpc('admin_add_resort_member', {
      p_resort_id: resort_id,
      p_user_id: authData.user.id,
      p_role: resort_role,
      p_department: department || null
    });

  if (membershipError) {
    console.error('Membership error:', membershipError);
    // Clean up the auth user we just created
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return new Response(
      JSON.stringify({ success: false, error: membershipError.message || 'Failed to create resort membership' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }

  membershipId = membership;
}
```

### Step 2: Deploy and test
After deployment:
1. Log in as Super Admin
2. Navigate to Oasis resort staff management
3. Create a new RESORT_ADMIN account
4. Verify success message and credentials are shown

---

## Why This Works
- The `supabaseUser` client carries your JWT token in its headers
- When it calls the RPC, Postgres sees `auth.uid()` as YOUR user ID
- The RPC's permission check `public.is_super_admin(auth.uid())` returns TRUE
- The membership is created successfully

---

## Files to Modify
| File | Change |
|------|--------|
| `supabase/functions/create-staff-user/index.ts` | Replace direct insert with RPC call |

## Risk Assessment
- **Risk:** Low - using existing audited RPC
- **Scope:** Single edge function
- **Rollback:** Trivial if needed
- **Security:** Improved (uses audited, permission-checked RPC)

