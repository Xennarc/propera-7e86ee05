
# Unified Stay-Based Pre-Arrival Architecture

## Overview

This plan implements a new stay-centric data model for Propera's pre-arrival system. The new tables (`guest_stays`, `pre_arrival_submissions`, `guest_access_links`) will exist alongside the current `prearrival_tokens` and `prearrival_profiles` tables without disrupting existing functionality.

---

## Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXISTING (UNCHANGED)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  guests ←──── prearrival_profiles ←──── prearrival_tokens                   │
│    │                                                                         │
│    └──────────────────┐                                                      │
│                       ▼                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                           NEW TABLES (ADDITIVE)                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  resorts ─────┐                                                             │
│               │                                                             │
│  guests ──────┼───▶ guest_stays ◀──── pre_arrival_submissions               │
│               │          │                                                  │
│               │          └────────────▶ guest_access_links                  │
│               │                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Changes

### 1. New Table: `guest_stays`

Represents a single stay period for a guest at a resort.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Primary key |
| `resort_id` | `uuid` | NOT NULL, FK → `resorts(id)` | Resort reference |
| `guest_id` | `uuid` | NOT NULL, FK → `guests(id)` | Guest reference |
| `arrival_date` | `date` | NOT NULL | Check-in date |
| `departure_date` | `date` | NOT NULL | Check-out date |
| `status` | `text` | CHECK IN ('pre_arrival','in_house','checked_out'), DEFAULT 'pre_arrival' | Stay lifecycle status |
| `room_number` | `text` | NULLABLE | Assigned room (null until check-in) |
| `created_at` | `timestamptz` | DEFAULT `now()` | Record creation |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Last update |

**Indexes:**
- `idx_guest_stays_resort_guest` ON `(resort_id, guest_id)`
- `idx_guest_stays_resort_status` ON `(resort_id, status)`

**Trigger:** Auto-update `updated_at` on modification.

---

### 2. New Table: `pre_arrival_submissions`

Stores the guest's pre-arrival form responses in a flexible JSON payload.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Primary key |
| `resort_id` | `uuid` | NOT NULL, FK → `resorts(id)` | Resort reference |
| `stay_id` | `uuid` | NOT NULL, FK → `guest_stays(id)` ON DELETE CASCADE | Stay reference |
| `guest_id` | `uuid` | NOT NULL, FK → `guests(id)` | Guest reference (denormalized for queries) |
| `payload` | `jsonb` | NOT NULL | Form data (arrival details, preferences, etc.) |
| `completed_at` | `timestamptz` | NULLABLE | When form was fully submitted |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Last update |

**Indexes:**
- `idx_pre_arrival_submissions_stay` ON `(stay_id)`
- `idx_pre_arrival_submissions_guest_stay` ON `(guest_id, stay_id)`

**Trigger:** Auto-update `updated_at` on modification.

---

### 3. New Table: `guest_access_links`

Secure one-time access tokens for guest authentication.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | PK, default `gen_random_uuid()` | Primary key |
| `resort_id` | `uuid` | NOT NULL, FK → `resorts(id)` | Resort reference |
| `stay_id` | `uuid` | NOT NULL, FK → `guest_stays(id)` ON DELETE CASCADE | Stay reference |
| `guest_id` | `uuid` | NOT NULL, FK → `guests(id)` | Guest reference |
| `token_hash` | `text` | UNIQUE, NOT NULL | SHA-256 hash of raw token |
| `expires_at` | `timestamptz` | NOT NULL | Expiration timestamp |
| `consumed_at` | `timestamptz` | NULLABLE | When token was used |
| `purpose` | `text` | DEFAULT 'pre_arrival_login' | Link purpose |
| `created_at` | `timestamptz` | DEFAULT `now()` | Record creation |

**Indexes:**
- `idx_guest_access_links_token_hash` ON `(token_hash)` (for fast lookup)
- `idx_guest_access_links_stay` ON `(stay_id)`

---

## Security: RLS Policies

### `guest_stays` Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `staff_select_guest_stays` | SELECT | `staff_has_resort_access(auth.uid(), resort_id)` |
| `staff_manage_guest_stays` | ALL | `has_resort_role(auth.uid(), resort_id, ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'])` |

### `pre_arrival_submissions` Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `staff_select_submissions` | SELECT | `staff_has_resort_access(auth.uid(), resort_id)` |
| `staff_manage_submissions` | ALL | `has_resort_role(auth.uid(), resort_id, ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'])` |

### `guest_access_links` Policies

| Policy | Operation | Rule |
|--------|-----------|------|
| `staff_select_access_links` | SELECT | `staff_has_resort_access(auth.uid(), resort_id)` |
| `staff_insert_access_links` | INSERT | `has_resort_role(auth.uid(), resort_id, ['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE'])` + `WITH CHECK` |

**No public/guest SELECT policy** - Guests must use RPCs to validate tokens.

---

## RPC Functions

### `create_guest_access_link(p_stay_id uuid)`

**Purpose:** Staff generate a secure one-time token for a guest's stay.

**Returns:** `JSON { raw_token: text, expires_at: timestamptz }`

