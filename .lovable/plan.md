

## Plan: Add "Log Out All Devices" Button to Superadmin Command Center

### Where it goes
The button will be added to the **Control** mode's "Quick Actions" card in `CommandCenter.tsx` (alongside "Manage Feature Flags", "Invite Staff", "Support Mode"). It will include a confirmation dialog since this is a destructive action.

### Implementation steps

**1. Create edge function `admin-logout-all-devices`**
- Accepts POST with optional `user_id` param (if omitted, logs out ALL users platform-wide)
- Validates caller is SUPER_ADMIN by checking their JWT → `profiles.global_role`
- Uses Supabase Admin API (`supabase.auth.admin.signOut(userId, 'global')`) to revoke all sessions
- If no `user_id`, fetches all users via `auth.admin.listUsers()` and signs each out
- Returns count of users affected

**2. Update `CommandCenter.tsx` Control mode**
- Add a "Log Out All Devices" button with `LogOut` icon in the Quick Actions card
- Wire up an `AlertDialog` confirmation (destructive styling, clear warning text)
- On confirm, call the edge function via `supabase.functions.invoke('admin-logout-all-devices')`
- Show success/error toast with count of affected users
- The superadmin's own session remains active (edge function excludes the caller)

### Files to create/modify
- **Create**: `supabase/functions/admin-logout-all-devices/index.ts`
- **Edit**: `src/pages/superadmin/CommandCenter.tsx` — add button + dialog in Control mode Quick Actions

### Security
- Edge function validates SUPER_ADMIN role server-side before proceeding
- Uses service role key (available in edge functions via `SUPABASE_SERVICE_ROLE_KEY` env var)
- Caller's own session is excluded from logout to prevent self-lockout

