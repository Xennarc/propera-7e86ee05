

# Unified Pre-Arrival Login Entry Implementation

## Overview

This plan adds a new `/guest/access` route that consumes the new `guest_access_links` tokens (created in the stay-based architecture) and authenticates guests into the same `/guest` portal used for in-house stays. The guest home screen becomes context-aware, showing either the pre-arrival experience or the in-house experience based on the active stay's status.

---

## Architecture Flow

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED GUEST ACCESS FLOW                               │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  Staff generates link → /guest/access?t=TOKEN                                  │
│                              │                                                 │
│                              ▼                                                 │
│         ┌─────────────────────────────────────────────┐                        │
│         │   GuestAccessLoginPage.tsx (NEW)            │                        │
│         │   - Read ?t query param                     │                        │
│         │   - Call consume_guest_access_link RPC      │                        │
│         │   - Build GuestSession + store stay_id      │                        │
│         │   - Register device session                 │                        │
│         │   - Redirect to /guest                      │                        │
│         └─────────────────────────────────────────────┘                        │
│                              │                                                 │
│                              ▼                                                 │
│         ┌─────────────────────────────────────────────┐                        │
│         │   GuestHome.tsx (MODIFIED)                  │                        │
│         │   - Resolve active stay from guest_stays    │                        │
│         │   - Priority: in_house > pre_arrival > next │                        │
│         │   - If pre_arrival → show PrearrivalHome    │                        │
│         │   - If in_house → show InStay home          │                        │
│         └─────────────────────────────────────────────┘                        │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Database Changes

### 1. Enhance `consume_guest_access_link` RPC

**Current Return Format:**
```json
{
  "success": true,
  "guest_id": "uuid",
  "resort_id": "uuid",
  "stay_id": "uuid"
}
```

**New Return Format (matches existing login flow):**
```json
{
  "success": true,
  "guest": {
    "id": "uuid",
    "full_name": "John Doe",
    "room_number": "101",
    "check_in_date": "2026-02-01",
    "check_out_date": "2026-02-07"
  },
  "resort": {
    "id": "uuid",
    "name": "Beach Resort",
    "logo_url": "https://...",
    "timezone": "Indian/Maldives"
  },
  "stay_id": "uuid"
}
```

**SQL Migration:**
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
  v_guest RECORD;
  v_resort RECORD;
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
  
  -- Fetch guest data
  SELECT id, full_name, room_number, check_in_date, check_out_date
  INTO v_guest
  FROM guests
  WHERE id = v_link.guest_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'GUEST_NOT_FOUND');
  END IF;
  
  -- Fetch resort data
  SELECT id, name, login_logo_url, timezone
  INTO v_resort
  FROM resorts
  WHERE id = v_link.resort_id;
  
  -- Mark as consumed
  UPDATE guest_access_links
  SET consumed_at = NOW()
  WHERE id = v_link.id;
  
  -- Return full session data
  RETURN json_build_object(
    'success', true,
    'guest', json_build_object(
      'id', v_guest.id,
      'full_name', v_guest.full_name,
      'room_number', v_guest.room_number,
      'check_in_date', v_guest.check_in_date,
      'check_out_date', v_guest.check_out_date
    ),
    'resort', json_build_object(
      'id', v_resort.id,
      'name', v_resort.name,
      'logo_url', v_resort.login_logo_url,
      'timezone', v_resort.timezone
    ),
    'stay_id', v_link.stay_id
  );
END;
$$;
```

---

## Frontend Changes

### 1. New Route: `/guest/access`

**File: `src/pages/guest/GuestAccessLoginPage.tsx`**

A new page that:
1. Reads the `t` query parameter from the URL
2. Calls `consume_guest_access_link(token)` RPC
3. On success: builds `GuestSession` object (same structure as PIN login)
4. Stores `stay_id` in session for context-aware rendering
5. Registers device session via `register_guest_session` RPC
6. Stores session in `localStorage` (same key: `propera_guest_session`)
7. Redirects to `/guest`

UI States:
- **Loading**: Spinner with "Logging you in..."
- **Error**: Error card with message and "Use Room Number & PIN Instead" fallback
- **Desktop Detection**: Shows QR code for mobile scanning (same pattern as `GuestQrLoginPage`)

### 2. Update `GuestSession` Interface

**File: `src/contexts/GuestAuthContext.tsx`**

Add optional `stayId` field:

```typescript
export interface GuestSession {
  guestId: string;
  fullName: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  resortId: string;
  resortName?: string;
  resortLogoUrl?: string;
  resortTimezone?: string;
  sessionId?: string;
  sessionToken?: string;
  stayId?: string;  // NEW - links to guest_stays table
}
```

### 3. Create `useActiveStay` Hook

**File: `src/hooks/useActiveStay.ts`**

Hook to resolve the active stay for the current guest:

```typescript
interface ActiveStay {
  id: string;
  status: 'pre_arrival' | 'in_house' | 'checked_out';
  arrivalDate: string;
  departureDate: string;
  roomNumber: string | null;
}

