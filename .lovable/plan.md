

# Improve QR Code Login & Guest Portal Pre-Arrival Flow

## Current State Analysis

### What Exists Today

The system has **three parallel login methods** for guests:

| Method | Route | Token Table | Consume RPC |
|--------|-------|-------------|-------------|
| **Standard PIN Login** | `/resort/:code/guest/login` | N/A | `guest_portal_login` |
| **QR Login (Instant/Confirm)** | `/guest/qr?t=TOKEN` or `/guest/qr/:token` | `guest_login_tokens` | `consume_guest_login_token` |
| **Pre-Arrival Access Link** | `/guest/access?t=TOKEN` | `guest_access_links` | `consume_guest_access_link` |

### Issues Identified

1. **Inconsistent Session Construction**
   - Each login page (`GuestQrLoginPage`, `GuestQrConfirmPage`, `GuestAccessLoginPage`) manually constructs and stores the session, duplicating logic and risking inconsistencies
   - The `GuestAuthContext` has hardened normalization, but login pages bypass it

2. **URL Hardcoding Mismatch**
   - `GuestQrLoginManager` uses `https://propera.cc` for production
   - `GuestQrLoginPage` displays `https://propera.cc/guest/qr?t=TOKEN` for desktop QR
   - No resort code in QR URLs — guests land on generic route without resort context

3. **No "Peek" for Confirm Flow**
   - `GuestQrConfirmPage` shows generic "Confirm Your Login" without guest details
   - Missed opportunity for premium UX: "Welcome, James Wilson (Room 101)"

4. **Desktop Detection Issues**
   - Both QR and Access pages show "Scan with your phone" on desktop
   - Flaky detection: some tablets report as desktop
   - No way to bypass and continue on desktop anyway

5. **Token Expiry Sync Issues**
   - `GuestQrLoginManager` uses client-side timer (`Date.now() + EXPIRY_MINUTES`)
   - Server sets different expiry times (15min for instant, 1hr for confirm)
   - Client timer shows 2 minutes regardless of server expiry

6. **Legacy Route Clutter**
   - `/guest/access?t=TOKEN` overlaps with `/guest/qr?t=TOKEN` conceptually
   - Legacy `/prearrival/:token` redirects add complexity

---

## Improvement Plan

### Phase 1: Centralize Session Creation (Code Quality)

**Goal**: Create a single utility function for session construction used by all login flows.

**Changes**:

| File | Change |
|------|--------|
| `src/contexts/GuestAuthContext.tsx` | Export `buildGuestSession()` utility that normalizes all fields |
| `src/pages/guest/GuestQrLoginPage.tsx` | Import and use `buildGuestSession()` instead of manual construction |
| `src/pages/guest/GuestQrConfirmPage.tsx` | Import and use `buildGuestSession()` |
| `src/pages/guest/GuestAccessLoginPage.tsx` | Import and use `buildGuestSession()` |

**New Utility**:
```typescript
// In GuestAuthContext.tsx
export function buildGuestSession(params: {
  guest: { id: string; full_name: string; room_number: string; check_in_date: string; check_out_date: string };
  resort: { id: string; name: string; logo_url?: string; timezone?: string };
  sessionId?: string;
  sessionToken?: string;
  stayId?: string;
}): GuestSession {
  return {
    guestId: String(params.guest.id ?? ''),
    fullName: String(params.guest.full_name ?? 'Guest'),
    roomNumber: String(params.guest.room_number ?? ''),
    checkInDate: String(params.guest.check_in_date ?? ''),
    checkOutDate: String(params.guest.check_out_date ?? ''),
    resortId: String(params.resort.id ?? ''),
    resortName: params.resort.name ? String(params.resort.name) : undefined,
    resortLogoUrl: params.resort.logo_url ? String(params.resort.logo_url) : undefined,
    resortTimezone: params.resort.timezone ? String(params.resort.timezone) : 'UTC',
    sessionId: params.sessionId ? String(params.sessionId) : undefined,
    sessionToken: params.sessionToken ? String(params.sessionToken) : undefined,
    stayId: params.stayId ? String(params.stayId) : undefined,
  };
}
```

### Phase 2: Fix Token Expiry Timer Sync

**Goal**: Use actual server-returned expiry time instead of hardcoded client estimate.

**Changes**:

| File | Change |
|------|--------|
| `src/components/guest/GuestQrLoginManager.tsx` | Use `result.expires_at` from RPC response, not `Date.now() + EXPIRY_MINUTES` |

**Current (Bug)**:
```typescript
setExpiresAt(new Date(Date.now() + EXPIRY_MINUTES[type] * 60 * 1000));
```

**Fixed**:
```typescript
// Use server-provided expiry
setExpiresAt(result.expires_at ? new Date(result.expires_at) : new Date(Date.now() + 2 * 60 * 1000));
```

### Phase 3: Add Token Peek RPC for Confirm Flow

**Goal**: Allow the confirmation page to show "Welcome, [Guest Name]" before consuming the token.

**New RPC**: `peek_guest_login_token`

