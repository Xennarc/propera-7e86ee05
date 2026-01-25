
# Phase 3: Signed QR Auto-Login (PIN-Based)

## Overview
Replace the token-based QR login system with a signed URL approach that auto-fills credentials on the canonical PIN login page (`/resort/:code/guest/login`). When a guest scans a QR code, they land on the normal login page with pre-filled fields and automatic login.

## Architecture Decision

### Why Signed URLs Instead of Tokens?
| Aspect | Old Token System | New Signed URL System |
|--------|------------------|----------------------|
| Storage | Requires `guest_login_tokens` table | Stateless — no DB storage |
| Login path | Separate consume RPC | Same `guest_portal_login` RPC |
| Security | Token hash comparison | HMAC signature + expiry |
| Staff UX | Wait for token generation | Instant QR generation |
| Complexity | Two parallel auth systems | Single unified PIN auth |

### URL Format
```
/resort/{code}/guest/login?room=101&last=Smith&pin=1234&exp=1738000000&sig=abc123...&autologin=1
```

Parameters:
- `room` — Room number (case-insensitive)
- `last` — Last name (case-insensitive)
- `pin` — Plain PIN (4-6 digits) — short-lived exposure in URL
- `exp` — Unix timestamp for expiry (e.g., 10 minutes from generation)
- `sig` — HMAC-SHA256 signature of `resortCode|room|last|pin|exp`
- `autologin` — Flag to trigger auto-submit (optional)

### Security Model
1. **HMAC Signature**: Prevents tampering with room/pin/exp values
2. **Short Expiry**: 10-minute window limits replay attacks
3. **PIN in URL**: Acceptable because:
   - URL is shown as QR code, not typed/shared
   - 10-minute expiry limits exposure window
   - PIN is still hashed before RPC call (no plain PIN in transit to DB)
4. **Rate Limiting**: Existing `guest_portal_login` rate limiting still applies

---

## Implementation Plan

### Task 1: Add QR_LOGIN_SECRET to Environment

**Action**: Add a new secret for HMAC signing.

The signing process will use a shared secret (`QR_LOGIN_SECRET`) stored in Supabase Edge Function secrets. This secret will be used by:
1. Edge function to **sign** payloads when generating QR URLs
2. Edge function to **verify** signatures when validating URLs

**Secret Value**: A random 64-character hex string (e.g., generated via `openssl rand -hex 32`)

---

### Task 2: Create `sign-qr-login` Edge Function

**New File**: `supabase/functions/sign-qr-login/index.ts`

This edge function generates signed QR login URLs for staff.

**Request** (authenticated staff):
```json
{
  "guestId": "uuid",
  "resortCode": "OCEANVIEW",
  "roomNumber": "101",
  "lastName": "Smith",
  "pin": "1234",
  "expiryMinutes": 10
}
```

**Response**:
```json
{
  "success": true,
  "url": "https://propera.cc/resort/oceanview/guest/login?room=101&last=Smith&pin=1234&exp=1738000000&sig=abc123&autologin=1",
  "expiresAt": "2026-01-25T20:00:00Z"
}
```

**Logic**:
1. Verify staff is authenticated
2. Verify staff has access to the guest's resort
3. Build payload string: `resortCode|room|last|pin|exp`
4. Generate HMAC-SHA256 using `QR_LOGIN_SECRET`
5. Return signed URL

**Code Structure**:
```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PRODUCTION_URL = 'https://propera.cc';

async function hmacSign(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // 1. Verify auth
  // 2. Parse body: guestId, resortCode, roomNumber, lastName, pin, expiryMinutes
  // 3. Verify staff has resort access
  // 4. Calculate expiry timestamp
  // 5. Build payload: `${resortCode.toLowerCase()}|${room}|${last}|${pin}|${exp}`
  // 6. Sign with HMAC
  // 7. Return URL
});
```

---

### Task 3: Create `verify-qr-login` Edge Function

**New File**: `supabase/functions/verify-qr-login/index.ts`

This edge function verifies signed QR parameters. Called by the frontend before auto-login.

**Request** (unauthenticated):
```json
{
  "resortCode": "oceanview",
  "room": "101",
  "last": "Smith",
  "pin": "1234",
  "exp": "1738000000",
  "sig": "abc123..."
}
```

**Response** (success):
```json
{
  "valid": true,
  "resortCode": "oceanview",
  "roomNumber": "101",
  "lastName": "Smith",
  "pin": "1234"
}
```

**Response** (expired):
```json
{
  "valid": false,
  "error": "EXPIRED",
  "message": "This QR code has expired. Please ask staff for a new one."
}
```

**Response** (invalid signature):
```json
{
  "valid": false,
  "error": "INVALID_SIGNATURE",
  "message": "This QR code is invalid."
}
```

