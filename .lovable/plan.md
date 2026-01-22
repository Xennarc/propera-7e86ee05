

# Fix: Staff Account Creation for Super Admins

## Problem Summary
As a Super Admin, you cannot create staff accounts because the `create-staff-user` edge function fails to properly validate your JWT token, returning an "Auth session missing" error.

## Root Cause
The edge function extracts the JWT token from the Authorization header correctly, but fails to pass it to the `auth.getUser()` call. Without the token parameter, Supabase cannot identify the authenticated user.

**Current broken code (line 38):**
```typescript
const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
```

**Should be:**
```typescript
const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
```

---

## Fix Details

### File: `supabase/functions/create-staff-user/index.ts`

**Change 1:** Pass the token to `auth.getUser()` (line 38)

Before:
```typescript
const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
```

After:
```typescript
const { data: { user }, error: userError } = await supabaseUser.auth.getUser(token);
```

This is a one-line fix that aligns with how other edge functions (like `send-staff-invite`) correctly validate the JWT.

---

## Why This Happened

Edge functions run in a stateless environment—they don't have access to browser session storage. The only way to identify a user is through the JWT token passed in the Authorization header. While the code correctly:
1. Extracts the token from the header
2. Creates a Supabase client with the token in headers

It fails because `auth.getUser()` without a parameter tries to read from a session that doesn't exist in the edge function context. Passing the token explicitly tells Supabase to validate that specific JWT.

---

## Testing Plan

After the fix:
1. Log in as Super Admin
2. Navigate to any resort's staff management page
3. Click "Create Account"
4. Fill in username, password, and role
5. Submit—should now succeed and show credentials

---

## Impact
- **Risk:** Very Low (single line change, no side effects)
- **Scope:** Only affects `create-staff-user` edge function
- **Rollback:** Trivial if needed