```sql
CREATE OR REPLACE FUNCTION public.peek_guest_login_token(p_raw_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_token_hash text;
  v_token_record record;
  v_guest record;
  v_resort record;
BEGIN
  -- Hash token
  v_token_hash := encode(digest(p_raw_token, 'sha256'), 'hex');
  
  -- Find token (don't consume)
  SELECT * INTO v_token_record
  FROM public.guest_login_tokens
  WHERE token_hash = v_token_hash;
  
  IF v_token_record.id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_INVALID');
  END IF;
  
  IF v_token_record.consumed_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_ALREADY_USED');
  END IF;
  
  IF v_token_record.expires_at <= now() THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_EXPIRED');
  END IF;
  
  -- Fetch guest and resort for preview
  SELECT id, full_name, room_number INTO v_guest FROM public.guests WHERE id = v_token_record.guest_id;
  SELECT id, name, login_logo_url INTO v_resort FROM public.resorts WHERE id = v_token_record.resort_id;
  
  RETURN json_build_object(
    'success', true,
    'guest', json_build_object('id', v_guest.id, 'full_name', v_guest.full_name, 'room_number', v_guest.room_number),
    'resort', json_build_object('id', v_resort.id, 'name', v_resort.name, 'logo_url', v_resort.login_logo_url),
    'token_type', v_token_record.type,
    'expires_at', v_token_record.expires_at
  );
END;
$$;
```

**UI Update** for `GuestQrConfirmPage.tsx`:
- On mount, call `peek_guest_login_token` to get guest info
- Show personalized welcome: "Welcome, James Wilson — Room 101"
- Display resort logo if available
- Show token expiry countdown

### Phase 4: Improve Desktop Detection & Bypass

**Goal**: Allow guests on desktop to proceed anyway if they want.

**Changes to `GuestQrLoginPage.tsx` and `GuestAccessLoginPage.tsx`**:

Add a "Continue anyway" link below the desktop QR code:

```tsx
{/* Desktop view */}
{pageState === 'desktop' && (
  <Card>
    {/* ... existing QR display ... */}
    
    {/* Add bypass option */}
    <div className="text-center pt-4 border-t">
      <p className="text-xs text-muted-foreground mb-2">On a laptop but want to continue?</p>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={() => {
          // Force processing even on desktop
          processToken();
        }}
      >
        Continue on this device
      </Button>
    </div>
  </Card>
)}
```

### Phase 5: Consolidate Pre-Arrival Flow (Simplification)

**Goal**: Deprecate `guest_access_links` and use the same QR token system for all flows.

**Rationale**: With the new `send-guest-credentials` flow sending PIN-based login details, the `guest_access_links` table is redundant. Staff can either:
1. Send credentials email (PIN + room + last name)
2. Generate a QR code for instant login

**Changes**:

| Action | Description |
|--------|-------------|
| Keep `/guest/access` route | But show deprecation warning in code comments |
| Update `StayAccessLinkManager` | Replace with "Send Credentials" button that uses `SendGuestCredentialsDialog` |
| Add migration note | Mark `guest_access_links` table for future deprecation |

### Phase 6: Resort-Scoped QR URLs (Future Enhancement)

**Goal**: Include resort code in QR URLs for proper branding on landing page.

**Current URL**: `https://propera.cc/guest/qr?t=TOKEN`
**Proposed URL**: `https://propera.cc/resort/{code}/guest/qr?t=TOKEN`

This would allow the QR login page to show resort branding before consumption.

**Note**: This is a larger change that requires:
- New route in `App.tsx`
- Modified `GuestQrLoginManager` to include resort code
- Modified RPC to optionally validate resort matches

**Recommendation**: Defer to Phase 2 of improvements.

---

## Implementation Order

| Order | Task | Effort | Impact |
|-------|------|--------|--------|
| 1 | Centralize session construction (`buildGuestSession`) | Small | High (prevents bugs) |
| 2 | Fix token expiry timer sync | Small | Medium (UX accuracy) |
| 3 | Add desktop bypass button | Small | Medium (UX flexibility) |
| 4 | Add `peek_guest_login_token` RPC | Medium | Medium (premium UX) |
| 5 | Update `GuestQrConfirmPage` to use peek | Medium | Medium (personalization) |
| 6 | Update `StayAccessLinkManager` for credentials flow | Medium | High (simplification) |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/contexts/GuestAuthContext.tsx` | Add `buildGuestSession()` export |
| `src/pages/guest/GuestQrLoginPage.tsx` | Use `buildGuestSession()`, add desktop bypass |
| `src/pages/guest/GuestQrConfirmPage.tsx` | Use `buildGuestSession()`, call peek RPC, show personalized welcome |
| `src/pages/guest/GuestAccessLoginPage.tsx` | Use `buildGuestSession()`, add desktop bypass |
| `src/components/guest/GuestQrLoginManager.tsx` | Fix expiry timer to use server response |
| `src/components/staff/StayAccessLinkManager.tsx` | Integrate `SendGuestCredentialsDialog` as primary action |

## New Files

| File | Purpose |
|------|---------|
| `supabase/migrations/XXXXXX_peek_guest_login_token.sql` | Add peek RPC for token preview |

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Peek reveals guest info | Only reveals name/room, no sensitive data; token still required to authenticate |
| Desktop bypass | Guest still needs valid token; no security downgrade |
| Rate limiting | Existing rate limits on token consumption apply |

---

## Summary

This plan improves the QR login and pre-arrival flows by:
1. **Consolidating** duplicated session construction logic
2. **Fixing** the token expiry timer accuracy
3. **Enhancing** the confirm flow with a personalized welcome screen
4. **Improving** desktop UX with a bypass option
5. **Simplifying** by moving pre-arrival toward credential-based emails

The changes maintain backward compatibility while making the system more robust and user-friendly.