**Logic**:
1. Reconstruct payload: `${resortCode.toLowerCase()}|${room}|${last}|${pin}|${exp}`
2. Compute HMAC and compare with provided `sig`
3. Check if `exp` is in the future
4. Return validation result

---

### Task 4: Update `GuestQrLoginManager` (Staff UI)

**File**: `src/components/guest/GuestQrLoginManager.tsx`

Replace token-based QR generation with signed URL generation.

**Key Changes**:
1. Remove `create_guest_login_token` RPC calls
2. Add call to `sign-qr-login` edge function
3. Simplify to single "Generate QR" button (no instant/confirm distinction — all auto-login now)
4. Need guest's PIN — fetch via existing staff query or require PIN to be set

**Challenge**: Staff needs the plain PIN to include in URL, but we only store hashes!

**Solution Options**:
| Option | Description | Chosen? |
|--------|-------------|---------|
| A. Generate fresh PIN | Call `generate_guest_pin` to create new PIN, use returned value | ❌ Changes guest's PIN |
| B. Require PIN input | Staff enters PIN when generating QR | ❌ Staff may not know PIN |
| C. Store encrypted PIN | Store PIN encrypted (not just hashed) for QR use | ❌ Security regression |
| **D. Use existing token system for QR, keep PIN for manual** | QR uses consume-token, manual uses PIN | ❌ Contradicts goal |
| **E. Fetch PIN from `generate_guest_pin` response cache** | After PIN generation, store plain PIN temporarily in session for QR use | ⚠️ Complex state |
| **F. Generate one-time PIN for QR only** | Create a separate short-lived PIN just for QR login | ✅ **Chosen** |

**Option F Implementation**:
- Generate a random 4-digit "QR PIN" that expires with the QR
- This QR PIN is NOT stored in `portal_pin_hash`
- Edge function `sign-qr-login` generates the QR PIN and signs it
- `verify-qr-login` validates signature + expiry
- Login uses QR PIN, but we need a way to authenticate...

**Wait — Re-thinking the Problem**:

The requirement says: *"Do not create a separate 'token consume login' path; still submit through the canonical pin-login function."*

This means the QR must use the **actual guest PIN** to call `guest_portal_login`. But staff only has access to `portal_pin_last4` (masked).

**Revised Approach — "Staff Generates PIN + QR Together"**:
1. When staff clicks "Generate QR", we call `generate_guest_pin` to create/reset the PIN
2. The fresh PIN is returned and used in the signed QR URL
3. Guest scans QR → auto-login with fresh PIN → calls `guest_portal_login`

**Tradeoff**: Generating QR resets the guest's PIN. This is acceptable because:
- Staff typically generates QR at check-in or when guest requests
- PIN is only 4 digits — easy to communicate new PIN
- Credential email can be re-sent with new PIN

**Alternative — "QR for existing PIN"**:
If guest already has a PIN, staff can:
1. Copy credentials manually (room + last name + masked PIN hint)
2. Ask guest for their PIN (unlikely)

For now, we'll implement: **QR generation resets PIN and includes fresh PIN in signed URL**.

---

### Task 5: Update `ResortGuestLogin.tsx` (Guest Login Page)

**File**: `src/pages/guest/ResortGuestLogin.tsx`

Add support for signed QR parameters to enable auto-login.

**New Logic on Mount**:
```typescript
const [searchParams] = useSearchParams();
const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

useEffect(() => {
  const room = searchParams.get('room');
  const last = searchParams.get('last');
  const pin = searchParams.get('pin');
  const exp = searchParams.get('exp');
  const sig = searchParams.get('sig');
  const autologin = searchParams.get('autologin');

  // Pre-fill fields if params exist
  if (room || last) {
    setFormData(prev => ({
      ...prev,
      roomNumber: room || prev.roomNumber,
      lastName: last || prev.lastName,
      pin: pin || prev.pin,
    }));
  }

  // Attempt auto-login if all params present and autologin flag set
  if (room && last && pin && exp && sig && autologin && !autoLoginAttempted) {
    setAutoLoginAttempted(true);
    attemptAutoLogin(room, last, pin, exp, sig);
  }
}, [searchParams, autoLoginAttempted]);

const attemptAutoLogin = async (room: string, last: string, pin: string, exp: string, sig: string) => {
  setLoading(true);
  
  // 1. Call verify-qr-login edge function
  const verifyResult = await supabase.functions.invoke('verify-qr-login', {
    body: { resortCode: code, room, last, pin, exp, sig }
  });

  if (!verifyResult.data?.valid) {
    // Show error but keep fields pre-filled
    setError(verifyResult.data?.message || 'This QR code is no longer valid. Please enter your PIN manually.');
    setLoading(false);
    return;
  }

  // 2. Proceed with normal login (PIN is already in formData)
  const result = await login(resortInfo!.id, room, last, pin);
  if (result.error) {
    setError(result.error);
  } else {
    navigate('/guest');
  }
  setLoading(false);
};
```