**Logic:**
1. Validate caller has write access to the stay's resort
2. Fetch the stay record, validate it exists
3. Generate 32-byte secure random token
4. Hash with SHA-256 for storage
5. Set expiry to 7 days from now (or stay departure + 1 day, whichever is sooner)
6. Insert into `guest_access_links`
7. Return raw token (only time it's exposed) and expiry

```sql
CREATE OR REPLACE FUNCTION public.create_guest_access_link(p_stay_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stay guest_stays%ROWTYPE;
  v_raw_token TEXT;
  v_token_hash TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get the stay
  SELECT * INTO v_stay FROM guest_stays WHERE id = p_stay_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'STAY_NOT_FOUND');
  END IF;
  
  -- Validate staff has resort access for this stay
  IF NOT public.has_resort_role(
    auth.uid(), 
    v_stay.resort_id, 
    ARRAY['RESORT_ADMIN', 'MANAGER', 'FRONT_OFFICE']::resort_role[]
  ) THEN
    RETURN json_build_object('success', false, 'error', 'ACCESS_DENIED');
  END IF;
  
  -- Generate secure random token
  v_raw_token := encode(extensions.gen_random_bytes(32), 'base64');
  v_raw_token := replace(replace(replace(v_raw_token, '/', '_'), '+', '-'), '=', '');
  
  -- Hash for storage
  v_token_hash := encode(extensions.digest(v_raw_token::bytea, 'sha256'), 'hex');
  
  -- Set expiry (7 days or departure + 1 day, whichever is earlier)
  v_expires_at := LEAST(
    NOW() + INTERVAL '7 days',
    (v_stay.departure_date + INTERVAL '1 day')::TIMESTAMPTZ
  );
  
  -- Insert the link
  INSERT INTO guest_access_links (
    resort_id, stay_id, guest_id, token_hash, expires_at, purpose
  ) VALUES (
    v_stay.resort_id, p_stay_id, v_stay.guest_id, v_token_hash, v_expires_at, 'pre_arrival_login'
  );
  
  RETURN json_build_object(
    'success', true,
    'raw_token', v_raw_token,
    'expires_at', v_expires_at
  );
END;
$$;
```

---

### `consume_guest_access_link(p_raw_token text)`

**Purpose:** Guest uses their token to authenticate. One-time use.

**Returns:** `JSON { guest_id: uuid, resort_id: uuid, stay_id: uuid }`

**Logic:**
1. Hash the incoming token
2. Find matching unconsumed, unexpired link
3. If not found → error
4. Mark as consumed
5. Return guest context

```sql
CREATE OR REPLACE FUNCTION public.consume_guest_access_link(p_raw_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_hash TEXT;
  v_link guest_access_links%ROWTYPE;
BEGIN
  -- Hash the incoming token
  v_token_hash := encode(extensions.digest(p_raw_token::bytea, 'sha256'), 'hex');
  
  -- Find matching link
  SELECT * INTO v_link
  FROM guest_access_links
  WHERE token_hash = v_token_hash;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_NOT_FOUND');
  END IF;
  
  -- Check if already consumed
  IF v_link.consumed_at IS NOT NULL THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_ALREADY_USED');
  END IF;
  
  -- Check if expired
  IF v_link.expires_at < NOW() THEN
    RETURN json_build_object('success', false, 'error', 'TOKEN_EXPIRED');
  END IF;
  
  -- Mark as consumed
  UPDATE guest_access_links
  SET consumed_at = NOW()
  WHERE id = v_link.id;
  
  -- Return guest context
  RETURN json_build_object(
    'success', true,
    'guest_id', v_link.guest_id,
    'resort_id', v_link.resort_id,
    'stay_id', v_link.stay_id
  );
END;
$$;
```

---

## Migration SQL Summary

The migration will execute in this order:

1. **Create ENUM type** for stay status (or use CHECK constraint)
2. **Create `guest_stays` table** with indexes and trigger
3. **Create `pre_arrival_submissions` table** with indexes and trigger
4. **Create `guest_access_links` table** with indexes
5. **Enable RLS** on all three tables
6. **Create RLS policies** for staff access
7. **Create RPC functions** for token generation and consumption
8. **Grant EXECUTE** on functions to `authenticated` role

---

## What This Does NOT Change

| Component | Status |
|-----------|--------|
| `prearrival_tokens` table | Unchanged |
| `prearrival_profiles` table | Unchanged |
| `generate_prearrival_token` RPC | Unchanged |
| `validate_prearrival_token` RPC | Unchanged |
| `validate_prearrival_link` RPC | Unchanged |
| Guest portal login flow | Unchanged |
| Staff console pre-arrival features | Unchanged |
| Existing bookings/reservations | Unchanged |

---

## Technical Notes

1. **Token Security**: Raw tokens are never stored - only SHA-256 hashes. The raw token is returned exactly once during creation.

2. **Cascade Deletes**: If a `guest_stay` is deleted, associated `pre_arrival_submissions` and `guest_access_links` are automatically deleted.

3. **No Frontend Changes**: This phase is backend-only. The new tables will be available for future integration.

4. **Existing Helper Functions Used**:
   - `staff_has_resort_access(user_id, resort_id)` - for SELECT policies
   - `has_resort_role(user_id, resort_id, roles[])` - for write policies
   - `is_super_admin(user_id)` - implicit via `staff_has_resort_access`

5. **Extensions Used**:
   - `extensions.gen_random_bytes(32)` - for secure token generation
   - `extensions.digest(data, 'sha256')` - for token hashing

---

## Testing After Implementation

1. **Staff creates access link:**
   ```sql
   SELECT create_guest_access_link('stay-uuid-here');
   -- Should return { success: true, raw_token: '...', expires_at: '...' }
   ```

2. **Guest consumes link:**
   ```sql
   SELECT consume_guest_access_link('raw-token-here');
   -- Should return { success: true, guest_id: '...', resort_id: '...', stay_id: '...' }
   ```

3. **Attempt to reuse link:**
   ```sql
   SELECT consume_guest_access_link('same-token-again');
   -- Should return { success: false, error: 'TOKEN_ALREADY_USED' }
   ```

4. **RLS verification:**
   - Staff from Resort A should see stays from Resort A only
   - Staff without FRONT_OFFICE/MANAGER/RESORT_ADMIN role cannot create links
   - Guests cannot SELECT from `guest_access_links` directly
