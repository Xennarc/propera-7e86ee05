
# QR-Based Guest Login - Backend Implementation

## Overview

This plan implements backend support for QR-based guest login as an **additive, isolated feature** that does not modify the existing PIN login flow. Staff can generate one-time-use login tokens that guests scan to authenticate without entering credentials.

## Architecture Summary

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     QR Login Token Lifecycle                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   Staff Portal                    Guest Portal                      │
│   ┌─────────────┐                ┌──────────────┐                   │
│   │ Staff calls │                │ Guest scans  │                   │
│   │ create_     │───────────────▶│ QR code with │                   │
│   │ guest_login │  Returns raw   │ raw token    │                   │
│   │ _token()    │  token (once)  │              │                   │
│   └─────────────┘                └──────┬───────┘                   │
│         │                               │                           │
│         │ Stores                        │ Calls                     │
│         │ token_hash                    │ consume_guest_login_      │
│         ▼                               │ _token(raw_token)         │
│   ┌─────────────┐                       │                           │
│   │ guest_login │                       ▼                           │
│   │ _tokens     │◀──────────────────────┘                           │
│   │ (table)     │   Hashes raw token,                               │
│   │             │   finds match,                                    │
│   │ token_hash  │   marks consumed                                  │
│   └─────────────┘                                                   │
│         │                                                           │
│         │ Returns guest_id, resort_id                               │
│         ▼                                                           │
│   ┌─────────────┐                                                   │
│   │ Frontend    │  Establishes session (same as PIN login)          │
│   │ GuestAuth   │                                                   │
│   │ Context     │                                                   │
│   └─────────────┘                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Token Type Use Cases

| Type | Purpose | Typical Expiry |
|------|---------|----------------|
| `instant` | One-scan QR code for immediate login | 15 minutes |
| `confirm` | Requires guest confirmation on portal | 1 hour |
| `pairing` | Device-to-device pairing flow | 5 minutes |

## Implementation Details

### 1. Create Enum Type for Token Types

```sql
CREATE TYPE public.guest_login_token_type AS ENUM ('instant', 'confirm', 'pairing');
```

### 2. Create `guest_login_tokens` Table

**Schema Design:**

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | uuid | PK, default gen_random_uuid() | Unique identifier |
| `resort_id` | uuid | NOT NULL, FK → resorts | Multi-tenant isolation |
| `guest_id` | uuid | NOT NULL, FK → guests | Target guest |
| `token_hash` | text | NOT NULL, UNIQUE | SHA-256 hash of raw token |
| `type` | guest_login_token_type | NOT NULL | Token behavior type |
| `expires_at` | timestamptz | NOT NULL | Expiration timestamp |
| `consumed_at` | timestamptz | NULL | When token was used |
| `created_by_staff_id` | uuid | NULL, FK → profiles | Audit trail |
| `created_at` | timestamptz | DEFAULT now() | Creation timestamp |

**Indexes:**
- Unique index on `token_hash` (for fast lookup)
- Index on `(guest_id, expires_at)` for cleanup queries
- Index on `resort_id` for RLS filtering

**RLS Policies:**
- **No direct SELECT for anon/authenticated** - prevents token harvesting
- **Staff management via RPC only** - all token operations through SECURITY DEFINER functions
- **Super admin SELECT** - for platform debugging (optional)

```sql
ALTER TABLE public.guest_login_tokens ENABLE ROW LEVEL SECURITY;

-- No public/guest SELECT policy (intentionally absent)
-- Token validation happens via SECURITY DEFINER RPC

-- Staff with write access can view tokens they created (optional audit trail)
CREATE POLICY "staff_view_own_tokens"
  ON public.guest_login_tokens
  FOR SELECT
  TO authenticated
  USING (created_by_staff_id = auth.uid());

-- Super admins can view all tokens (platform debugging)
CREATE POLICY "super_admin_view_all_tokens"
  ON public.guest_login_tokens
  FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));
```

### 3. Create `create_guest_login_token` RPC

**Function Signature:**
```sql
CREATE OR REPLACE FUNCTION public.create_guest_login_token(
  p_guest_id uuid,
  p_token_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
```

**Validation Logic:**
1. Verify `p_token_type` is valid ('instant', 'confirm', 'pairing')
2. Fetch guest record, verify guest exists
3. Get caller's user ID via `auth.uid()`
4. Verify caller has write access to guest's resort:
   ```sql
   IF NOT public.staff_can_write_resort(
     auth.uid(), 
     v_guest.resort_id, 
     ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]
   ) THEN
     RETURN json_build_object('success', false, 'error', 'Unauthorized');
   END IF;
   ```
5. Optionally check guest is currently in-stay (check_in_date ≤ today ≤ check_out_date)

