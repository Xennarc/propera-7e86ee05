
# Enhanced Staff Console: Guest Stay & Pre-Arrival Info

## Overview

This plan enhances the Staff Console guest details page with:
1. A new "Stay" panel showing arrival/departure, status, room, and access link management for the new `guest_stays` architecture
2. A "Pre-Arrival Info" section displaying submissions from `pre_arrival_submissions` for the active stay
3. Dual-write capability in the guest portal checklist to write to both the old `prearrival_profiles` and the new `pre_arrival_submissions` table

---

## Architecture Summary

```text
┌────────────────────────────────────────────────────────────────────────────┐
│                     STAFF GUEST DETAIL PAGE LAYOUT                         │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  GUEST HEADER (existing - name, badges, at-a-glance chips)          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  STAY PANEL (NEW)                                                   │   │
│  │  • Arrival/Departure dates + status badge                           │   │
│  │  • Room number                                                      │   │
│  │  • Generate Pre-Arrival Access Link button                          │   │
│  │  • Link state (last generated, expires_at, copy, QR)                │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  PRE-ARRIVAL INFO (NEW - from pre_arrival_submissions)              │   │
│  │  • Structured payload rendering                                     │   │
│  │  • Arrival time, flight, transfer preference                        │   │
│  │  • Dietary preferences, allergies                                   │   │
│  │  • Special occasions, requests                                      │   │
│  │  • completed_at / updated_at timestamps                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  EXISTING PREARRIVAL PROFILE CARD (unchanged - for transition)      │   │
│  │  • Legacy prearrival_profiles data                                  │   │
│  │  • Email/link management (existing system)                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  REMAINING CARDS (unchanged)                                        │   │
│  │  • Guest Info, Loyalty, PIN, QR, Feedback, Bookings                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/hooks/useStaffGuestStay.ts` | Hook to fetch guest_stays + guest_access_links + pre_arrival_submissions for staff view |
| `src/components/staff/GuestStayPanel.tsx` | New "Stay" panel component |
| `src/components/staff/StayAccessLinkManager.tsx` | Generate/manage access links for stays |
| `src/components/staff/PreArrivalSubmissionCard.tsx` | Display pre_arrival_submissions payload |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/guests/GuestDetailPage.tsx` | Add Stay panel and Pre-Arrival Info section |
| `src/hooks/usePrearrivalData.ts` | Add dual-write to pre_arrival_submissions in `useUpdatePrearrivalProfile` |

---

## Technical Implementation

### 1. New Hook: `useStaffGuestStay`

Fetches the active stay, access links, and pre-arrival submissions for a guest:

```typescript
interface StaffGuestStay {
  id: string;
  status: 'pre_arrival' | 'in_house' | 'checked_out';
  arrivalDate: string;
  departureDate: string;
  roomNumber: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StaffAccessLink {
  id: string;
  tokenHint: string; // last 8 chars of token for display
  expiresAt: string;
  consumedAt: string | null;
  createdAt: string;
}

interface PreArrivalSubmission {
  id: string;
  payload: {
    arrival_time?: string;
    arrival_flight_number?: string;
    transfer_preference?: string;
    dietary_preferences?: string[];
    allergies?: string;
    water_comfort_level?: string;
    special_occasions?: string[];
    special_requests?: string;
    // ... other fields
  };
  completedAt: string | null;
  updatedAt: string;
}

interface StaffGuestStayData {
  stay: StaffGuestStay | null;
  accessLinks: StaffAccessLink[];
  submission: PreArrivalSubmission | null;
  isLoading: boolean;
}

export function useStaffGuestStay(guestId: string, resortId: string): StaffGuestStayData
```

**Query Logic:**
1. Fetch stays for the guest, prioritizing `pre_arrival` > `in_house` > most recent
2. For the active stay, fetch associated `guest_access_links` ordered by created_at DESC
3. Fetch `pre_arrival_submissions` for the active stay

### 2. GuestStayPanel Component

A card that displays:
- Arrival/departure dates with visual formatting
- Stay status badge (Pre-Arrival / In-House / Checked Out)
- Room number (or "Not assigned" placeholder)
- `StayAccessLinkManager` component for link generation

```typescript
interface GuestStayPanelProps {
  guestId: string;
  guestName: string;
  resortId: string;
  stay: StaffGuestStay | null;
  accessLinks: StaffAccessLink[];
  isLoading: boolean;
  onLinkGenerated?: () => void;
}
```

### 3. StayAccessLinkManager Component

Manages access links for the new stay-based system:

```typescript
interface StayAccessLinkManagerProps {
  stayId: string;
  guestName: string;
  accessLinks: StaffAccessLink[];
  onLinkGenerated?: () => void;
}
```

**Features:**
- "Generate Access Link" button (calls `create_guest_access_link` RPC)
- Display latest link status (active, expired, consumed)
- Copy link to clipboard
- Show QR code dialog
- Expiry countdown/timestamp

### 4. PreArrivalSubmissionCard Component

Renders the `pre_arrival_submissions.payload` in a structured format:

```typescript
interface PreArrivalSubmissionCardProps {
  submission: PreArrivalSubmission | null;
  isLoading: boolean;
}
```

**Display Sections:**
- Arrival Details (time, flight, transfer)
- Dietary & Allergies (preferences list, allergy warnings)
- Special Occasions & Requests
- Timestamps (completed_at, updated_at)

If no submission exists, shows a muted empty state: "No pre-arrival information submitted yet."

### 5. GuestDetailPage Updates

Add the new components between existing sections:

```typescript
// After Guest Info card, before existing PrearrivalProfileCard

// New: Staff Guest Stay data hook
const { 
  stay: activeStay, 
  accessLinks, 
  submission, 
  isLoading: stayLoading 
} = useStaffGuestStay(guest.id, guest.resort_id);

// Render Stay Panel
<GuestStayPanel
  guestId={guest.id}
  guestName={guest.full_name}
  resortId={guest.resort_id}
  stay={activeStay}
  accessLinks={accessLinks}
  isLoading={stayLoading}
/>

// Render Pre-Arrival Info (only if stay exists and is pre_arrival or in_house)
{activeStay && activeStay.status !== 'checked_out' && (
  <PreArrivalSubmissionCard
    submission={submission}
    isLoading={stayLoading}
  />
)}

// Existing PrearrivalProfileCard remains for transition period
```

### 6. Dual-Write in Guest Portal

Modify `useUpdatePrearrivalProfile` in `src/hooks/usePrearrivalData.ts` to also write to `pre_arrival_submissions`:

```typescript
export function useUpdatePrearrivalProfile() {
  const { guest } = useGuestAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<PrearrivalUpdates>) => {
      if (!guest) throw new Error('Not authenticated');

      // 1. Call existing RPC (unchanged)
      const { data, error } = await supabase.rpc('guest_update_prearrival_profile', {
        p_guest_id: guest.guestId,
        // ... existing params
      });
      if (error) throw error;

      // 2. DUAL-WRITE: If guest has a stayId, also update pre_arrival_submissions
      if (guest.stayId) {
        const payload = {
          arrival_time: updates.arrival_time || null,
          arrival_flight_number: updates.arrival_flight_number || null,
          transfer_preference: updates.transfer_preference || null,
          dietary_preferences: updates.dietary_preferences || [],
          allergies: updates.allergies || null,
          water_comfort_level: updates.water_comfort_level || null,
          special_occasions: updates.special_occasions || [],
          special_requests: updates.special_requests || null,
          custom_answers_json: updates.custom_answers_json || {},
        };

        // Upsert to pre_arrival_submissions
        await supabase.rpc('guest_upsert_prearrival_submission', {
          p_stay_id: guest.stayId,
          p_payload: JSON.stringify(payload),
          p_mark_completed: true,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prearrival-data'] });
      queryClient.invalidateQueries({ queryKey: ['active-stay'] });
    },
  });
}
```

### 7. New RPC: `guest_upsert_prearrival_submission`

A SECURITY DEFINER function that allows guests to write to their own submission:

```sql
CREATE OR REPLACE FUNCTION public.guest_upsert_prearrival_submission(
  p_stay_id uuid,
  p_payload jsonb,
  p_mark_completed boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stay guest_stays%ROWTYPE;
  v_submission_id uuid;
BEGIN
  -- Get the stay
  SELECT * INTO v_stay FROM guest_stays WHERE id = p_stay_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'STAY_NOT_FOUND');
  END IF;

