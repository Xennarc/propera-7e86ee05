
# Phase 2: PIN Login as Canonical Auth Path

## Executive Summary
Make PIN-based login the robust, canonical authentication method for guests. The current implementation is **mostly complete** but needs:
1. **Pre-arrival support** — currently blocks guests before check-in date
2. **Rate limiting** — was removed and needs to be re-added
3. **Error response refinement** — ensure consistent, safe error messages

---

## Current State

### What Already Works
| Component | Status | Notes |
|-----------|--------|-------|
| `guests.portal_pin_hash` | ✅ Exists | SHA-256 hashed, never stored plain |
| `guests.portal_enabled` | ✅ Exists | Boolean gate for portal access |
| `guests.portal_pin_last4` | ✅ Exists | For staff-side masking (••••1234) |
| `generate_guest_pin` RPC | ✅ Works | Generates 4-digit PIN, hashes, stores |
| `guest_portal_login` RPC | ⚠️ Partial | Works but blocks pre-arrival, no rate limiting |
| `ResortGuestLogin.tsx` | ✅ Works | UI at `/resort/:code/guest/login` |
| `GuestAuthContext.login()` | ✅ Works | Client-side SHA-256 hashing before RPC call |
| Case-insensitive last name | ✅ Works | `LOWER(g.full_name) LIKE '%' || LOWER(p_last_name) || '%'` |

### Issues to Fix

| Issue | Impact | Solution |
|-------|--------|----------|
| Pre-arrival blocked | High | Remove `check_out_date >= CURRENT_DATE` OR add `check_in_date >= CURRENT_DATE - 7 days` logic |
| No rate limiting | Medium | Re-add `check_rate_limit` call to RPC |
| Room number case sensitive | Low | Add `LOWER()` to room number comparison |

---

## Implementation Plan

### Task 1: Update `guest_portal_login` RPC (Database Migration)

**Goal**: Allow pre-arrival guests while maintaining security + add rate limiting back.

**New Logic**:
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
DECLARE
  v_identifier text;
BEGIN
  -- Rate limiting: 10 attempts per 15 minutes per room/resort
  v_identifier := LOWER(TRIM(p_room_number)) || '-' || p_resort_id::text;
  PERFORM check_rate_limit('guest_portal_login', v_identifier, 10, 15);

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
    r.login_logo_url as resort_logo_url
  FROM guests g
  JOIN resorts r ON r.id = g.resort_id
  WHERE g.resort_id = p_resort_id
    -- Case-insensitive room number matching (trimmed)
    AND LOWER(TRIM(g.room_number)) = LOWER(TRIM(p_room_number))
    -- Case-insensitive last name substring match (trimmed)
    AND LOWER(g.full_name) LIKE '%' || LOWER(TRIM(p_last_name)) || '%'
    -- Portal must be enabled with valid PIN
    AND g.portal_enabled = true
    AND g.portal_pin_hash IS NOT NULL
    AND g.portal_pin_hash = p_pin_hash
    -- Allow pre-arrival (up to 14 days before check-in) through checkout
    AND g.check_in_date <= CURRENT_DATE + INTERVAL '14 days'
    AND g.check_out_date >= CURRENT_DATE
  LIMIT 1;

  -- Update last_login_at if found
  IF FOUND THEN
    UPDATE guests SET last_login_at = NOW() 
    WHERE id = (
      SELECT g.id FROM guests g
      WHERE g.resort_id = p_resort_id
        AND LOWER(TRIM(g.room_number)) = LOWER(TRIM(p_room_number))
        AND LOWER(g.full_name) LIKE '%' || LOWER(TRIM(p_last_name)) || '%'
        AND g.portal_enabled = true
        AND g.portal_pin_hash = p_pin_hash
      LIMIT 1
    );
  END IF;
