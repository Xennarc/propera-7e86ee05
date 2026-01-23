
# Seamless Pre-arrival to In-stay Auto-Login Implementation

## Overview

This plan implements seamless auto-login for guests transitioning from pre-arrival to in-stay mode. When a guest with an active pre-arrival token visits their link after check-in begins, they will be automatically logged into the Guest Portal without needing to re-enter credentials.

## Current Gap Analysis

| Component | Current State | Issue |
|-----------|---------------|-------|
| `PrearrivalLandingPage` | Stores `{ resortCode, guestId }` in `prearrival_guest_redirect` | Missing full session data for auto-login |
| `GuestAuthContext` | Only reads `propera_guest_session` | Ignores `prearrival_guest_redirect` entirely |
| `ResortGuestLogin` | No awareness of redirect data | Cannot pre-fill or auto-login |

## Solution Architecture

### Approach: Enhance `PrearrivalLandingPage` to Store Full Session Data

Instead of creating a new RPC, we leverage the existing `validate_prearrival_token` RPC which already returns all necessary guest data. The landing page will store full session data (not just IDs) when transitioning in-stay guests.

```text
Current Flow:
  PrearrivalLandingPage (IN_STAY detected)
    → Store { resortCode, guestId } in prearrival_guest_redirect
    → Navigate to /r/{code} (login page)
    → Guest sees login form (NOT seamless)

New Flow:
  PrearrivalLandingPage (IN_STAY detected)
    → Store full GuestSession in propera_guest_session (same key as normal login)
    → Navigate to /guest (portal directly)
    → GuestAuthContext restores session on load (SEAMLESS)
```

## Implementation Details

### Phase 1: Modify PrearrivalLandingPage to Establish Full Session

**File: `src/pages/prearrival/PrearrivalLandingPage.tsx`**

Update the IN_STAY redirect logic to:
1. Build a complete `GuestSession` object from the validated data
2. Store it in `propera_guest_session` (same key `GuestAuthContext` uses)
3. Navigate directly to `/guest` instead of `/r/{code}`

```text
Changes in performValidation():

if (guestState === 'IN_STAY') {
  // Build full session object
  const session = {
    guestId: validatedData.guest.id,
    fullName: validatedData.guest.full_name,
    roomNumber: validatedData.guest.room_number,
    checkInDate: validatedData.guest.check_in_date,
    checkOutDate: validatedData.guest.check_out_date,
    resortId: validatedData.resort.id,
    resortName: validatedData.resort.name,
    resortLogoUrl: validatedData.resort.login_logo_url || undefined,
    // resortTimezone fetched dynamically by GuestAuthContext
  };
  
  // Store in same key as normal login
  localStorage.setItem('propera_guest_session', JSON.stringify(session));
  
  // Also store prearrival flag for tracking (optional)
  localStorage.setItem('prearrival_guest_redirect', JSON.stringify({
    resortCode: validatedData.resort.code,
    guestId: validatedData.guest.id,
    autoLoginAt: new Date().toISOString(),
  }));
  
  // Navigate directly to portal
  navigate('/guest');
}
```

### Phase 2: Add Fallback in GuestAuthContext (Defense in Depth)

**File: `src/contexts/GuestAuthContext.tsx`**

Add a secondary check for `prearrival_guest_redirect` if no `propera_guest_session` exists. This handles edge cases where the session might have been cleared but the redirect data remains.

```text
Changes in restoreSession():

// First, check for normal session
const storedSession = localStorage.getItem(GUEST_SESSION_KEY);

// If no session, check for prearrival redirect (fallback)
if (!storedSession) {
  const prearrivalRedirect = localStorage.getItem('prearrival_guest_redirect');
  if (prearrivalRedirect) {
    try {
      const redirect = JSON.parse(prearrivalRedirect);
      // If we have autoLoginAt, the session should have been established
      // by PrearrivalLandingPage. If it's missing, user may need to re-login.
      if (redirect.autoLoginAt) {
        // Session was established but got cleared somehow
        // Clear stale redirect and let user re-login
        localStorage.removeItem('prearrival_guest_redirect');
      }
    } catch {
      localStorage.removeItem('prearrival_guest_redirect');
    }
  }
}

// Continue with normal session restoration...
```

### Phase 3: Update ResortGuestLogin for Pre-fill Support

**File: `src/pages/guest/ResortGuestLogin.tsx`**

As a UX improvement, if a guest lands on the login page with `prearrival_guest_redirect` data (fallback scenario), pre-fill the room number and last name.

```text
Changes in form initialization:

const [formData, setFormData] = useState(() => {
  // Check URL params first (existing "Find Resort" flow)
  const roomNumber = searchParams.get('roomNumber') || '';
  const lastName = searchParams.get('lastName') || '';
  
  // If no URL params, check for prearrival redirect data
  if (!roomNumber && !lastName) {
    const prearrivalRedirect = localStorage.getItem('prearrival_guest_redirect');
    if (prearrivalRedirect) {
      // Note: prearrival_guest_redirect only has guestId, not credentials
      // This is intentional for security - guests still need PIN
    }
  }
  
  return { roomNumber, lastName, pin: '' };
});
```

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/pages/prearrival/PrearrivalLandingPage.tsx` | Modify | Build full session on IN_STAY transition, navigate to `/guest` |
| `src/contexts/GuestAuthContext.tsx` | Modify | Add fallback check for stale `prearrival_guest_redirect` cleanup |

## Data Flow After Implementation

```text
Guest clicks pre-arrival email link on/after check-in date:

1. /prearrival/:token loads PrearrivalLandingPage
2. validate_prearrival_token RPC returns full guest data
3. getGuestState() returns 'IN_STAY'
4. Build GuestSession from validatedData
5. Store in localStorage('propera_guest_session')
6. Navigate to /guest
7. GuestLayout mounts, GuestAuthContext restores session
8. Guest sees portal immediately (no login required)
```

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Session hijacking via token | Token already validated server-side; session created only after successful validation |
| Stale session data | `GuestAuthContext` validates `checkOutDate >= today` on restore |
| Cross-resort leakage | Session is scoped to `resortId`; mismatch handling remains in place |
| Token reuse after logout | Clearing `propera_guest_session` on logout is sufficient; token remains valid for re-validation |

## Acceptance Criteria

| Scenario | Expected Behavior |
|----------|-------------------|
| Guest with future check-in opens pre-arrival link | Sees pre-arrival landing page as normal |
| Guest on check-in day opens pre-arrival link | Auto-redirected to Guest Portal, fully logged in |
| Guest opens pre-arrival link after check-out | Sees "stay ended" error message |
| Guest logs out and clicks pre-arrival link again | Re-validated and auto-logged in if still in-stay |
| Guest clears browser storage | Must re-login via normal flow (PIN required) |

## Testing Notes

1. Create a demo guest with check-in date = today
2. Generate a pre-arrival link for that guest
3. Open the link in an incognito browser
4. Verify: Guest lands directly in `/guest` portal without login form
5. Check localStorage: `propera_guest_session` contains full session data
6. Logout and re-open link: Should auto-login again

## Implementation Order

1. **Modify `PrearrivalLandingPage.tsx`** - Build and store full session on IN_STAY
2. **Modify `GuestAuthContext.tsx`** - Add stale redirect cleanup (optional but recommended)
3. **Test full flow** - Pre-arrival → In-stay transition