**Token Generation:**
```sql
-- Generate cryptographically secure random token
v_raw_token := encode(gen_random_bytes(32), 'base64');
v_raw_token := replace(v_raw_token, '/', '_');
v_raw_token := replace(v_raw_token, '+', '-');
v_raw_token := replace(v_raw_token, '=', '');

-- Hash token before storage
v_token_hash := encode(digest(v_raw_token, 'sha256'), 'hex');

-- Set expiry based on type
CASE p_token_type
  WHEN 'instant' THEN v_expires_at := now() + interval '15 minutes';
  WHEN 'confirm' THEN v_expires_at := now() + interval '1 hour';
  WHEN 'pairing' THEN v_expires_at := now() + interval '5 minutes';
END CASE;
```

**Return Value:**
```json
{
  "success": true,
  "token": "<raw_token>",
  "expires_at": "2026-01-23T15:30:00Z",
  "guest_id": "<uuid>",
  "type": "instant"
}
```

### 4. Create `consume_guest_login_token` RPC

**Function Signature:**
```sql
CREATE OR REPLACE FUNCTION public.consume_guest_login_token(
  p_raw_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
```

**Validation Logic:**
1. Hash incoming token:
   ```sql
   v_token_hash := encode(digest(p_raw_token, 'sha256'), 'hex');
   ```
2. Find matching token record:
   ```sql
   SELECT * INTO v_token_record
   FROM guest_login_tokens
   WHERE token_hash = v_token_hash
     AND expires_at > now()
     AND consumed_at IS NULL;
   ```
3. If not found, return error
4. Mark token as consumed:
   ```sql
   UPDATE guest_login_tokens
   SET consumed_at = now()
   WHERE id = v_token_record.id;
   ```
5. Fetch guest data for session establishment

**Return Value (Success):**
```json
{
  "success": true,
  "guest": {
    "id": "<uuid>",
    "full_name": "John Smith",
    "room_number": "101",
    "check_in_date": "2026-01-20",
    "check_out_date": "2026-01-27"
  },
  "resort": {
    "id": "<uuid>",
    "name": "Paradise Resort",
    "logo_url": "..."
  }
}
```

**Return Value (Error):**
```json
{
  "success": false,
  "error": "TOKEN_INVALID" | "TOKEN_EXPIRED" | "TOKEN_ALREADY_USED"
}
```

### 5. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Token harvesting | Raw tokens never stored; RLS blocks direct SELECT |
| Brute force | SHA-256 + 32 random bytes = 256 bits of entropy |
| Replay attacks | `consumed_at` set on first use; subsequent calls rejected |
| Cross-tenant access | Staff validation via `staff_can_write_resort()` |
| Token leakage in logs | Only hash stored; raw returned once to staff UI |
| Expired tokens | `expires_at` check in consume function |

### 6. File Changes Summary

| Change | Type | Description |
|--------|------|-------------|
| Migration SQL | New file | Creates enum, table, indexes, RLS policies, and both RPC functions |

**Migration File: `supabase/migrations/YYYYMMDD_guest_login_tokens.sql`**

The migration will contain:
1. Create enum type `guest_login_token_type`
2. Create `guest_login_tokens` table with constraints
3. Create indexes for performance
4. Enable RLS and create policies
5. Create `create_guest_login_token` function
6. Create `consume_guest_login_token` function

### 7. Compatibility Notes

| Existing Feature | Impact |
|------------------|--------|
| PIN Login (`guest_portal_login`) | **UNCHANGED** - completely separate code path |
| Pre-arrival Tokens | **UNCHANGED** - different table and RPCs |
| Guest Session Storage | **COMPATIBLE** - QR login returns same session structure |
| GuestAuthContext | **COMPATIBLE** - can establish session from consume response |

### 8. Future Frontend Integration Points

When ready to build UI (not in this scope):

1. **Staff Side**: Call `create_guest_login_token(guest_id, 'instant')` and display QR code containing raw token
2. **Guest Side**: Scan QR → extract token → call `consume_guest_login_token(token)` → establish session via `GuestAuthContext`

### 9. Testing Checklist

| Test Case | Expected Result |
|-----------|-----------------|
| Staff creates token for their resort's guest | Returns raw token |
| Staff tries to create token for another resort's guest | Returns "Unauthorized" |
| Guest consumes valid token | Returns guest/resort data, marks consumed |
| Guest tries to consume already-used token | Returns "TOKEN_ALREADY_USED" |
| Guest tries to consume expired token | Returns "TOKEN_EXPIRED" |
| Guest tries to consume invalid token | Returns "TOKEN_INVALID" |
| Anonymous user tries to SELECT from table | RLS blocks, returns empty |