END;
$$;
```

**Key Changes**:
1. **Re-add rate limiting**: `check_rate_limit('guest_portal_login', v_identifier, 10, 15)` — 10 attempts per 15 minutes
2. **Pre-arrival support**: Allow login up to 14 days before check-in (`check_in_date <= CURRENT_DATE + 14 days`)
3. **Case-insensitive room number**: `LOWER(TRIM(g.room_number)) = LOWER(TRIM(p_room_number))`
4. **Whitespace trimming**: All inputs are trimmed for robustness

---

### Task 2: Add Rate Limit Error Handling in Frontend

**File**: `src/contexts/GuestAuthContext.tsx`

**Current error handling** (line 233-236):
```typescript
if (error) {
  console.error('Login error:', error);
  return { error: 'We couldn\'t sign you in. Please try again or contact reception.' };
}
```

**Enhanced error handling**:
```typescript
if (error) {
  console.error('Login error:', error);
  // Check for rate limit error (without exposing details)
  if (error.message?.includes('Rate limit exceeded')) {
    return { error: 'Too many login attempts. Please wait a few minutes and try again.' };
  }
  return { error: 'We couldn\'t sign you in. Please try again or contact reception.' };
}
```

---

### Task 3: Improve Input Validation in Login UI

**File**: `src/pages/guest/ResortGuestLogin.tsx`

**Current validation**: Basic required field check

**Enhanced validation** (client-side, before API call):
```typescript
const validateInputs = () => {
  const errors: string[] = [];
  
  if (!formData.roomNumber.trim()) {
    errors.push('Room number is required');
  }
  
  if (!formData.lastName.trim()) {
    errors.push('Last name is required');
  } else if (formData.lastName.trim().length < 2) {
    errors.push('Last name must be at least 2 characters');
  }
  
  if (!formData.pin.trim()) {
    errors.push('PIN is required');
  } else if (!/^\d{4,6}$/.test(formData.pin)) {
    errors.push('PIN must be 4-6 digits');
  }
  
  return errors;
};
```

This is already mostly done in `GuestAuthContext.login()` (lines 214-220), but adding visual feedback in the UI would improve UX.

---

### Task 4: Security Audit — Ensure No PIN Exposure

**Current State**: ✅ Secure
- PIN is hashed client-side via `hashPin()` before transmission
- RPC receives `p_pin_hash`, never the raw PIN
- No raw PIN appears in logs, error messages, or network payloads
- `portal_pin_last4` is for masking only (staff sees "••••1234")

**Verification Points**:
| Location | Check | Status |
|----------|-------|--------|
| `GuestAuthContext.tsx` | `hashPin()` called before RPC | ✅ Lines 203, 208 |
| `guest_portal_login` RPC | Receives `p_pin_hash` only | ✅ Verified |
| Error messages | Never mention PIN value | ✅ All generic |
| Console logs | No PIN in `console.error()` | ✅ Verified |

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `supabase/migrations/XXXXXX_improve_guest_portal_login.sql` | **Create** | Update RPC with rate limiting + pre-arrival support |
| `src/contexts/GuestAuthContext.tsx` | **Minor Edit** | Enhanced rate limit error message |
| `src/pages/guest/ResortGuestLogin.tsx` | **Optional** | No changes required (validation already in context) |

---

## Migration SQL

```sql
-- Improve guest_portal_login: add rate limiting, pre-arrival support, case-insensitive room matching
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
DECLARE
  v_identifier text;
BEGIN
  -- Rate limiting: 10 attempts per 15 minutes per room/resort combination
  v_identifier := LOWER(TRIM(p_room_number)) || '-' || p_resort_id::text;
  PERFORM check_rate_limit('guest_portal_login', v_identifier, 10, 15);

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
    r.login_logo_url as resort_logo_url
  FROM guests g
  JOIN resorts r ON r.id = g.resort_id
  WHERE g.resort_id = p_resort_id
    -- Case-insensitive room number matching with trimming
    AND LOWER(TRIM(g.room_number)) = LOWER(TRIM(p_room_number))
    -- Case-insensitive last name substring match with trimming
    AND LOWER(g.full_name) LIKE '%' || LOWER(TRIM(p_last_name)) || '%'
    -- Portal must be enabled with valid PIN hash
    AND g.portal_enabled = true
    AND g.portal_pin_hash IS NOT NULL
    AND g.portal_pin_hash = p_pin_hash
    -- Allow pre-arrival guests (up to 14 days before check-in) through checkout date
    AND g.check_in_date <= CURRENT_DATE + INTERVAL '14 days'
    AND g.check_out_date >= CURRENT_DATE
  LIMIT 1;

  -- Update last_login_at timestamp if guest was found
  IF FOUND THEN
    UPDATE guests SET last_login_at = NOW() 
    WHERE id = (
      SELECT g.id FROM guests g
      WHERE g.resort_id = p_resort_id
        AND LOWER(TRIM(g.room_number)) = LOWER(TRIM(p_room_number))
        AND LOWER(g.full_name) LIKE '%' || LOWER(TRIM(p_last_name)) || '%'
        AND g.portal_enabled = true
        AND g.portal_pin_hash = p_pin_hash
      LIMIT 1
    );
  END IF;
END;
$$;

-- Add index to optimize rate_limit_logs queries if not exists
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_lookup 
ON rate_limit_logs (endpoint, identifier, created_at);
```

---

## Testing Plan

### Manual Test Cases

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid in-house guest | Room 101, Smith, 1234 | ✅ Login success |
| Valid pre-arrival guest (7 days before) | Room 102, Jones, 5678 | ✅ Login success |
| Pre-arrival 15+ days out | Future guest | ❌ "Details not found" |
| Wrong PIN | Correct room/name, wrong PIN | ❌ "Details not found" |
| Wrong last name | Correct room/PIN, wrong name | ❌ "Details not found" |
| Checked-out guest | Past checkout date | ❌ "Details not found" |
| Rate limit hit | 11 rapid attempts | ❌ "Too many attempts" |
| Case mismatch | "SMITH" vs "smith" | ✅ Login success |
| Room with spaces | " 101 " | ✅ Trimmed, matches |
| Portal disabled | `portal_enabled = false` | ❌ "Details not found" |

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| Brute force PIN attempts | Rate limiting: 10/15min per room |
| PIN enumeration | Generic error messages ("Details not found") |
| Cross-resort access | `p_resort_id` required, validated |
| PIN in transit | Client-side SHA-256 hash before transmission |
| PIN in logs | Never logged anywhere |
| Pre-arrival too early | 14-day window prevents far-future abuse |

---

## Backwards Compatibility

| Component | Impact |
|-----------|--------|
| QR login tokens | ✅ Unaffected — separate system |
| Access link tokens | ✅ Unaffected — separate table |
| Existing PIN logins | ✅ Same hash format (SHA-256) |
| Staff PIN generation | ✅ Uses existing `generate_guest_pin` |
| Mobile app | ✅ Same API contract |
