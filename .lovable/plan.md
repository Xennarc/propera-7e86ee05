

# Phase 4: Remove Old Token Login System

## Executive Summary
Remove all legacy token-based authentication systems for guest access, transitioning fully to:
1. **Manual PIN login** (room + last name + PIN)
2. **Signed autofill links** (HMAC-signed URLs with PIN credentials)
3. **QR code login** (signed URLs that auto-login via canonical PIN path)

The demo system requires special handling as it currently uses `demo_login_tokens` for guest auto-login.

---

## System Inventory

### Token Tables to Remove
| Table | Purpose | Current Usage |
|-------|---------|---------------|
| `guest_login_tokens` | QR-based instant/confirm logins | Used by `consume_guest_login_token`, `peek_guest_login_token`, `create_guest_login_token` RPCs |
| `prearrival_tokens` | Legacy pre-arrival magic links | Used by `generate_prearrival_token`, `validate_prearrival_token` RPCs |
| `guest_access_links` | Stay-based magic links | Used by `create_guest_access_link`, `consume_guest_access_link` RPCs |

**Note**: `demo_login_tokens` is **NOT being removed** - it's part of the demo provisioning system and requires a separate migration strategy.

### Database Functions to Remove
| Function | Purpose | Replacement |
|----------|---------|-------------|
| `consume_guest_login_token` | Consumes QR tokens | Use `guest_portal_login` via signed URL |
| `peek_guest_login_token` | Previews QR token info | N/A (signed URLs don't need peek) |
| `create_guest_login_token` | Creates QR tokens | Use `sign-qr-login` edge function |
| `create_guest_pairing_token` | Device pairing | Keep for now (separate feature) |
| `generate_prearrival_token` | Creates pre-arrival links | Use `send-guest-credentials` edge function |
| `validate_prearrival_token` | Validates pre-arrival tokens | N/A (use PIN login) |
| `validate_prearrival_link` | Validates pre-arrival links | N/A (use PIN login) |
| `regenerate_prearrival_link` | Regenerates links | Use PIN reset + `send-guest-credentials` |
| `revoke_prearrival_link` | Revokes links | N/A (PIN-based doesn't need revocation) |
| `update_prearrival_link_status` | Updates link status | N/A |
| `link_legacy_tokens_to_stays` | Migration helper | Remove after migration |
| `create_guest_access_link` | Creates stay access links | Use `sign-qr-login` or `send-guest-credentials` |
| `consume_guest_access_link` | Consumes access links | Use `guest_portal_login` via signed URL |

### Routes to Redirect/Remove
| Route | Current Behavior | New Behavior |
|-------|------------------|--------------|
| `/guest/qr` | Consumes instant QR token | Redirect to `/guest/login` with message |
| `/guest/qr/:token` | Confirm-style QR login | Redirect to `/guest/login` with message |
| `/guest/access` | Consumes access link tokens | Redirect to `/guest/login` with message |
| `/prearrival/:token` | Legacy pre-arrival | Already redirects via `LegacyPrearrivalRedirect` |
| `/guest/demo-login` | Demo guest token | Redirect to `/demo/login` (keep demo system for now) |
| `/staff/demo-login` | Demo staff token | Redirect to `/demo/login` (keep demo system for now) |

### Staff UI Components to Update
| Component | Current Behavior | New Behavior |
|-----------|------------------|--------------|
| `PrearrivalLinkManager.tsx` | Generates `prearrival_tokens` | Remove entirely (replaced by `SendGuestCredentialsDialog`) |
| `StayAccessLinkManager.tsx` | Generates `guest_access_links` | Remove legacy link section, keep credentials dialog |
| `GeneratePreArrivalLinkDialog.tsx` | Fallback to legacy tokens | Remove legacy fallback, use PIN + credentials only |
| `SendPrearrivalEmailDialog.tsx` | Falls back to legacy tokens | Remove legacy fallback, use PIN + credentials only |
| `GuestQrLoginManager.tsx` | Already uses `sign-qr-login` | No changes needed |

---

## Implementation Plan

### Task 1: Update Routes to Add Graceful Redirects

**Files to Modify:**
- `src/pages/guest/GuestQrLoginPage.tsx` → Convert to redirect component
- `src/pages/guest/GuestQrConfirmPage.tsx` → Convert to redirect component  
- `src/pages/guest/GuestAccessLoginPage.tsx` → Convert to redirect component

**New Behavior:**
Each page will display a friendly message and redirect users to the standard login:

```text
+-------------------------------------------+
|   [Warning Icon]                          |
|                                           |
|   This link format has been updated       |
|                                           |
|   We've upgraded our login system for     |
|   better security. Please log in using    |
|   your room number, last name, and PIN.   |
|                                           |
|   +-----------------------------------+   |
|   |     Go to Guest Login             |   |
|   +-----------------------------------+   |
|                                           |
|   Need help? Contact the resort.          |
+-------------------------------------------+
```

These pages will NOT auto-redirect immediately to avoid confusion - users should understand the change.

### Task 2: Remove Token-Related Staff UI Components

**Files to Remove:**
- `src/components/prearrival/PrearrivalLinkManager.tsx`
- `src/components/prearrival/SharePrearrivalLinkDialog.tsx` (if only used by above)

**Files to Modify:**
- `src/components/staff/StayAccessLinkManager.tsx` → Remove legacy link generation, keep only "Send Login Credentials" button
- `src/components/guest/GeneratePreArrivalLinkDialog.tsx` → Remove legacy token fallback OR remove entirely
- `src/components/guests/SendPrearrivalEmailDialog.tsx` → Remove legacy token fallback, use only credentials flow

### Task 3: Update App.tsx Routes

**Modifications:**
- Keep routes for redirect pages (graceful degradation)
- Consider simplifying legacy redirects

**Current routes to keep (as redirect handlers):**
```tsx
// These will show friendly "link updated" message
<Route path="/guest/access" element={<LegacyTokenRedirect />} />
<Route path="/guest/qr/:token" element={<LegacyTokenRedirect />} />
<Route path="/guest/qr" element={<LegacyTokenRedirect />} />

// These already redirect properly
<Route path="/prearrival/:token" element={<LegacyPrearrivalRedirect />} />
```

### Task 4: Database Cleanup Migration

**Important**: This must be done AFTER frontend changes are deployed and tested.

**Migration Steps:**

```sql
-- Phase 4a: Drop token-consumption functions first
DROP FUNCTION IF EXISTS public.consume_guest_login_token(text);
DROP FUNCTION IF EXISTS public.peek_guest_login_token(text);
DROP FUNCTION IF EXISTS public.create_guest_login_token(uuid, uuid, public.guest_login_token_type, int);
DROP FUNCTION IF EXISTS public.consume_guest_access_link(text);
DROP FUNCTION IF EXISTS public.create_guest_access_link(uuid);
DROP FUNCTION IF EXISTS public.generate_prearrival_token(uuid);
DROP FUNCTION IF EXISTS public.validate_prearrival_token(text);
DROP FUNCTION IF EXISTS public.validate_prearrival_link(text);
DROP FUNCTION IF EXISTS public.regenerate_prearrival_link(uuid);
DROP FUNCTION IF EXISTS public.revoke_prearrival_link(uuid);
DROP FUNCTION IF EXISTS public.update_prearrival_link_status(uuid, text);
DROP FUNCTION IF EXISTS public.link_legacy_tokens_to_stays();

-- Phase 4b: Drop RLS policies on token tables
DROP POLICY IF EXISTS "guest_login_tokens_staff_read" ON public.guest_login_tokens;
DROP POLICY IF EXISTS "guest_login_tokens_staff_insert" ON public.guest_login_tokens;
-- (continue for all policies on these tables)

-- Phase 4c: Drop token tables
DROP TABLE IF EXISTS public.guest_login_tokens CASCADE;
DROP TABLE IF EXISTS public.guest_access_links CASCADE;

-- Note: prearrival_tokens is kept for now due to existing data audit requirements
-- It will be archived and dropped in a future phase

-- Phase 4d: Drop token-related enum types
DROP TYPE IF EXISTS public.guest_login_token_type;
```

### Task 5: Update Edge Functions

**Files to Modify:**
- `supabase/functions/send-prearrival-link/index.ts` → Rename to `send-guest-welcome` and remove token URL handling, or deprecate entirely in favor of `send-guest-credentials`

**Decision Point:** The `send-prearrival-link` function currently accepts a `prearrivalLink` parameter. Options:
1. **Option A**: Remove the function entirely, use only `send-guest-credentials`
2. **Option B**: Keep the function but only accept resort login URLs (no tokens)

**Recommendation**: Option A - consolidate to `send-guest-credentials` as the canonical way to send guest access information.

### Task 6: Keep Demo System Intact (No Changes)

The demo system (`/demo/login`, `demo_login_tokens` table, `provision-demo` edge function) is a separate concern:
- It uses `demo_login_tokens` (not `guest_login_tokens`)
- It has a different security model (short-lived demo access for prospects)
- It should be migrated to signed URLs in a future phase

**No changes to:**
- `/demo/login` route
- `/staff/demo-login` redirect
- `/guest/demo-login` redirect
- `provision-demo` edge function
- `demo_login_tokens` table

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/pages/guest/GuestQrLoginPage.tsx` | **Rewrite** | Convert to redirect/info page |
| `src/pages/guest/GuestQrConfirmPage.tsx` | **Rewrite** | Convert to redirect/info page |
| `src/pages/guest/GuestAccessLoginPage.tsx` | **Rewrite** | Convert to redirect/info page |
| `src/components/prearrival/PrearrivalLinkManager.tsx` | **Delete** | No longer needed |
| `src/components/prearrival/SharePrearrivalLinkDialog.tsx` | **Delete** | No longer needed |
| `src/components/staff/StayAccessLinkManager.tsx` | **Modify** | Remove legacy link section |
| `src/components/guest/GeneratePreArrivalLinkDialog.tsx` | **Delete/Modify** | Remove legacy fallback or remove entirely |
| `src/components/guests/SendPrearrivalEmailDialog.tsx` | **Modify** | Remove legacy token generation fallback |
| `src/lib/url-utils.ts` | **Modify** | Remove/deprecate `getPrearrivalUrl`, `getGuestAccessUrl` functions |
| `supabase/functions/send-prearrival-link/` | **Delete** | Replaced by `send-guest-credentials` |
| `supabase/config.toml` | **Modify** | Remove `send-prearrival-link` config |
| **Database Migration** | **Create** | Drop token tables and functions |

---

## Redirect Strategy

### URL Mapping

| Old URL Pattern | Redirect Target | Message |
|-----------------|-----------------|---------|
| `/guest/qr?t=...` | `/guest/login` | "This QR code format is no longer valid. Please log in with your room number and PIN, or ask staff for a new QR code." |
| `/guest/qr/:token` | `/guest/login` | "This QR code format is no longer valid. Please log in with your room number and PIN." |
| `/guest/access?t=...` | `/guest/login` | "This access link format has been updated. Please log in with your room number and PIN." |
| `/prearrival/:token` | `/guest/login` | Already handled by `LegacyPrearrivalRedirect` |

### Implementation: Unified Legacy Token Redirect Component

Create a reusable `LegacyTokenRedirect` component:

```typescript
// src/components/guest/LegacyTokenRedirect.tsx
export function LegacyTokenRedirect({ 
  title = "This link format has been updated",
  message = "Please log in using your room number, last name, and PIN."
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardContent className="py-10 px-6 text-center space-y-6">
          <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
            <AlertCircle className="h-8 w-8 text-amber-600" />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="text-muted-foreground text-sm">{message}</p>
          </div>
          <Button onClick={() => window.location.href = '/guest/login'} className="w-full">
            Go to Guest Login
          </Button>
          <p className="text-xs text-muted-foreground">
            Need help? Contact the resort directly.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Testing Checklist

### Before Database Migration

| Test Case | Expected Result |
|-----------|-----------------|
| Visit `/guest/qr?t=old_token` | See redirect page with friendly message |
| Visit `/guest/qr/old_token` | See redirect page with friendly message |
| Visit `/guest/access?t=old_token` | See redirect page with friendly message |
| Visit `/prearrival/old_token` | See existing `LegacyPrearrivalRedirect` |
| Staff sends guest credentials | Email contains login URL (not token link) |
| Staff generates QR code | Uses signed URL format (`?room=...&sig=...`) |
| Guest logs in with PIN | Works normally |
| Guest scans new QR code | Auto-fills and logs in via PIN flow |

### After Database Migration

| Test Case | Expected Result |
|-----------|-----------------|
| All above tests | Still pass |
| No RPC errors | Token functions removed cleanly |
| Demo flow works | Uses `demo_login_tokens` (unchanged) |

---

## Rollback Strategy

If issues arise after deployment:

1. **Frontend Issues**: Routes can be reverted independently
2. **Database Issues**: Keep token tables for 30 days before dropping
3. **Email Issues**: `send-guest-credentials` is the new canonical path; old function can be restored from git

---

## Security Notes

1. **No new security risks**: Removing token system reduces attack surface
2. **PIN security maintained**: All PIN auth goes through rate-limited `guest_portal_login`
3. **Signed URLs**: HMAC signatures prevent tampering with QR/autofill links
4. **Demo isolation**: Demo tokens are a separate system with different security model

---

## Timeline

1. **Phase 4a** (This PR): Frontend changes + redirects
2. **Phase 4b** (1 week later): Database cleanup migration after monitoring
3. **Phase 4c** (Future): Migrate demo system to signed URLs

---

## Acceptance Criteria Validation

| Criteria | Implementation |
|----------|----------------|
| No token endpoints remain | ✅ Frontend pages become redirects; DB functions dropped |
| Old token URLs don't 404 | ✅ Friendly redirect pages with clear messaging |
| All guest logins work via manual or signed autofill/QR | ✅ PIN login unchanged; signed URLs use PIN auth |
| Staff workflows issue PIN or QR signed links | ✅ `SendGuestCredentialsDialog` + `GuestQrLoginManager` |
| Backward compatible during transition | ✅ Redirect pages explain the change |