function useActiveStay(): {
  activeStay: ActiveStay | null;
  isLoading: boolean;
}
```

**Resolution Logic:**
1. If `guest.stayId` is set, fetch that specific stay
2. Otherwise, query `guest_stays` for the guest ordered by priority:
   - `status = 'in_house'` (highest priority)
   - `status = 'pre_arrival'` (second priority)
   - Next upcoming stay by `arrival_date`
3. Cache for 60 seconds

### 4. Update `GuestHome.tsx` - Context-Aware Rendering

**File: `src/pages/guest/GuestHome.tsx`**

Modify the existing logic to use the new `useActiveStay` hook alongside the existing `useIsPrearrivalGuest`:

```typescript
export default function GuestHome() {
  const { guest } = useGuestAuth();
  const { activeStay, isLoading: stayLoading } = useActiveStay();
  const { isPrearrival } = useIsPrearrivalGuest();
  
  // If stay is loading, show skeleton
  if (stayLoading) {
    return <GuestHomeLoading />;
  }
  
  // Use active stay status OR fall back to date-based check
  const showPrearrival = activeStay?.status === 'pre_arrival' || isPrearrival;
  
  if (showPrearrival) {
    return <GuestPrearrivalHome activeStay={activeStay} />;
  }
  
  // ... existing in-house home logic
}
```

### 5. Enhanced `GuestPrearrivalHome.tsx`

**File: `src/pages/guest/GuestPrearrivalHome.tsx`**

Add "Browse activities during your stay" module with day chips:

1. Add an activities preview section showing the first few available activities
2. Integrate `GuestDatePicker` component for day-by-day browsing
3. Show bookings preview or empty states
4. Link to full activities browser

```typescript
interface GuestPrearrivalHomeProps {
  activeStay?: ActiveStay | null;
}

export default function GuestPrearrivalHome({ activeStay }: GuestPrearrivalHomeProps) {
  // ... existing code
  
  // NEW: Activities preview with day chips
  return (
    <div className="space-y-6">
      {/* Welcome Banner - existing */}
      
      {/* Countdown - existing */}
      
      {/* Pre-arrival Checklist - existing */}
      
      {/* NEW: Browse Activities Module */}
      <Card className="guest-card">
        <CardHeader>
          <CardTitle className="text-lg">Plan your activities</CardTitle>
        </CardHeader>
        <CardContent>
          <GuestDatePicker
            value={selectedDate}
            onChange={setSelectedDate}
            minDate={guest.checkInDate}
            maxDate={guest.checkOutDate}
            compact={true}
          />
          <ActivityPreviewList date={selectedDate} />
        </CardContent>
      </Card>
      
      {/* Quick Actions - existing */}
      
      {/* Pre-booked Activities Preview */}
      <PrearrivalBookingsPreview />
    </div>
  );
}
```

### 6. Add Route to `App.tsx`

**File: `src/App.tsx`**

Add the new route before the existing guest routes:

```typescript
// Guest access login (new unified entry)
<Route path="/guest/access" element={<GuestAccessLoginPage />} />

// Existing routes remain unchanged
<Route path="/guest/qr/:token" element={<GuestQrConfirmPage />} />
<Route path="/guest/qr" element={<GuestQrLoginPage />} />
<Route path="/guest" element={<GuestLayout />}>
  ...
</Route>
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/guest/GuestAccessLoginPage.tsx` | New unified access login page |
| `src/hooks/useActiveStay.ts` | Hook to resolve active stay from `guest_stays` |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add `/guest/access` route |
| `src/contexts/GuestAuthContext.tsx` | Add `stayId` to `GuestSession` interface |
| `src/pages/guest/GuestHome.tsx` | Add `useActiveStay` integration |
| `src/pages/guest/GuestPrearrivalHome.tsx` | Add activities browser module with day chips |
| Migration SQL file | Enhance `consume_guest_access_link` RPC |

---

## Implementation Order

1. **Database Migration** - Update `consume_guest_access_link` to return full guest/resort data
2. **Create `useActiveStay` hook** - For resolving active stay context
3. **Create `GuestAccessLoginPage.tsx`** - New access entry point
4. **Update `GuestAuthContext`** - Add `stayId` field
5. **Update `App.tsx`** - Add new route
6. **Update `GuestHome.tsx`** - Integrate stay-aware rendering
7. **Enhance `GuestPrearrivalHome.tsx`** - Add activities browser module

---

## What Remains Unchanged

| Component | Status |
|-----------|--------|
| PIN login flow (`/guest/login`, `/resort/:code/guest/login`) | Unchanged |
| QR login flow (`/guest/qr`, `/guest/qr/:token`) | Unchanged |
| Existing pre-arrival token system | Unchanged |
| `GuestLayout` navigation | Unchanged |
| In-house home experience | Unchanged |
| Activity/restaurant booking flows | Unchanged |

---

## Technical Notes

1. **Session Compatibility**: The new login stores the same `propera_guest_session` structure, ensuring `GuestAuthContext` restoration works identically.

2. **Stay Resolution Fallback**: If no `guest_stays` record exists (legacy guests), the system falls back to the existing date-based `useIsPrearrivalGuest` logic.

3. **Mobile-First**: `GuestAccessLoginPage` follows the same patterns as `GuestQrLoginPage` including desktop QR display and mobile-optimized flows.

4. **Performance**: The `useActiveStay` hook uses React Query with 60-second stale time to minimize database calls.

---

## Testing Scenarios

1. **Staff generates access link** → Guest opens `/guest/access?t=TOKEN` on mobile → Session created → Redirected to `/guest` → Shows pre-arrival home
2. **Guest with pre_arrival stay** → Home shows countdown, checklist, activities browser
3. **Guest with in_house stay** → Home shows existing in-stay experience
4. **Token expired** → Error screen with PIN login fallback
5. **Desktop access** → QR code displayed for mobile scanning
6. **Existing PIN login** → Works unchanged