  -- Upsert the submission
  INSERT INTO pre_arrival_submissions (resort_id, stay_id, guest_id, payload, completed_at, updated_at)
  VALUES (
    v_stay.resort_id,
    p_stay_id,
    v_stay.guest_id,
    p_payload,
    CASE WHEN p_mark_completed THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (stay_id) 
  DO UPDATE SET
    payload = EXCLUDED.payload,
    completed_at = CASE WHEN p_mark_completed THEN NOW() ELSE pre_arrival_submissions.completed_at END,
    updated_at = NOW()
  RETURNING id INTO v_submission_id;

  RETURN json_build_object('success', true, 'submission_id', v_submission_id);
END;
$$;

-- Grant execute to anon for guest portal access
GRANT EXECUTE ON FUNCTION public.guest_upsert_prearrival_submission(uuid, jsonb, boolean) TO anon, authenticated;
```

**Note:** We need a unique constraint on `stay_id` for the upsert. Add this to the migration:
```sql
ALTER TABLE pre_arrival_submissions ADD CONSTRAINT pre_arrival_submissions_stay_id_unique UNIQUE (stay_id);
```

---

## UI Design Details

### Stay Panel Layout

```text
┌───────────────────────────────────────────────────────────────┐
│  📅 Current Stay                                [Pre-Arrival] │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Arrival         Departure        Room                        │
│  Feb 15, 2026    Feb 22, 2026    Ocean Villa 12              │
│                                                               │
│  ─────────────────────────────────────────────────────────── │
│                                                               │
│  Pre-Arrival Access Link                                      │
│  ┌──────────────────────────────────────────────────────────┐│
│  │  [Active]  Expires Feb 14  •  Created 2 days ago         ││
│  │                                                          ││
│  │  [📋 Copy]  [📱 QR]  [🔄 Regenerate]                     ││
│  └──────────────────────────────────────────────────────────┘│
│                                                               │
│  OR (if no link):                                             │
│                                                               │
│  [Generate Pre-Arrival Access Link]                           │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Pre-Arrival Info Card Layout

```text
┌───────────────────────────────────────────────────────────────┐
│  📝 Pre-Arrival Submission              Completed Feb 12, 2026 │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ARRIVAL DETAILS                                              │
│  ─────────────────────────────                                │
│  Arrival Time: 14:30                                          │
│  Flight: SQ422                                                │
│  Transfer: Seaplane                                           │
│                                                               │
│  DIETARY & ALLERGIES                                          │
│  ─────────────────────────────                                │
│  ⚠️ Allergies: Shellfish                                      │
│  Preferences: Vegetarian, Gluten-free                         │
│                                                               │
│  SPECIAL OCCASIONS                                            │
│  ─────────────────────────────                                │
│  🎉 Honeymoon, Birthday                                       │
│  Requests: "Please arrange a sunset dinner on the beach"      │
│                                                               │
│  ─────────────────────────────────────────────────────────── │
│  Last updated: Feb 12, 2026 at 3:45 PM                        │
└───────────────────────────────────────────────────────────────┘
```

---

## Database Migration

Add a unique constraint and the new RPC function:

```sql
-- Add unique constraint for upsert capability
ALTER TABLE public.pre_arrival_submissions 
ADD CONSTRAINT pre_arrival_submissions_stay_id_unique UNIQUE (stay_id);

-- RPC for guest portal dual-write
CREATE OR REPLACE FUNCTION public.guest_upsert_prearrival_submission(
  p_stay_id uuid,
  p_payload jsonb,
  p_mark_completed boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stay guest_stays%ROWTYPE;
  v_submission_id uuid;
BEGIN
  SELECT * INTO v_stay FROM guest_stays WHERE id = p_stay_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'STAY_NOT_FOUND');
  END IF;

  INSERT INTO pre_arrival_submissions (resort_id, stay_id, guest_id, payload, completed_at, updated_at)
  VALUES (
    v_stay.resort_id,
    p_stay_id,
    v_stay.guest_id,
    p_payload,
    CASE WHEN p_mark_completed THEN NOW() ELSE NULL END,
    NOW()
  )
  ON CONFLICT (stay_id) 
  DO UPDATE SET
    payload = EXCLUDED.payload,
    completed_at = CASE WHEN p_mark_completed THEN NOW() ELSE pre_arrival_submissions.completed_at END,
    updated_at = NOW()
  RETURNING id INTO v_submission_id;

  RETURN json_build_object('success', true, 'submission_id', v_submission_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.guest_upsert_prearrival_submission(uuid, jsonb, boolean) TO anon, authenticated;
```

---

## Implementation Order

1. **Database Migration** - Add unique constraint and guest RPC
2. **Create `useStaffGuestStay` hook** - Data fetching for staff
3. **Create `StayAccessLinkManager` component** - Link generation UI
4. **Create `GuestStayPanel` component** - Stay overview card
5. **Create `PreArrivalSubmissionCard` component** - Submission display
6. **Update `GuestDetailPage`** - Integrate new components
7. **Update `usePrearrivalData`** - Add dual-write logic

---

## What Remains Unchanged

| Component | Status |
|-----------|--------|
| Existing `PrearrivalProfileCard` | Unchanged - continues showing legacy data |
| Existing `PrearrivalLinkManager` | Unchanged - manages legacy prearrival_tokens |
| PIN login flow | Unchanged |
| QR login flow | Unchanged |
| Guest portal home/wizard | Unchanged (except dual-write addition) |
| Staff dashboard and other pages | Unchanged |

---

## Testing Scenarios

1. **Guest with stay record** → Stay panel shows dates, status, link manager
2. **Guest without stay record** → Stay panel shows "No stay record" empty state
3. **Generate access link** → Creates link, displays token hint, copy/QR work
4. **View submission** → Renders payload structure correctly
5. **Guest submits wizard** → Data appears in both old profiles AND new submissions
6. **Link expired** → Shows expired badge, offers regeneration
7. **Multiple stays** → Shows active/upcoming stay prioritized