**Error Handling**:
- Expired QR → Show friendly message, keep fields pre-filled (except PIN for security)
- Invalid signature → Show "Invalid QR" message
- Login failure → Show normal login error

---

### Task 6: Update `url-utils.ts` with New URL Builder

**File**: `src/lib/url-utils.ts`

Add new utility for signed QR URLs:

```typescript
/**
 * Generate a signed QR login URL (constructed by sign-qr-login edge function)
 * This is just the client-side URL builder; signature comes from server
 */
export function getSignedQrLoginUrl(params: {
  resortCode: string;
  room: string;
  last: string;
  pin: string;
  exp: number;
  sig: string;
}): string {
  const { resortCode, room, last, pin, exp, sig } = params;
  const encodedRoom = encodeURIComponent(room);
  const encodedLast = encodeURIComponent(last);
  return `${PRODUCTION_URL}/resort/${resortCode.toLowerCase()}/guest/login?room=${encodedRoom}&last=${encodedLast}&pin=${pin}&exp=${exp}&sig=${sig}&autologin=1`;
}
```

Note: URL encoding is important for special characters in room numbers/names.

---

### Task 7: Update `supabase/config.toml`

**File**: `supabase/config.toml`

Add new edge function configurations:

```toml
[functions.sign-qr-login]
verify_jwt = true

[functions.verify-qr-login]
verify_jwt = false
```

---

### Task 8: Deprecate Old QR Token Routes (Keep for Backward Compat)

**Files to keep unchanged (for now)**:
- `GuestQrLoginPage.tsx` — Still processes old tokens for existing QR codes
- `GuestQrConfirmPage.tsx` — Still handles confirm flow for existing tokens
- `/guest/qr` and `/guest/qr/:token` routes — Still work

**Deprecation Strategy**:
- Old tokens still work until they expire (2-10 minutes)
- New QR codes use signed URLs to `/resort/:code/guest/login`
- Staff UI switches to new system immediately
- Old routes can be removed in Phase 4 after monitoring

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `supabase/functions/sign-qr-login/index.ts` | **Create** | Edge function to generate signed QR URLs |
| `supabase/functions/verify-qr-login/index.ts` | **Create** | Edge function to verify signed parameters |
| `supabase/config.toml` | **Modify** | Add function configurations |
| `src/components/guest/GuestQrLoginManager.tsx` | **Modify** | Replace token generation with signed URL generation |
| `src/pages/guest/ResortGuestLogin.tsx` | **Modify** | Add auto-login from signed URL params |
| `src/lib/url-utils.ts` | **Modify** | Add `getSignedQrLoginUrl` utility |

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| PIN visible in URL | Short 10-minute expiry; URL shown as QR only |
| HMAC key exposure | Stored in Supabase secrets, never sent to client |
| Replay attacks | Expiry timestamp checked; rate limiting on login |
| URL tampering | HMAC signature invalidates any modifications |
| Signature brute force | 256-bit HMAC is cryptographically secure |
| Staff access verification | `sign-qr-login` verifies staff has resort access |

---

## Edge Case Handling

| Scenario | Behavior |
|----------|----------|
| Guest scans expired QR | Shows "QR expired" message, fields pre-filled, can enter PIN manually |
| Guest scans on desktop | Normal login page shown with pre-filled fields |
| Invalid signature | Shows "Invalid QR" message, clears pre-filled fields |
| Guest already logged in | Redirects to portal (existing behavior) |
| Rate limit hit | Shows rate limit message (existing behavior) |
| PIN was reset after QR generated | Login fails with "wrong PIN" error — expected |

---

## Migration Path

1. **Deploy edge functions** — `sign-qr-login` and `verify-qr-login`
2. **Add QR_LOGIN_SECRET** — Store in Supabase secrets
3. **Update staff UI** — `GuestQrLoginManager` uses new flow
4. **Update guest login** — `ResortGuestLogin` handles auto-login params
5. **Monitor** — Track both old token and new signed URL usage
6. **Phase 4** — Remove old token routes after 1 month

---

## Acceptance Criteria Validation

| Criteria | Implementation |
|----------|----------------|
| QR opens SAME login page | ✅ `/resort/:code/guest/login` with params |
| Fields auto-filled | ✅ URL params populate form fields |
| Login happens automatically | ✅ `autologin=1` triggers auto-submit |
| Expired QR falls back gracefully | ✅ Error shown, fields kept, manual entry allowed |
| No token consume logic | ✅ Uses canonical `guest_portal_login` RPC |
| Signed + time-limited | ✅ HMAC + `exp` timestamp |
| Backward compatible | ✅ Old `/guest/qr` routes still work |
